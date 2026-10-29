"use client";

import { useState } from "react";
import { WELCOME_COINS, isFortune, nyang, productOf, won } from "@/lib/config";
import type { PaymentMethod, QuestionnaireInput, UnlockResponse } from "@/models/types";
import { paymentService } from "@/services/PaymentService";
import { useAppStore } from "@/store/useAppStore";
import { useBack } from "@/lib/back";
import { CoinShop, MethodPicker, TestModeNote, useSocialLabel } from "./CoinShop";

interface Props {
  open: boolean;
  input: QuestionnaireInput;
  inputHash: string;
  onClose: () => void;
  onUnlocked: (u: UnlockResponse) => void;
  /** guest: go log in instead (가입 선물 냥 · 점괘함) */
  onLogin?: () => void;
}

const AGREE = "냥으로 여는 점괘는 결제 즉시 제공되는 디지털 콘텐츠라, 열람 이후에는 전자상거래법에 따라 청약철회가 제한될 수 있음에 동의합니다.";

/**
 * 복채 내기. Logged in: pay the reading's 냥 from the 복주머니, or fill it first (then it opens by itself).
 * Guest: buy just this reading on the spot (same price as its 냥), or log in for the 가입 선물.
 */
export function PaymentModal({ open, input, inputHash, onClose, onUnlocked, onLogin }: Props) {
  const me = useAppStore((s) => s.me);
  const setCoins = useAppStore((s) => s.setCoins);
  const locked = useAppStore((s) => (isFortune(s.input.mode) ? s.fortune?.locked : s.teaser?.locked)) ?? [];
  const [method, setMethod] = useState<PaymentMethod>("tosspay");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const social = useSocialLabel();
  useBack(open, onClose);

  if (!open) return null;
  const product = productOf(input.mode);
  const cost = product.coins;
  const balance = me?.coins ?? 0;

  const finish = (r: Awaited<ReturnType<typeof paymentService.spend>>) => {
    if (r.status === "unlocked") onUnlocked(r.unlock);
    else if (r.status === "failed" && r.message) setError(r.message);
  };
  const spend = async () => {
    setBusy(true);
    setError(null);
    finish(await paymentService.spend(input));
    setBusy(false);
  };
  const payDirect = async () => {
    setBusy(true);
    setError(null);
    finish(await paymentService.purchase(input, inputHash, method));
    // "redirecting": the browser is leaving for the PG page.
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="복채 내기"
        className="fade-up max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">🐾 냥신에게 복채 내기</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-muted hover:bg-white/5" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="flex items-end justify-between rounded-2xl bg-white/[0.04] p-4">
          <div>
            <p className="text-sm text-muted">{product.orderName}</p>
            <p className="mt-1 text-xs text-peach">{cost === 1 ? "🪙 엽전 한 냥이면 다 듣는다냥" : `🪙 엽전 ${cost}냥이면 다 듣는다냥`}</p>
          </div>
          <p className="text-2xl font-extrabold text-peach">🪙 {nyang(cost)}</p>
        </div>
        {locked.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-2xl border border-line p-4 text-sm">
            {locked.map((l) => (
              <li key={l.id} className="flex gap-2">
                <span>{l.icon}</span>
                <span className="leading-snug">{l.title}</span>
              </li>
            ))}
          </ul>
        )}

        {me ? (
          balance >= cost ? (
            <div className="mt-5">
              <div className="flex items-center justify-between rounded-2xl border border-violet/35 px-4 py-3 text-sm">
                <span className="text-muted">내 복주머니</span>
                <span className="font-bold">
                  🪙 {nyang(balance)} <span className="font-normal text-muted">→ 열고 나면 {nyang(balance - cost)}</span>
                </span>
              </div>
              <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-pink" />
                <span>{AGREE}</span>
              </label>
              {error && <p className="mt-3 text-sm text-pink">{error}</p>}
              <button onClick={spend} disabled={!agree || busy} className="btn-primary mt-4 w-full py-4 text-base">
                {busy ? "냥신이 엽전 세는 중…" : `🪙 ${nyang(cost)} 내고 전부 듣기`}
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <p className="mb-3 text-sm">
                복주머니에 🪙 {nyang(balance)}뿐이다냥. <b className="text-peach">{nyang(cost - balance)}</b>만 더 채우면 바로 열어 주겠다냥.
              </p>
              {error && <p className="mb-3 text-sm text-pink">{error}</p>}
              <CoinShop
                need={cost - balance}
                forReading
                onCharged={async (b) => {
                  setCoins(b);
                  await spend();
                }}
              />
            </div>
          )
        ) : (
          <div className="mt-5">
            {onLogin && WELCOME_COINS > 0 && (
              <button onClick={onLogin} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-peach/40 bg-peach/10 p-3.5 text-left active:scale-[0.98]">
                <span className="text-2xl">🎁</span>
                <span className="flex-1 text-[13.5px] leading-snug">
                  <b className="text-peach">
                    {social}로 가입하면 {nyang(WELCOME_COINS)} 선물
                  </b>
                  <span className="block text-muted">{cost <= WELCOME_COINS ? "이 점괘는 공짜로 열린다냥 · 점괘함에 보관" : "점괘함에 보관 · 다음엔 생일도 안 묻는다냥"}</span>
                </span>
                <span aria-hidden>→</span>
              </button>
            )}
            <p className="mb-3 text-[13px] text-muted">
              {onLogin ? "로그인 없이 이 점괘만 바로 보기" : "이 점괘 바로 보기"} · <b className="text-ink">{won(product.price)}</b>
            </p>
            <MethodPicker value={method} onChange={setMethod} />
            <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-pink" />
              <span>{AGREE.replace("냥으로 여는 점괘는", "이 점괘는")}</span>
            </label>
            {error && <p className="mt-3 text-sm text-pink">{error}</p>}
            <button onClick={payDirect} disabled={!agree || busy} className="btn-primary mt-4 w-full py-4 text-base">
              {busy ? "냥신이 복채 세는 중…" : `복채 ${won(product.price)} 내고 전부 듣기`}
            </button>
            <TestModeNote />
          </div>
        )}
      </div>
    </div>
  );
}
