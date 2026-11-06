"use client";

import { useCallback, useEffect, useState } from "react";
import { PaymentItem, type Payment } from "./PaymentsTab";
import { Note, PROVIDER, Section, call, ghost, input, num, useConfirm, when } from "./ui";

type UserRow = { id: string; provider: string; nickname: string; email: string | null; created_at: string; balance: number };
type Ledger = { delta: number; reason: string; ref: string; balance_after: number; created_at: string };
type Detail = { user: Omit<UserRow, "balance">; balance: number; history: Ledger[]; payments: Payment[] };

const REASON: Record<string, string> = { charge: "충전", spend: "점괘", bonus: "선물·출석·초대·쿠폰", refund: "환불", admin: "관리자", gift: "냥 선물" };
/** "coupon:ABC" → "쿠폰 ABC", "streak:2026-11-06" → "출석" … so the ledger reads like plain Korean. */
function refLabel(h: Ledger): string {
  const [k, v] = h.ref.split(":");
  if (h.reason === "bonus") return k === "coupon" ? `쿠폰 ${v}` : k === "streak" ? "7일 출석" : k === "invite" ? "친구 초대" : k === "welcome" ? "가입 선물" : k === "joined" ? "초대받아 가입" : h.ref;
  if (h.reason === "spend") return `${k} 점괘`;
  if (h.reason === "gift") return k === "send" ? "선물 보냄" : k === "recv" ? "선물 받음" : k === "cancel" ? "선물 취소" : h.ref;
  return h.ref.replace(/#[0-9a-f]+$/, "");
}

/** 회원 탭: find a member, see their 냥 and payments, give or take 냥 (with a reason, confirmed first). */
export function MembersTab({ openId, onOpened }: { openId: string | null; onOpened: () => void }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [adj, setAdj] = useState({ sign: 1 as 1 | -1, amount: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [ask, dialog] = useConfirm();

  const search = useCallback(async (term: string) => {
    setError(null);
    try {
      setUsers((await call<{ users: UserRow[] }>(`/api/admin/users?q=${encodeURIComponent(term)}`)).users);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const open = useCallback(async (id: string) => {
    setError(null);
    setDone(null);
    try {
      setDetail(await call<Detail>(`/api/admin/users/${id}`));
      setAdj({ sign: 1, amount: "", note: "" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    search("");
  }, [search]);
  useEffect(() => {
    if (openId) {
      open(openId);
      onOpened();
    }
  }, [openId, open, onOpened]);

  const adjust = async () => {
    if (!detail) return;
    const n = Math.trunc(Number(adj.amount));
    if (!(n >= 1 && n <= 1000)) return setError("1~1000냥 사이로 넣어 주세요.");
    if (!adj.note.trim()) return setError("사유를 적어 주세요. (작업 기록에 남아요)");
    const delta = adj.sign * n;
    const ok = await ask({
      title: delta > 0 ? "냥을 넣어 줄까요?" : "냥을 회수할까요?",
      rows: [
        ["회원", `${detail.user.nickname} · ${detail.user.email ?? PROVIDER[detail.user.provider]}`],
        ["지금", `${detail.balance}냥`],
        [delta > 0 ? "넣을 냥" : "뺄 냥", <b key="d" className={delta > 0 ? "text-peach" : "text-pink"}>{delta > 0 ? `+${delta}` : delta}냥</b>],
        ["처리 후", `${detail.balance + delta}냥`],
        ["사유", adj.note.trim()],
      ],
      confirm: delta > 0 ? `${n}냥 넣기` : `${n}냥 회수하기`,
      danger: delta < 0,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ balance: number }>(`/api/admin/users/${detail.user.id}`, { method: "POST", body: JSON.stringify({ delta, reason: "admin", note: adj.note.trim() }) });
      await open(detail.user.id);
      setDone(`${delta > 0 ? "넣었어요" : "회수했어요"}: ${delta > 0 ? "+" : ""}${delta}냥 → ${r.balance}냥`);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      {dialog}
      {detail && (
        <Section
          className="border-peach/40"
          title={detail.user.nickname}
          sub={`${PROVIDER[detail.user.provider] ?? detail.user.provider} · ${detail.user.email ?? "이메일 없음"} · 가입 ${when(detail.user.created_at)}`}
          right={
            <div className="text-right">
              <p className="text-[22px] font-black leading-none text-peach">{num(detail.balance)}냥</p>
              <button onClick={() => setDetail(null)} className="mt-1 text-[12px] text-muted underline">
                닫기
              </button>
            </div>
          }
        >
          <div className="space-y-2 rounded-xl bg-black/25 p-3">
            <p className="text-[13.5px] font-bold">냥 넣기 · 빼기</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([1, -1] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setAdj({ ...adj, sign: s })}
                  className={`rounded-xl border py-2 text-[14px] font-bold ${adj.sign === s ? (s > 0 ? "border-peach bg-peach/15 text-peach" : "border-pink bg-pink/15 text-pink") : "border-line text-muted"}`}
                >
                  {s > 0 ? "+ 넣어 주기 (보상)" : "− 회수하기"}
                </button>
              ))}
            </div>
            <input value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="몇 냥?" className={input} />
            <input value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder="사유 (예: 결제 오류 보상, 문의 #12)" maxLength={60} className={input} />
            <button onClick={adjust} disabled={busy} className="btn-primary w-full py-2.5">
              다음: 확인하기
            </button>
            {done && <Note tone="ok">{done}</Note>}
            <p className="text-[11.5px] leading-relaxed text-muted">결제를 돌려주는 환불은 아래 결제의 ↩ 환불로 하세요. 토스 결제 취소와 냥 회수가 한 번에 돼요.</p>
          </div>

          <h3 className="mt-4 text-[14px] font-bold">결제 ({detail.payments.length})</h3>
          <ul className="divide-y divide-line">
            {detail.payments.map((p) => (
              <PaymentItem key={p.order_id} p={p} onDone={() => open(detail.user.id)} />
            ))}
            {detail.payments.length === 0 && <li className="py-2 text-[13px] text-muted">결제가 없어요.</li>}
          </ul>

          <h3 className="mt-4 text-[14px] font-bold">냥 기록 (최근 30)</h3>
          <ul className="mt-1 max-h-80 divide-y divide-line overflow-y-auto text-[13px]">
            {detail.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate">
                  <span className="text-muted">{when(h.created_at)}</span> · {REASON[h.reason] ?? h.reason} · {refLabel(h)}
                </span>
                <span className={`shrink-0 font-bold ${h.delta > 0 ? "text-peach" : "text-muted"}`}>
                  {h.delta > 0 ? "+" : ""}
                  {h.delta} → {h.balance_after}
                </span>
              </li>
            ))}
            {detail.history.length === 0 && <li className="py-2 text-muted">기록이 없어요.</li>}
          </ul>
        </Section>
      )}

      <Section title="👥 회원 찾기" sub="닉네임·이메일 일부, 초대 코드, 회원 ID로 찾아요. 비우고 찾으면 최근 가입 30명.">
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search(q)} placeholder="닉네임 또는 이메일" className={input} />
          <button onClick={() => search(q)} className="btn-primary shrink-0 px-4">
            찾기
          </button>
        </div>
        {error && <p className="mt-2 text-[13px] text-pink">{error}</p>}
        <ul className="mt-2 divide-y divide-line">
          {(users ?? []).map((u) => (
            <li key={u.id}>
              <button onClick={() => open(u.id)} className="flex w-full items-center justify-between gap-2 py-2.5 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold">{u.nickname}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {PROVIDER[u.provider] ?? u.provider} · {u.email ?? "이메일 없음"} · {when(u.created_at)}
                  </span>
                </span>
                <span className="shrink-0 text-[14px] font-bold text-peach">{u.balance}냥</span>
              </button>
            </li>
          ))}
          {users && users.length === 0 && <li className="py-3 text-[13px] text-muted">찾는 회원이 없어요.</li>}
        </ul>
        {users && users.length > 0 && (
          <button onClick={() => search(q)} className={`${ghost} mt-2 w-full`}>
            새로고침
          </button>
        )}
      </Section>
    </div>
  );
}
