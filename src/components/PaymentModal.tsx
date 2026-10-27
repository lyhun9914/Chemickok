"use client";

import { useState } from "react";
import { productOf, won } from "@/lib/config";
import type { PaymentMethod, QuestionnaireInput, UnlockResponse } from "@/models/types";
import { paymentService } from "@/services/PaymentService";
import { useAppStore } from "@/store/useAppStore";

interface Props {
  open: boolean;
  input: QuestionnaireInput;
  inputHash: string;
  onClose: () => void;
  onUnlocked: (u: UnlockResponse) => void;
}

export function PaymentModal({ open, input, inputHash, onClose, onUnlocked }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("toss");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useAppStore((s) => s.teaser?.locked ?? []);

  if (!open) return null;
  const product = productOf(input.mode);

  const pay = async () => {
    setBusy(true);
    setError(null);
    const result = await paymentService.purchase(input, inputHash, method);
    if (result.status === "unlocked") onUnlocked(result.unlock);
    else if (result.status === "failed") setError(result.message);
    // "redirecting": the browser is leaving for the PG page.
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="결제하기"
        className="fade-up w-full max-w-[480px] rounded-t-3xl bg-surface p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="text-lg font-bold">🐾 냥신에게 복채 내기</h2>
        <div className="mt-4 flex items-end justify-between rounded-2xl bg-white/[0.04] p-4">
          <div>
            <p className="text-sm text-muted">{product.orderName}</p>
            <p className="mt-1 text-xs text-peach">{product.price < 3000 ? "☕ 아메리카노보다 싸다냥" : "☕ 커피 한 잔 값이다냥"}</p>
          </div>
          <p className="text-2xl font-extrabold">
            {product.price.toLocaleString("ko-KR")}
            <span className="text-base">원</span>
          </p>
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

        <p className="mb-2 mt-5 text-sm text-muted">결제 수단</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMethod("toss")}
            className={`rounded-xl border py-3.5 font-bold transition ${
              method === "toss" ? "border-[#3182f6] bg-[#3182f6]/15 text-[#7fb2ff]" : "border-line text-muted"
            }`}
          >
            toss pay
          </button>
          <button
            onClick={() => setMethod("kakaopay")}
            className={`rounded-xl border py-3.5 font-bold transition ${
              method === "kakaopay" ? "border-[#fee500] bg-[#fee500]/15 text-[#fee500]" : "border-line text-muted"
            }`}
          >
            kakao pay
          </button>
        </div>

        <label className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-pink" />
          <span>
            결제 즉시 리포트가 제공되는 디지털 콘텐츠로, 열람 이후에는 전자상거래법에 따라 청약철회가 제한될 수
            있음에 동의합니다.
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-pink">{error}</p>}

        <button onClick={pay} disabled={!agree || busy} className="btn-primary mt-5 w-full py-4 text-base">
          {busy ? "냥신이 복채 세는 중..." : `복채 ${won(product.price)} 내고 전부 듣기`}
        </button>

        {paymentService.isTestMode && (
          <p className="mt-3 rounded-lg border border-dashed border-peach/40 p-2 text-center text-[11px] text-peach">
            🧪 TEST MODE — 실제 결제 없이 즉시 잠금 해제됩니다
          </p>
        )}
      </div>
    </div>
  );
}
