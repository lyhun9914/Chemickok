"use client";

import { useCallback, useEffect, useState } from "react";
import { PROVIDER, Section, call, ghost, input, small, useConfirm, when, won } from "./ui";

export type Payment = {
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
  coins?: number | null;
  user?: { nickname: string; email: string | null; provider: string } | null;
};

const METHOD: Record<string, string> = { toss: "토스", test: "테스트" };
/** 냥 a 충전 gave (with any 세일 bonus); 0 for a reading paid directly. */
export const chargeCoins = (p: Payment) =>
  p.input_hash?.startsWith("charge:") ? (p.coins ?? Number(/(?:^|-)c(\d+)-/.exec(p.order_id)?.[1] ?? 0)) : 0;
const whatOf = (p: Payment) => (chargeCoins(p) ? `${chargeCoins(p)}냥 충전` : "점괘 바로 결제");
const who = (p: Payment) => (p.user ? `${p.user.nickname} · ${p.user.email ?? PROVIDER[p.user.provider] ?? p.user.provider}` : "비회원");

/**
 * 약관 제5조 계산기: the 냥 left from this charge × (amount ÷ 냥 it gave, bonus included); after 7 days 10% comes off.
 * Fills the form's amount and 회수할 냥; the person still confirms.
 */
function RuleCalc({ p, coinsGiven, left, onLeft, onApply }: { p: Payment; coinsGiven: number; left: string; onLeft: (v: string) => void; onApply: (amount: number, coins: number) => void }) {
  const late = Date.now() - Date.parse(p.created_at) > 7 * 864e5;
  const n = Math.min(coinsGiven, Number(left || 0));
  const fair = Math.floor(((n * p.amount) / coinsGiven) * (late ? 0.9 : 1));
  return (
    <div className="rounded-lg border border-line p-2.5 text-[12px] text-muted">
      <p>
        규정대로 계산 · 1냥당 {won(Math.round(p.amount / coinsGiven))} · {late ? <b className="text-pink">결제 7일 지남 → 수수료 10% 뺌</b> : "결제 7일 안 → 수수료 없음"}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <input value={left} onChange={(e) => onLeft(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={`이 결제에서 남은 냥 (최대 ${coinsGiven})`} className={`${small} min-w-0 flex-1`} />
        <button onClick={() => onApply(fair, n)} disabled={!n || !fair} className={`${ghost} shrink-0`}>
          {n ? `${won(fair)} · ${n}냥 넣기` : "넣기"}
        </button>
      </div>
    </div>
  );
}

/** One payment: who, what, how much; its refund state, and the 환불 form with a second, spelled-out confirmation. */
export function PaymentItem({ p, onDone, onOpenUser }: { p: Payment; onDone: () => void; onOpenUser?: (id: string) => void }) {
  const coinsGiven = chargeCoins(p);
  const [form, setForm] = useState<{ amount: string; coins: string; note: string; manual: boolean; left: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [needManual, setNeedManual] = useState(false);
  const [ask, dialog] = useConfirm();

  const submit = async () => {
    if (!form) return;
    const amount = Number(form.amount);
    const coins = Number(form.coins || 0);
    if (!(amount >= 1 && amount <= p.amount)) return setMsg({ ok: false, text: `환불 금액은 1~${p.amount.toLocaleString("ko-KR")}원으로 넣어 주세요.` });
    if (!(coins >= 0 && coins <= coinsGiven)) return setMsg({ ok: false, text: `회수할 냥은 0~${coinsGiven}냥으로 넣어 주세요.` });
    const ok = await ask({
      title: "이 결제를 환불할까요?",
      rows: [
        ["회원", who(p)],
        ["결제", `${when(p.created_at)} · ${whatOf(p)}`],
        ["결제 금액", won(p.amount)],
        ["환불 금액", <span key="a" className="text-pink">{won(amount)}{amount < p.amount ? " (부분)" : " (전액)"}</span>],
        ["회수할 냥", coins ? `${coins}냥` : "없음"],
        ["처리", form.manual ? "기록과 냥 회수만 (토스는 이미 취소함)" : p.method === "toss" ? "토스 결제 취소 + 기록" : "기록만"],
        ...(form.note ? ([["사유", form.note]] as [string, string][]) : []),
      ],
      message: p.method === "toss" && !form.manual ? "토스 결제 취소는 되돌릴 수 없어요. 회원의 카드·간편결제로 돈이 돌아가요." : undefined,
      confirm: `${won(amount)} 환불하기`,
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<{ amount: number; coins: number; balance?: number }>("/api/admin/payments/refund", {
        method: "POST",
        body: JSON.stringify({ orderId: p.order_id, amount, coins, note: form.note, manual: form.manual }),
      });
      setMsg({ ok: true, text: `환불했어요: ${won(r.amount)}${r.coins ? ` · ${r.coins}냥 회수 (남은 냥 ${r.balance}냥)` : ""}` });
      setForm(null);
      onDone();
    } catch (e) {
      const m = (e as Error).message;
      setMsg({ ok: false, text: m });
      if (/직접 취소/.test(m)) setNeedManual(true);
    }
    setBusy(false);
  };

  return (
    <li className="py-2.5 text-[13px]">
      {dialog}
      <div className="flex justify-between gap-2">
        <div className="min-w-0">
          {p.user_id && onOpenUser ? (
            <button onClick={() => onOpenUser(p.user_id!)} className="block max-w-full truncate text-left text-[14px] font-semibold underline-offset-2 hover:underline">
              {p.user?.nickname ?? "(탈퇴한 회원)"}
              <span className="ml-1 text-[12px] font-normal text-muted">{p.user ? (p.user.email ?? PROVIDER[p.user.provider]) : ""}</span>
            </button>
          ) : (
            <p className="truncate text-[14px] font-semibold">{p.user?.nickname ?? "비회원"}</p>
          )}
          <p className="truncate text-[12px] text-muted">
            {when(p.created_at)} · {METHOD[p.method] ?? p.method} · {whatOf(p)} · {p.order_id}
          </p>
        </div>
        <span className={`shrink-0 text-[15px] font-bold ${p.refunded_at ? "text-muted line-through" : ""}`}>{won(p.amount)}</span>
      </div>
      {p.refunded_at ? (
        <p className="mt-1 text-[12px] text-peach">
          ↩ {when(p.refunded_at)} 환불 {won(p.refund_amount ?? p.amount)}
          {p.refund_coins ? ` · ${p.refund_coins}냥 회수` : ""}
          {p.refund_note ? ` · ${p.refund_note}` : ""}
        </p>
      ) : form ? (
        <div className="mt-2 space-y-2 rounded-xl bg-black/25 p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-muted">
              환불 금액 (원)
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={small} />
            </label>
            <label className="text-[12px] text-muted">
              회수할 냥 (최대 {coinsGiven})
              <input value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value.replace(/\D/g, "") })} inputMode="numeric" disabled={!coinsGiven} className={small} />
            </label>
          </div>
          {coinsGiven > 0 && <RuleCalc p={p} coinsGiven={coinsGiven} left={form.left} onLeft={(left) => setForm({ ...form, left })} onApply={(amount, coins) => setForm({ ...form, amount: String(amount), coins: String(coins) })} />}
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="환불 사유 (토스에도 전달돼요)" className={small} />
          {(needManual || p.method === "toss") && (
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" checked={form.manual} onChange={(e) => setForm({ ...form, manual: e.target.checked })} />
              토스 상점관리자에서 이미 취소함 (여기선 기록과 냥 회수만)
            </label>
          )}
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy} className="btn-primary flex-1 py-2.5 text-[14px]">
              {busy ? "처리 중…" : "다음: 확인하기"}
            </button>
            <button onClick={() => setForm(null)} className={ghost}>
              닫기
            </button>
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted">
            약관 제5조: 열람한 감정서는 환불 없음. 충전한 냥은 7일 안이면 남은 냥만큼, 7일이 지나면 남은 냥만큼에서 10%를 빼고 환불. 무료·선물로 받은 냥은 먼저 쓴 것으로 보고, 회사 잘못이면 전액.
          </p>
        </div>
      ) : (
        <button
          onClick={() => {
            setMsg(null);
            setForm({ amount: String(p.amount), coins: String(coinsGiven), note: "", manual: false, left: "" });
          }}
          className="mt-1.5 rounded-lg border border-line px-2.5 py-1 text-[12px] text-muted"
        >
          ↩ 환불
        </button>
      )}
      {msg && <p className={`mt-1.5 text-[12.5px] ${msg.ok ? "text-peach" : "text-pink"}`}>{msg.text}</p>}
    </li>
  );
}

