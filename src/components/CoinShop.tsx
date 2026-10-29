"use client";

import { useEffect, useState } from "react";
import { useBack } from "@/lib/back";
import { COIN_PACKS, type CoinPack, WELCOME_COINS, nyang, packFor, won } from "@/lib/config";
import type { PaymentMethod } from "@/models/types";
import { paymentService } from "@/services/PaymentService";
import { useAppStore } from "@/store/useAppStore";

const METHODS: { id: PaymentMethod; label: string; on: string }[] = [
  { id: "tosspay", label: "토스페이", on: "border-[#3182f6] bg-[#3182f6]/15 text-[#7fb2ff]" },
  { id: "kakaopay", label: "카카오페이", on: "border-[#fee500] bg-[#fee500]/15 text-[#fee500]" },
  { id: "card", label: "카드·기타", on: "border-peach bg-peach/15 text-peach" },
];

/** 토스페이 · 카카오페이 open the pay app directly; 카드·기타 opens Toss's window with every card and pay app. */
export function MethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted">결제 수단</p>
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`rounded-xl border py-3 text-[14px] font-bold transition ${value === m.id ? m.on : "border-line text-muted"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TestModeNote() {
  return paymentService.isTestMode ? (
    <p className="mt-3 rounded-lg border border-dashed border-peach/40 p-2 text-center text-[12px] text-peach">🧪 TEST MODE — 실제 결제 없이 바로 처리돼요</p>
  ) : null;
}

const SOCIAL: Record<string, string> = { kakao: "카카오", naver: "네이버", google: "구글", dev: "테스트" };
/** "카카오·네이버" — the social logins that are switched on (the ones that get the 가입 선물). */
export function useSocialLabel(): string {
  const providers = useAppStore((s) => s.providers);
  return providers.map((p) => SOCIAL[p]).filter(Boolean).join("·") || "카카오";
}

/** The line under a paywall's 냥 button: what opening it takes for this visitor. */
export function usePayHint(cost: number): string {
  const me = useAppStore((s) => s.me);
  const accounts = useAppStore((s) => s.providers.some((p) => p !== "email"));
  if (me) return me.coins >= cost ? `👛 복주머니에 ${nyang(me.coins)} 있다냥 · 바로 열린다냥` : cost === 1 ? "🪙 천 원도 안 되는 복채다냥" : "☕ 커피 반 잔 값이다냥";
  if (accounts && WELCOME_COINS >= cost) return `🎁 가입 선물 ${nyang(WELCOME_COINS)}이면 공짜로 열린다냥`;
  return cost === 1 ? "🪙 천 원도 안 되는 복채다냥" : "☕ 커피 반 잔 값이다냥";
}

const perCoin = (p: CoinPack) => Math.round(p.price / p.coins);
const save = (p: CoinPack) => Math.round((1 - perCoin(p) / COIN_PACKS[0].price) * 100);

/**
 * 냥 충전: pick a pack (the one that covers `need` is preselected), a pay app, agree, pay.
 * `forReading`: started from a paywall, so after a Toss round-trip the reading opens with the new 냥 by itself.
 */
export function CoinShop({ need = 0, forReading = false, onCharged }: { need?: number; forReading?: boolean; onCharged: (balance: number) => void }) {
  const me = useAppStore((s) => s.me);
  const setCoins = useAppStore((s) => s.setCoins);
  const setPendingSpend = useAppStore((s) => s.setPendingSpend);
  const [packId, setPackId] = useState(() => (need > 0 ? packFor(need) : (COIN_PACKS.find((p) => p.tag === "인기") ?? COIN_PACKS[0])).id);
  const [method, setMethod] = useState<PaymentMethod>("tosspay");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pack = COIN_PACKS.find((p) => p.id === packId)!;

  if (!me) return null;
  const charge = async () => {
    setBusy(true);
    setError(null);
    if (forReading) setPendingSpend(true);
    const r = await paymentService.charge(pack, method, me.id);
    if (r.status === "charged") {
      setPendingSpend(false);
      setCoins(r.balance);
      onCharged(r.balance);
    } else if (r.status === "failed") {
      setPendingSpend(false);
      if (r.message) setError(r.message);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {COIN_PACKS.map((p) => {
          const short = p.coins < need;
          return (
            <button
              key={p.id}
              onClick={() => setPackId(p.id)}
              className={`relative rounded-2xl border p-3 text-left transition ${packId === p.id ? "border-peach bg-peach/10" : "border-line"} ${short ? "opacity-45" : ""}`}
            >
              {p.tag && <span className="absolute -top-2 right-2 rounded-full bg-pink px-2 py-0.5 text-[10.5px] font-bold text-white">{p.tag}</span>}
              <span className="block text-[17px] font-extrabold">🪙 {nyang(p.coins)}</span>
              <span className="mt-0.5 block text-[14px] font-semibold">{won(p.price)}</span>
              <span className="mt-0.5 block text-[11.5px] text-muted">{save(p) > 0 ? `냥당 ${won(perCoin(p))} · ${save(p)}% 할인` : "낱개"}</span>
              {short && <span className="block text-[11px] text-pink">이걸론 모자라다냥</span>}
            </button>
          );
        })}
      </div>
      <MethodPicker value={method} onChange={setMethod} />
      <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-pink" />
        <span>충전한 냥은 7일 안에 쓰지 않았다면 전액 환불돼요. 냥으로 연 점괘는 디지털 콘텐츠라 열람 후에는 청약철회가 제한돼요. 유효기간은 충전일로부터 5년이에요.</span>
      </label>
      {error && <p className="text-sm text-pink">{error}</p>}
      <button onClick={charge} disabled={!agree || busy || pack.coins < need} className="btn-primary w-full py-4 text-base">
        {busy ? "냥신이 엽전 세는 중…" : `🪙 ${nyang(pack.coins)} 충전하기 · ${won(pack.price)}`}
      </button>
      <TestModeNote />
    </div>
  );
}

/** 내 복주머니: balance and 충전, from the landing chip and 내 점괘함. */
export function WalletSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const coins = useAppStore((s) => s.me?.coins ?? 0);
  const [done, setDone] = useState<number | null>(null);
  useEffect(() => {
    if (open) setDone(null);
  }, [open]);
  useBack(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="내 복주머니"
        className="fade-up max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">👛 내 복주머니</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-muted hover:bg-white/5" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="flex items-end justify-between rounded-2xl border border-violet/35 bg-gradient-to-b from-[#24130d] to-[#120a07] p-4">
          <div>
            <p className="text-[12px] text-muted">지금 들어 있는 냥</p>
            <p className="mt-1 text-[30px] font-extrabold leading-none text-peach">🪙 {nyang(coins)}</p>
          </div>
          <p className="text-right text-[12px] leading-relaxed text-muted">
            점괘 하나 1냥
            <br />
            궁합은 2냥
          </p>
        </div>
        {done !== null && <p className="fade-up mt-3 text-center text-sm font-semibold text-peach">🪙 충전 완료! 이제 {nyang(done)} 있다냥</p>}
        <div className="mt-5">
          <CoinShop onCharged={setDone} />
        </div>
      </div>
    </div>
  );
}
