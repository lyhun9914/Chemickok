"use client";

import { useEffect } from "react";
import { Nyang } from "@/components/Nyang";
import { reportClientError } from "@/lib/track";

/** A screen that failed to draw: say so in 냥신's words, offer a retry, and send the error to the 관리자 오류 기록. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const e = error instanceof Error ? error : new Error(String(error));
    reportClientError("client", e.message || "화면을 그리지 못함", e.stack?.split("\n").slice(0, 8).join("\n"));
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <Nyang mood="wow" size={100} />
      <p className="mt-4 font-semibold">화면이 잠깐 흐려졌다냥…</p>
      <p className="mt-2 text-sm text-muted">냥신이 바로 알아채고 고치러 갔다냥. 다시 해 보자냥.</p>
      <button onClick={() => retry()} className="btn-primary mt-6 px-8 py-3">
        다시 시도하기
      </button>
      <button
        onClick={() => {
          window.location.href = "/";
        }}
        className="mt-3 text-sm text-muted underline underline-offset-4"
      >
        처음으로
      </button>
    </main>
  );
}