const kst = (d: number) => new Date(Date.now() + 9 * 3600e3 + d * 864e5).toISOString().slice(0, 10);
function monthRange(back: number): [string, string] {
  const k = new Date(Date.now() + 9 * 3600e3);
  const a = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() - back, 1));
  const b = back ? new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() - back + 1, 0)) : k;
  return [a.toISOString().slice(0, 10), b.toISOString().slice(0, 10)];
}

/** 결제 탭: search by 회원 or 주문번호, a period, refunds; and the CSV for 엑셀. */
export function PaymentsTab({ onOpenUser }: { onOpenUser: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(kst(-30));
  const [to, setTo] = useState(kst(0));
  const [onlyRefunded, setOnlyRefunded] = useState(false);
  const [list, setList] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const sp = new URLSearchParams({ q, from, to });
      setList((await call<{ payments: Payment[] }>(`/api/admin/payments?${sp}`)).payments);
    } catch (e) {
      setError((e as Error).message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = (list ?? []).filter((p) => !onlyRefunded || p.refunded_at);
  const paid = shown.filter((p) => p.method === "toss");
  const sales = paid.reduce((s, p) => s + p.amount, 0);
  const refunds = paid.reduce((s, p) => s + (p.refund_amount ?? 0), 0);
  const csv = (a: string, b: string) => `/api/admin/export?from=${a}&to=${b}`;

  return (
    <div className="space-y-4">
      <Section title="💳 결제 · 환불" sub="회원 이름을 누르면 그 회원의 냥 기록과 결제를 볼 수 있어요.">
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="닉네임 · 이메일 · 주문번호" className={input} />
          <button onClick={load} className="btn-primary shrink-0 px-4">
            찾기
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[12px] text-muted">
            부터
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={small} />
          </label>
          <label className="text-[12px] text-muted">
            까지
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={small} />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            ["오늘", 0],
            ["7일", -6],
            ["30일", -29],
            ["90일", -89],
          ].map(([l, d]) => (
            <button key={l} onClick={() => (setFrom(kst(d as number)), setTo(kst(0)))} className="rounded-lg border border-line px-2.5 py-1 text-[12px] text-muted">
              {l}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-[12px] text-muted">
            <input type="checkbox" checked={onlyRefunded} onChange={(e) => setOnlyRefunded(e.target.checked)} /> 환불만
          </label>
        </div>
        {error && <p className="mt-2 text-[13px] text-pink">{error}</p>}
        {list && (
          <p className="mt-3 rounded-xl bg-black/25 px-3 py-2 text-[13px]">
            {shown.length}건 · 매출 <b>{won(sales)}</b> · 환불 <b className="text-pink">{won(refunds)}</b> · 순매출 <b className="text-peach">{won(sales - refunds)}</b>
            {list.length >= 100 && <span className="block text-[11.5px] text-muted">최근 100건만 보여요. 기간을 줄이거나 엑셀로 받아 보세요.</span>}
          </p>
        )}
        <ul className="mt-2 divide-y divide-line">
          {shown.map((p) => (
            <PaymentItem key={p.order_id} p={p} onDone={load} onOpenUser={onOpenUser} />
          ))}
          {list && shown.length === 0 && <li className="py-4 text-center text-[13px] text-muted">결제가 없어요.</li>}
        </ul>
      </Section>

      <Section title="📥 엑셀로 내려받기" sub="결제·환불 내역(CSV)을 받아요. 엑셀에서 바로 열려요. 세무·정산용이에요.">
        <div className="grid grid-cols-2 gap-2">
          <a href={csv(...monthRange(0))} className={`${ghost} text-center`}>
            이번 달
          </a>
          <a href={csv(...monthRange(1))} className={`${ghost} text-center`}>
            지난달
          </a>
          <a href={csv(from, to)} className={`${ghost} col-span-2 text-center`}>
            위에서 고른 기간 ({from} ~ {to})
          </a>
        </div>
      </Section>
    </div>
  );
}
