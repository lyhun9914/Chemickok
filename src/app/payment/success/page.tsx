"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { nyang } from "@/lib/config";
import { paymentService } from "@/services/PaymentService";
import { useAppStore } from "@/store/useAppStore";

/**
 * Toss redirects here with ?paymentKey&orderId&amount. Two kinds:
 *   a guest's reading     → confirm and unlock it
 *   kind=charge&pack=…    → fill the 복주머니; if it was started from a paywall, open that reading with the new 냥
 * Confirming twice (a reload) is safe: the server answers the same.
 */
function Confirm() {
  const params = useSearchParams();
  const router = useRouter();
  const applyUnlock = useAppStore((s) => s.applyUnlock);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("결제를 확인하고 있어요...");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = Number(params.get("amount"));
    // Answers survive the PG round-trip in sessionStorage.
    const { input, teaser, fortune, pendingSpend, setPendingSpend, setCoins, setScreen, loadMe } = useAppStore.getState();
    if (!paymentKey || !orderId) {
      setError("결제 정보가 없어요. 같은 브라우저 창에서 다시 시도해 주세요.");
      return;
    }

    if (params.get("kind") === "charge") {
      (async () => {
        await loadMe();
        const { balance, added } = await paymentService.confirmCharge({ packId: params.get("pack") ?? "", paymentKey, orderId, amount });
        setCoins(balance);
        if (pendingSpend && (teaser || fortune)) {
          setLabel(`🪙 ${nyang(added)} 충전 완료! 점괘를 여는 중이다냥…`);
          setPendingSpend(false);
          const r = await paymentService.spend(input);
          if (r.status === "unlocked") applyUnlock(r.unlock);
          setScreen("result");
        } else {
          setPendingSpend(false);
          useAppStore.setState({ screen: "my" });
          sessionStorage.setItem("nyang-notice", `🪙 ${nyang(added)} 충전 완료! 복주머니에 ${nyang(balance)} 있다냥`);
        }
        router.replace("/");
      })().catch((e: Error) => setError(e.message));
      return;
    }

    if (!(teaser || fortune)) {
      setError("진단 결과가 없어요. 같은 브라우저 창에서 다시 시도해 주세요.");
      return;
    }
    paymentService
      .confirmRedirect({ input, paymentKey, orderId, amount })
      .then((u) => {
        applyUnlock(u);
        setScreen("result");
        router.replace("/");
      })
      .catch((e: Error) => setError(e.message));
  }, [params, router, applyUnlock]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      {error ? (
        <>
          <div className="text-5xl">⚠️</div>
          <p className="mt-4 font-semibold">결제 확인에 실패했어요</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <p className="mt-2 text-xs text-muted">돈이 빠져나갔는데 이 화면이 보이면, 맨 아래 고객문의로 알려 주세요.</p>
          <button onClick={() => router.replace("/")} className="btn-primary mt-6 px-8 py-3">
            돌아가기
          </button>
        </>
      ) : (
        <>
          <div className="heartbeat text-6xl">🪙</div>
          <p className="mt-6 font-semibold">{label}</p>
        </>
      )}
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <Confirm />
    </Suspense>
  );
}
