"use client";

import { useEffect } from "react";

/**
 * The page behind a shared 퀴즈 / 케미표 link. Its only job is the link preview (KakaoTalk reads the title from this
 * page); a person is sent on to the app at once, where the quiz or room opens.
 */
export function LinkOpener({ to, label }: { to: string; label: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="animate-pulse text-[15px] text-peach">{label} 여는 중…</p>
      <a href={to} className="text-[13px] text-muted underline underline-offset-4">
        안 열리면 여기를 눌러라냥
      </a>
    </main>
  );
}
