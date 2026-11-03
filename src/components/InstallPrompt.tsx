"use client";

import { useEffect, useState } from "react";
import { inAppBrowser, openExternally } from "@/lib/handoff";
import { isMobile } from "@/services/shareService";
import { Nyang } from "./Nyang";

/** Chrome · 삼성 인터넷's own install sheet. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
declare global {
  interface Window {
    /** caught by the inline script in the layout, which can run before this card is drawn */
    __nyangInstall?: InstallEvent;
  }
}

const KEY = "nyang-install-dismissed";

/** How this browser adds to the home screen: its own install sheet, a hand-done path, or not here at all. */
type Way = "sheet" | "ios" | "android" | "inapp-open" | "inapp";

const GUIDE: Record<Exclude<Way, "sheet">, string> = {
  ios: "공유 버튼 ⬆️ (사파리는 아래, 크롬은 주소창 옆) → '홈 화면에 추가'를 누르면 앱처럼 열린다냥.",
  android: "브라우저 메뉴 ⋮ (삼성 인터넷은 ≡) → '홈 화면에 추가' 또는 '앱 설치'를 누르면 된다냥.",
  "inapp-open": "카톡·인스타 안에서는 홈 화면에 못 모신다냥. 브라우저로 열어서 추가해라냥.",
  inapp: "이 앱 안에서는 홈 화면에 못 모신다냥. 오른쪽 위 ⋯ → '브라우저로 열기' 다음에 추가해라냥.",
};

/**
 * 홈 화면에 추가 권유: 매일 출석하러 오기 쉽게. Chrome-family browsers get their install sheet; other phone browsers
 * get the taps to do it by hand (iPhone: 공유 → 홈 화면에 추가; Android: ⋮ → 홈 화면에 추가); inside KakaoTalk ·
 * Instagram, a way out to the real browser first. Hidden when already installed, and once closed.
 */
export function InstallPrompt() {
  const [ask, setAsk] = useState<InstallEvent | null>(null);
  const [way, setWay] = useState<Way | null>(null);

  useEffect(() => {
    // installable on Android browsers that want a service worker (it stores nothing; see public/sw.js)
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    if (installed || dismissed) return;

    const take = () => {
      if (!window.__nyangInstall) return;
      setAsk(window.__nyangInstall);
      setWay("sheet");
    };
    take();
    window.addEventListener("nyang-installable", take);

    const inApp = inAppBrowser();
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    let t: ReturnType<typeof setTimeout> | undefined;
    // KakaoTalk (both phones) and Android in-app browsers can hand the page to the real browser; iPhone ones can't
    if (inApp) setWay(inApp === "ios" ? "inapp" : "inapp-open");
    else if (ios) setWay("ios");
    // Android: wait a moment for Chrome's own sheet; without it (삼성 인터넷, 파이어폭스…), the menu path
    else if (isMobile()) t = setTimeout(() => setWay((w) => w ?? "android"), 2500);
    return () => {
      window.removeEventListener("nyang-installable", take);
      clearTimeout(t);
    };
  }, []);

  const close = () => {
    setWay(null);
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
    window.__nyangInstall = undefined;
    if (outcome === "accepted") setWay(null);
    else setWay(isMobile() ? "android" : null);
  };

  if (!way) return null;
  return (
    <div className="relative mt-3 flex items-center gap-3 rounded-2xl border border-peach/30 bg-peach/5 p-3.5">
      <Nyang mood="happy" size={40} className="shrink-0" />
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-[14px] font-bold">📲 냥신을 홈 화면에 모셔 둬라냥</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{way === "sheet" ? "앱처럼 바로 열려서 매일 출석 도장 찍기가 쉬워진다냥." : GUIDE[way]}</p>
        {way === "sheet" && ask && (
          <button onClick={install} className="btn-primary mt-2 px-4 py-2 text-[13px]">
            홈 화면에 추가
          </button>
        )}
        {way === "inapp-open" && (
          <button onClick={() => openExternally(window.location.href)} className="btn-primary mt-2 px-4 py-2 text-[13px]">
            브라우저로 열기
          </button>
        )}
      </div>
      <button onClick={close} aria-label="닫기" className="absolute right-2 top-1.5 px-1.5 text-lg text-muted">
        ×
      </button>
    </div>
  );
}
