"use client";

import { useEffect, useState } from "react";
import { inAppBrowser, openExternally } from "@/lib/handoff";
import { isMobile } from "@/services/shareService";
import { BottomSheet } from "./BottomSheet";
import { Nyang } from "./Nyang";

/** Chrome · 삼성 인터넷's own install sheet. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
declare global {
  interface Window {
    /** caught by the inline script in the layout, which can run before this button is drawn */
    __nyangInstall?: InstallEvent;
  }
}

/** Set once the guide has been opened: the button stops blinking but stays, for coming back to it. */
const SEEN = "nyang-install-seen";

/** How this browser adds to the home screen: its own install sheet, a hand-done path, or not here at all. */
type Way = "sheet" | "ios" | "android" | "inapp-open" | "inapp";

/** The taps, one per line, as they look on that phone. */
const STEPS: Record<Way, string[]> = {
  sheet: ["아래 '홈 화면에 추가' 버튼을 누른다", "뜨는 창에서 '설치' 또는 '추가'를 누른다", "홈 화면에 생긴 냥신 아이콘으로 들어온다"],
  ios: [
    "공유 버튼 ⬆️ 을 누른다 (사파리는 화면 아래, 크롬은 주소창 오른쪽)",
    "목록을 아래로 내려 '홈 화면에 추가'를 누른다",
    "오른쪽 위 '추가'를 누르면 끝이다",
  ],
  android: ["오른쪽 위 메뉴 ⋮ 를 누른다 (삼성 인터넷은 아래 ≡)", "'홈 화면에 추가' 또는 '앱 설치'를 누른다", "'추가'·'설치'를 한 번 더 누르면 끝이다"],
  "inapp-open": ["카톡·인스타 안에서는 홈 화면에 못 모신다", "아래 '브라우저로 열기'를 누른다", "열린 브라우저에서 메뉴 ⋮ → '홈 화면에 추가'"],
  inapp: [
    "카톡·인스타 안에서는 홈 화면에 못 모신다",
    "오른쪽 위(또는 아래) ⋯ → 'Safari로 열기'를 누른다",
    "사파리에서 공유 ⬆️ → '홈 화면에 추가'",
  ],
};

/**
 * 홈 화면에 추가 도움말: a small 📲 button in the top bar that blinks until it has been opened once, and a sheet with
 * the taps for this phone. Chrome-family browsers also get their own install sheet from the button; inside KakaoTalk ·
 * Instagram the way out to the real browser comes first. Hidden once installed, and on computers with nothing to offer.
 */
export function InstallHelp() {
  const [ask, setAsk] = useState<InstallEvent | null>(null);
  const [way, setWay] = useState<Way | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    // installable on Android browsers that want a service worker (it stores nothing; see public/sw.js)
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (installed) return;
    try {
      setSeen(localStorage.getItem(SEEN) === "1");
    } catch {
      setSeen(false);
    }

    const take = () => {
      if (!window.__nyangInstall) return;
      setAsk(window.__nyangInstall);
      setWay("sheet");
    };
    take();
    window.addEventListener("nyang-installable", take);
    const done = () => setWay(null);
    window.addEventListener("appinstalled", done);

    const inApp = inAppBrowser();
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    // KakaoTalk (both phones) and Android in-app browsers can hand the page to the real browser; iPhone ones can't
    if (inApp) setWay(inApp === "ios" ? "inapp" : "inapp-open");
    else if (ios) setWay("ios");
    // Android without Chrome's own sheet (삼성 인터넷, 파이어폭스…): the menu path
    else if (isMobile()) setWay((w) => w ?? "android");
    return () => {
      window.removeEventListener("nyang-installable", take);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  const show = () => {
    setOpen(true);
    setSeen(true);
    try {
      localStorage.setItem(SEEN, "1");
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
    if (outcome === "accepted") {
      setOpen(false);
      setWay(null);
    } else setWay(isMobile() ? "android" : null);
  };

  if (!way) return null;
  // Chrome's sheet can be taken back after a refusal: then the hand-done Android steps.
  const steps = STEPS[way === "sheet" && !ask ? "android" : way];
  return (
    <>
      <button
        onClick={show}
        aria-label="홈 화면에 추가하는 법"
        title="홈 화면에 추가하는 법"
        className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-surface/85 text-[15px] transition active:scale-90 ${seen ? "border-line" : "beckon border-peach/70"}`}
      >
        <span aria-hidden>📲</span>
        <span
          aria-hidden
          className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-pink text-[10px] font-bold leading-none text-white ${seen ? "" : "blink"}`}
        >
          ?
        </span>
      </button>

      <BottomSheet open={open} title="📲 냥신을 홈 화면에 모시는 법" onClose={() => setOpen(false)}>
        <div className="flex items-center gap-3 rounded-2xl border border-peach/25 bg-peach/5 p-3.5">
          <Nyang mood="happy" size={44} className="shrink-0" />
          <p className="text-[13.5px] leading-relaxed">
            홈 화면에 두면 <b className="text-peach">앱처럼 바로 열린다냥.</b> 주소 칠 필요 없고, 매일 출석 도장 찍기도 쉬워진다냥.
          </p>
        </div>

        <ol className="mt-4 space-y-2.5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.03] p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pink text-[12px] font-bold text-white">{i + 1}</span>
              <span className="text-[14px] leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>

        {way === "sheet" && ask && (
          <button onClick={install} className="btn-primary mt-5 w-full py-3.5 text-[15px]">
            📲 홈 화면에 추가
          </button>
        )}
        {way === "inapp-open" && (
          <button onClick={() => openExternally(window.location.href)} className="btn-primary mt-5 w-full py-3.5 text-[15px]">
            브라우저로 열기
          </button>
        )}
        <p className="mt-4 text-center text-[12px] text-muted">이 안내는 위쪽 📲 버튼을 누르면 언제든 다시 볼 수 있다냥</p>
      </BottomSheet>
    </>
  );
}
