"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { paymentService } from "@/services/PaymentService";
import { useAppStore } from "@/store/useAppStore";

/** Toss redirects here with ?paymentKey&orderId&amount (+ our reportId). Confirm server-side, then unlock. */
function Confirm() {
  const params = useSearchParams();
  const router = useRouter();
  const applyUnlock = useAppStore((s) => s.applyUnlock);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = Number(params.get("amount"));
    // Answers survive the PG round-trip in sessionStorage.
    const { input, teaser, fortune } = useAppStore.getState();
    if (!paymentKey || !orderId || !(teaser || fortune)) {
      setError("결제 정보 또는 진단 결과가 없어요. 같은 브라우저 창에서 다시 시도해 주세요.");
      return;
    }
    paymentService
      .confirmRedirect({ input, paymentKey, orderId, amount })
      .then((u) => {
        applyUnlock(u);
        useAppStore.getState().setScreen("result");
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
          <button onClick={() => router.replace("/")} className="btn-primary mt-6 px-8 py-3">
            돌아가기
          </button>
        </>
      ) : (
        <>
          <div className="heartbeat text-6xl">💳</div>
          <p className="mt-6 font-semibold">결제를 확인하고 있어요...</p>
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
