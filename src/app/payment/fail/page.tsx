"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

function Fail() {
  const params = useSearchParams();
  const charge = params.get("kind") === "charge";
  // A 충전 that didn't happen must not open a reading later.
  useEffect(() => useAppStore.getState().setPendingSpend(false), []);
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">😢</div>
      <p className="mt-4 font-semibold">{charge ? "냥 충전이 완료되지 않았어요" : "결제가 완료되지 않았어요"}</p>
      <p className="mt-2 text-sm text-muted">{params.get("message") ?? "결제가 취소되었거나 실패했어요."}</p>
      <p className="mt-1 text-xs text-muted">돈은 빠져나가지 않았어요.</p>
      <Link href="/" className="btn-primary mt-6 px-8 py-3">
        {charge ? "돌아가기" : "결과 화면으로 돌아가기"}
      </Link>
    </main>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <Fail />
    </Suspense>
  );
}
