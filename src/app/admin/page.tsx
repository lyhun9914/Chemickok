"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorsPanel } from "@/components/admin/ErrorsPanel";
import { FunnelPanel } from "@/components/admin/FunnelPanel";
import { ShortsStudio } from "@/components/admin/ShortsStudio";

type Stats = Record<string, number | boolean>;
type UserRow = { id: string; provider: string; nickname: string; email: string | null; created_at: string; balance: number };
type Ledger = { delta: number; reason: string; ref: string; balance_after: number; created_at: string };
type Payment = {
  order_id: string;
  user_id: string | null;
  input_hash: string;
  amount: number;
  method: string;
  created_at: string;
  payment_key?: string | null;
  refunded_at?: string | null;
  refund_amount?: number | null;
  refund_coins?: number | null;
  refund_note?: string | null;
};
type Detail = { user: Omit<UserRow, "balance">; balance: number; history: Ledger[]; payments: Payment[] };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { ...init, headers: { "content-type": "application/json" }, cache: "no-store" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? `오류 (${r.status})`);
  return body as T;
}

const won = (n: number | boolean | undefined) => `${Number(n ?? 0).toLocaleString("ko-KR")}원`;
const num = (n: number | boolean | undefined) => Number(n ?? 0).toLocaleString("ko-KR");
const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });
const REASON: Record<string, string> = { charge: "충전", spend: "사용", bonus: "선물·출석·초대", refund: "환불", admin: "관리자", gift: "냥 선물" };
const METHOD: Record<string, string> = { toss: "토스", test: "테스트" };
/** 냥 a 충전 gave: "charge:<pack>" orders are `c<냥>-…` (or `test-c<냥>-…`). */
const chargeCoins = (p: Payment) => (p.input_hash?.startsWith("charge:") ? Number(/(?:^|-)c(\d+)-/.exec(p.order_id)?.[1] ?? 0) : 0);

