"use client";

import { useEffect, useState } from "react";
import { inAppBrowser } from "@/lib/handoff";
import { Nyang } from "./Nyang";

/** Chrome · 삼성 인터넷's own install sheet. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "nyang-install-dismissed";

/**
 * 홈 화면에 추가 권유: 매일 출석하러 오기 쉽게. Chrome-family browsers get their install sheet; iPhone Safari gets
 * the two taps to do it by hand. Hidden when already installed, inside KakaoTalk · Instagram (they can't install),
 * and once closed.
 */
export function InstallPrompt() {
  const [ask, setAsk] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    if (installed || dismissed || inAppBrowser()) return;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) {
      setIos(true);
      setShown(true);
    }
    const onAsk = (e: Event) => {
      e.preventDefault();
      setAsk(e as InstallEvent);
      setShown(true);
    };
    window.addEventListener("beforeinstallprompt", onAsk);
    return () => window.removeEventListener("beforeinstallprompt", onAsk);
  }, []);

  const close = () => {
    setShown(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* storage unavailable */
    }
  };

  const install = async () => {
    if (!ask) return;
    await ask.prompt();
    const { outcome } = await ask.userChoice;
    setAsk(null);
    if (outcome === "accepted") setShown(false);
  };

  if (!shown) return null;
  return (
    <div className="relative mt-3 flex items-center gap-3 rounded-2xl border border-peach/30 bg-peach/5 p-3.5">
      <Nyang mood="happy" size={40} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold">📲 냥신을 홈 화면에 모셔 둬라냥</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
          {ios ? "아래 공유 버튼 ⬆️ → '홈 화면에 추가'를 누르면 앱처럼 열린다냥." : "앱처럼 바로 열려서 매일 출석 도장 찍기가 쉬워진다냥."}
        </p>
        {ask && (
          <button onClick={install} className="btn-primary mt-2 px-4 py-2 text-[13px]">
            홈 화면에 추가
          </button>
        )}
      </div>
      <button onClick={close} aria-label="닫기" className="absolute right-2 top-1.5 px-1.5 text-lg text-muted">
        ×
      </button>
    </div>
  );
}