/** One payment, with its refund state and the 환불 form (토스 결제 취소 + 냥 회수 in one go). */
function PaymentItem({ p, onDone }: { p: Payment; onDone: () => void }) {
  const coinsGiven = chargeCoins(p);
  const [form, setForm] = useState<{ amount: string; coins: string; note: string; manual: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [needManual, setNeedManual] = useState(false);

  const submit = async () => {
    if (!form) return;
    const amount = Number(form.amount);
    const coins = Number(form.coins || 0);
    const what = [`${won(amount)} 환불`, coins ? `${coins}냥 회수` : "", form.manual ? "(토스에서 이미 취소함: 기록만)" : p.method === "toss" ? "(토스 결제 취소)" : ""].filter(Boolean).join(" · ");
    if (!window.confirm(`${p.order_id}\n${what}\n진행할까요?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<{ amount: number; coins: number; balance?: number }>("/api/admin/payments/refund", {
        method: "POST",
        body: JSON.stringify({ orderId: p.order_id, amount, coins, note: form.note, manual: form.manual }),
      });
      setMsg(`환불했어요: ${won(r.amount)}${r.coins ? ` · ${r.coins}냥 회수 (남은 냥 ${r.balance}냥)` : ""}`);
      setForm(null);
      onDone();
    } catch (e) {
      const m = (e as Error).message;
      setMsg(m);
      if (/직접 취소/.test(m)) setNeedManual(true);
    }
    setBusy(false);
  };

  const input = "w-full rounded-lg border border-line bg-black/30 px-2.5 py-1.5 text-[13px] outline-none focus:border-peach";
  return (
    <li className="py-1.5 text-[13px]">
      <div className="flex justify-between gap-2">
        <span className="min-w-0 truncate">
          {when(p.created_at)} · {METHOD[p.method] ?? p.method}
          {coinsGiven ? ` · ${coinsGiven}냥 충전` : " · 점괘 결제"} · <span className="text-muted">{p.order_id}</span>
        </span>
        <span className={`shrink-0 font-bold ${p.refunded_at ? "text-muted line-through" : ""}`}>{won(p.amount)}</span>
      </div>
      {p.refunded_at ? (
        <p className="mt-0.5 text-[12px] text-peach">
          ↩ {when(p.refunded_at)} 환불 {won(p.refund_amount ?? p.amount)}
          {p.refund_coins ? ` · ${p.refund_coins}냥 회수` : ""}
          {p.refund_note ? ` · ${p.refund_note}` : ""}
        </p>
      ) : form ? (
        <div className="mt-2 space-y-1.5 rounded-xl bg-black/20 p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <label className="text-[11.5px] text-muted">
              환불 금액 (원)
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} inputMode="numeric" className={input} />
            </label>
            <label className="text-[11.5px] text-muted">
              회수할 냥 (최대 {coinsGiven})
              <input value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value })} inputMode="numeric" disabled={!coinsGiven} className={input} />
            </label>
          </div>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="환불 사유 (토스에도 전달돼요)" className={input} />
          {(needManual || p.method === "toss") && (
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" checked={form.manual} onChange={(e) => setForm({ ...form, manual: e.target.checked })} />
              토스 상점관리자에서 이미 취소함 (여기선 기록과 냥 회수만)
            </label>
          )}
          <div className="flex gap-1.5">
            <button onClick={submit} disabled={busy} className="btn-primary flex-1 py-2 text-[13px]">
              {busy ? "처리 중…" : "환불하기"}
            </button>
            <button onClick={() => setForm(null)} className="rounded-xl border border-line px-3 text-[13px] text-muted">
              취소
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            냥을 먼저 회수하고{p.method === "toss" ? " 토스 결제를 취소해요" : ""}. 회원이 냥을 이미 썼으면 남은 만큼만 회수하고 금액도 줄여서 부분 환불하세요.
          </p>
        </div>
      ) : (
        <button
          onClick={() => {
            setMsg(null);
            setForm({ amount: String(p.amount), coins: String(coinsGiven), note: "", manual: false });
          }}
          className="mt-1 rounded-lg border border-line px-2.5 py-1 text-[12px] text-muted"
        >
          ↩ 환불
        </button>
      )}
      {msg && <p className="mt-1 text-[12px] text-peach">{msg}</p>}
    </li>
  );
}

/** 관리자 화면: 숫자, 회원 찾기, 냥 보상 · 회수 · 환불 처리, 최근 결제. */
export default function AdminPage() {
  const [state, setState] = useState<{ configured: boolean; admin: boolean } | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [adj, setAdj] = useState({ delta: "", reason: "admin", note: "" });
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [s, u, p] = await Promise.all([
        call<Stats>("/api/admin/stats"),
        call<{ users: UserRow[] }>("/api/admin/users"),
        call<{ payments: Payment[] }>("/api/admin/payments"),
      ]);
      setStats(s);
      setUsers(u.users);
      setPayments(p.payments);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    call<{ configured: boolean; admin: boolean }>("/api/admin/login")
      .then((s) => {
        setState(s);
        if (s.admin) loadAll();
      })
      .catch((e: Error) => setError(e.message));
  }, [loadAll]);

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      await call("/api/admin/login", { method: "POST", body: JSON.stringify({ key }) });
      setState({ configured: true, admin: true });
      setKey("");
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const logout = async () => {
    await call("/api/admin/logout", { method: "POST" }).catch(() => null);
    setState({ configured: true, admin: false });
    setStats(null);
    setDetail(null);
  };

  const search = async () => {
    setError(null);
    try {
      setUsers((await call<{ users: UserRow[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`)).users);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const open = async (id: string) => {
    setError(null);
    try {
      setDetail(await call<Detail>(`/api/admin/users/${id}`));
      setAdj({ delta: "", reason: "admin", note: "" });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const adjust = async () => {
    if (!detail) return;
    const delta = Number(adj.delta);
    if (!delta) return setError("더하거나 뺄 냥을 넣어 주세요. (빼려면 -3처럼)");
    if (!window.confirm(`${detail.user.nickname}님 복주머니에 ${delta > 0 ? "+" : ""}${delta}냥 (${REASON[adj.reason]}) 처리할까요?`)) return;
    setBusy(true);
    setError(null);
    try {
      await call(`/api/admin/users/${detail.user.id}`, { method: "POST", body: JSON.stringify({ delta, reason: adj.reason, note: adj.note }) });
      await open(detail.user.id);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const box = "rounded-2xl border border-line bg-surface p-4";
  const input = "w-full rounded-xl border border-line bg-black/30 px-3 py-2.5 text-[15px] outline-none focus:border-peach";

  if (!state) return <main className="p-6 text-muted">불러오는 중…</main>;

  if (!state.admin) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-[22px] font-bold">🔐 관리자</h1>
        {!state.configured ? (
          <p className="text-[14px] leading-relaxed text-muted">
            Vercel 환경 변수에 <b className="text-ink">ADMIN_KEY</b>(16자 이상)를 넣고 다시 배포하면 열립니다. 방법은 docs/GUIDE.md에 있어요.
          </p>
        ) : (
          <>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="관리자 키"
              className={input}
              autoComplete="current-password"
            />
            <button onClick={login} disabled={busy || !key} className="btn-primary w-full py-3">
              들어가기
            </button>
          </>
        )}
        {error && <p className="text-sm text-pink">{error}</p>}
      </main>
    );
  }

  const tiles: [string, string][] = stats
    ? [
        ["오늘 매출", won(stats.salesToday)],
        ["7일 매출", won(stats.sales7d)],
        ["30일 매출", won(stats.sales30d)],
        ["누적 매출", won(stats.salesAll)],
        ["30일 결제 건수", `${num(stats.paidCount30d)}건`],
        ["30일 환불", won(stats.refunds30d)],
        ["오류 (24시간)", `${num(stats.errors24h)}건`],
        ["회원 (오늘 / 7일)", `${num(stats.users)}명 (+${num(stats.usersToday)} / +${num(stats.users7d)})`],
        ["회원이 가진 냥", `${num(stats.coinsOut)}냥`],
        ["30일 사용한 냥", `${num(stats.coinsSpent30d)}냥`],
        ["저장된 점괘", `${num(stats.readings)}개`],
        ["맞궁합 초대장 (답함)", `${num(stats.pairs)} (${num(stats.pairsAnswered)})`],
        ["냥 선물", `${num(stats.gifts)}건`],
      ]
    : [];

  return (
    <main className="space-y-5 p-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold">🐾 냥신 점괘 관리자</h1>
        <button onClick={logout} className="text-[13px] text-muted underline">
          나가기
        </button>
      </div>
      {error && <p className="rounded-xl bg-pink/10 px-3 py-2 text-sm text-pink">{error}</p>}
      {stats?.testMode && (
        <p className="rounded-xl bg-peach/10 px-3 py-2 text-[13px] text-peach">⚠️ 최근 하루 안에 테스트 결제가 있었어요. 실제 결제 키로 바뀌었는지 확인하세요.</p>
      )}

      <section className="grid grid-cols-2 gap-2">
        {tiles.map(([label, value]) => (
          <div key={label} className={box}>
            <p className="text-[12px] text-muted">{label}</p>
            <p className="mt-1 text-[16px] font-bold">{value}</p>
          </div>
        ))}
      </section>

      <ErrorsPanel />

      <FunnelPanel />

      <ShortsStudio />

      <section className={box}>
        <h2 className="text-[16px] font-bold">회원 찾기</h2>
        <div className="mt-2 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="닉네임 또는 이메일" className={input} />
          <button onClick={search} className="btn-primary shrink-0 px-4">
            찾기
          </button>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {users.map((u) => (
            <li key={u.id}>
              <button onClick={() => open(u.id)} className="flex w-full items-center justify-between gap-2 py-2.5 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold">{u.nickname}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {u.provider} · {u.email ?? "이메일 없음"} · {when(u.created_at)}
                  </span>
                </span>
                <span className="shrink-0 text-[14px] font-bold text-peach">{u.balance}냥</span>
              </button>
            </li>
          ))}
          {users.length === 0 && <li className="py-3 text-[13px] text-muted">회원이 없어요.</li>}
        </ul>
      </section>

      {detail && (
        <section className={`${box} border-peach/40`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-bold">{detail.user.nickname}</h2>
              <p className="text-[12px] text-muted">
                {detail.user.provider} · {detail.user.email ?? "이메일 없음"} · 가입 {when(detail.user.created_at)}
              </p>
            </div>
            <p className="text-[20px] font-black text-peach">{detail.balance}냥</p>
          </div>

          <div className="mt-4 space-y-2 rounded-xl bg-black/20 p-3">
            <p className="text-[13px] font-bold">냥 직접 처리</p>
            <div className="flex gap-2">
              <input value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} inputMode="numeric" placeholder="+2 또는 -3" className={input} />
              <select value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} className={`${input} w-auto`}>
                <option value="admin">보상·회수</option>
                <option value="refund">환불 처리</option>
              </select>
            </div>
            <input value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder="메모 (예: 결제 오류 보상, 주문번호)" className={input} />
            <button onClick={adjust} disabled={busy} className="btn-primary w-full py-2.5">
              처리하기
            </button>
            <p className="text-[11.5px] leading-relaxed text-muted">
              결제 환불은 아래 결제 목록의 ↩ 환불 버튼으로 하세요 (토스 결제 취소와 냥 회수를 한 번에). 여기는 보상이나 결제 없는 회수용이에요. 잔액보다 많이 뺄 수는 없어요.
            </p>
          </div>

          <h3 className="mt-4 text-[14px] font-bold">냥 기록</h3>
          <ul className="mt-1 max-h-72 divide-y divide-line overflow-y-auto text-[13px]">
            {detail.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate">
                  {when(h.created_at)} · {REASON[h.reason] ?? h.reason} · <span className="text-muted">{h.ref}</span>
                </span>
                <span className={`shrink-0 font-bold ${h.delta > 0 ? "text-peach" : "text-muted"}`}>
                  {h.delta > 0 ? "+" : ""}
                  {h.delta} → {h.balance_after}
                </span>
              </li>
            ))}
            {detail.history.length === 0 && <li className="py-2 text-muted">기록이 없어요.</li>}
          </ul>

          <h3 className="mt-4 text-[14px] font-bold">결제</h3>
          <ul className="mt-1 divide-y divide-line text-[13px]">
            {detail.payments.map((p) => (
              <PaymentItem key={p.order_id} p={p} onDone={() => (open(detail.user.id), loadAll())} />
            ))}
            {detail.payments.length === 0 && <li className="py-2 text-muted">결제가 없어요.</li>}
          </ul>
        </section>
      )}

      <section className={box}>
        <h2 className="text-[16px] font-bold">최근 결제</h2>
        <ul className="mt-2 divide-y divide-line text-[13px]">
          {payments.map((p) => (
            <PaymentItem key={p.order_id} p={p} onDone={loadAll} />
          ))}
          {payments.length === 0 && <li className="py-2 text-muted">결제가 없어요.</li>}
        </ul>
      </section>
    </main>
  );
}
