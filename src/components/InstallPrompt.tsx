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
/** ?install=1: arrived from "브라우저로 열기" in an in-app browser, to add to the home screen right away. */
const ARRIVE = "install";

/**
 * How this browser adds to the home screen: its own install sheet, a hand-done path, or a way out of an in-app
 * browser first (KakaoTalk can hand the page to the real browser on both phones; other iPhone in-app browsers can't).
 */
type Way = "sheet" | "ios" | "android" | "inapp-open" | "inapp-open-ios" | "inapp";

/** The taps, one per line, as they look on that phone. */
const STEPS: Record<Way, string[]> = {
  sheet: ["아래 '홈 화면에 추가' 버튼을 누른다", "뜨는 창에서 '설치' 또는 '추가'를 누른다", "홈 화면에 생긴 냥신 아이콘으로 들어온다"],
  ios: [
    "공유 버튼 ⬆️ 을 누른다 (사파리는 화면 아래 가운데, 크롬은 주소창 오른쪽)",
    "목록을 아래로 내려 '홈 화면에 추가'를 누른다",
    "오른쪽 위 '추가'를 누르면 끝이다",
  ],
  android: ["오른쪽 위 메뉴 ⋮ 를 누른다 (삼성 인터넷은 아래 ≡)", "'홈 화면에 추가' 또는 '앱 설치'를 누른다", "'추가'·'설치'를 한 번 더 누르면 끝이다"],
  "inapp-open": ["카톡·인스타 안에서는 홈 화면에 못 모신다", "아래 '브라우저로 열기'를 누른다", "브라우저가 열리면 설치 안내가 바로 뜬다"],
  "inapp-open-ios": ["카톡 안에서는 홈 화면에 못 모신다", "아래 '사파리로 열기'를 누른다", "사파리가 열리면 홈 화면 추가 안내가 바로 뜬다"],
  inapp: [
    "이 앱 안에서는 홈 화면에 못 모신다",
    "오른쪽 위(또는 아래) ⋯ → 'Safari로 열기'를 누른다",
    "사파리에서 공유 ⬆️ → '홈 화면에 추가'",
  ],
};

const isIos = () => {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
};

/**
 * 홈 화면에 추가 도움말: a small 📲 button in the top bar that blinks until it has been opened once, and a sheet with
 * the taps for this phone. Chrome-family browsers also get their own install sheet from the button; inside KakaoTalk ·
 * Instagram the way out to the real browser comes first, and the page that opens there (?install=1) shows the guide
 * at once. Opened as the installed app, it says so instead. Hidden once installed, and on computers with nothing to offer.
 */
export function InstallHelp() {
  const [ask, setAsk] = useState<InstallEvent | null>(null);
  const [way, setWay] = useState<Way | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true);
  /** arrived from "브라우저로 열기" but the phone opened the installed app: it is already on the home screen */
  const [already, setAlready] = useState(false);
  /** iPhone Safari: the share button sits in the toolbar right under the page */
  const [safariBar, setSafariBar] = useState(false);

  useEffect(() => {
    // installable on Android browsers that want a service worker (it stores nothing; see public/sw.js)
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;

    // ?install=1 is read once and taken off the address, so a reload or a shared link doesn't reopen the guide
    const q = new URLSearchParams(window.location.search);
    const arrived = q.get(ARRIVE) === "1";
    if (arrived) {
      q.delete(ARRIVE);
      const rest = q.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
    }
    if (installed) {
      if (arrived) setAlready(true);
      return;
    }
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
    const done = () => {
      setOpen(false);
      setWay(null);
    };
    window.addEventListener("appinstalled", done);

    const inApp = inAppBrowser();
    const ios = isIos();
    const ua = navigator.userAgent;
    // KakaoTalk opens the real browser on both phones (Safari on iPhone); other Android in-app browsers hand off to Chrome
    if (inApp === "kakao") setWay(ios ? "inapp-open-ios" : "inapp-open");
    else if (inApp) setWay(inApp === "ios" ? "inapp" : "inapp-open");
    else if (ios) {
      setWay("ios");
      setSafariBar(/iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS|NAVER|Whale/i.test(ua));
    }
    // Android without Chrome's own sheet (삼성 인터넷, 파이어폭스…): the menu path, until the sheet turns up
    else if (isMobile()) setWay((w) => w ?? "android");

    // Came here to add it: the guide opens by itself (and Chrome's install button appears in it when ready)
    if (arrived && !inApp && (ios || isMobile())) open1();
    return () => {
      window.removeEventListener("nyang-installable", take);
      window.removeEventListener("appinstalled", done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function open1() {
    setOpen(true);
    setSeen(true);
    try {
      localStorage.setItem(SEEN, "1");
    } catch {
      /* storage unavailable */
    }
  }

  /** Off to the real browser, which opens the guide on arrival. */
  const leave = () => {
    const u = new URL(window.location.href);
    u.searchParams.set(ARRIVE, "1");
    openExternally(u.toString());
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

  if (already)
    return (
      <BottomSheet open title="🐾 이미 홈 화면에 계신다냥" onClose={() => setAlready(false)}>
        <div className="flex items-center gap-3 rounded-2xl border border-peach/25 bg-peach/5 p-3.5">
          <Nyang mood="happy" size={44} className="shrink-0" />
          <p className="text-[13.5px] leading-relaxed">
            지금 보는 이 화면이 <b className="text-peach">홈 화면에 모신 냥신 앱</b>이다냥. 다음부턴 홈 화면의 냥신 아이콘을 누르면 바로 열린다냥.
          </p>
        </div>
        <button onClick={() => setAlready(false)} className="btn-primary mt-5 w-full py-3.5 text-[15px]">
          좋다냥 🐾
        </button>
      </BottomSheet>
    );
  if (!way) return null;
  // Chrome's sheet can be taken back after a refusal: then the hand-done Android steps.
  const steps = STEPS[way === "sheet" && !ask ? "android" : way];
  return (
    <>
      <button
        onClick={open1}
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
        {(way === "inapp-open" || way === "inapp-open-ios") && (
          <button onClick={leave} className="btn-primary mt-5 w-full py-3.5 text-[15px]">
            {way === "inapp-open-ios" ? "🧭 사파리로 열기" : "🌐 브라우저로 열기"}
          </button>
        )}
        {safariBar ? (
          // The sheet sits right on top of Safari's bottom toolbar: point at the share button under it.
          <div className="mt-5 flex flex-col items-center text-center">
            <p className="text-[13.5px] font-bold text-peach">바로 아래 가운데 공유 버튼 ⬆️ 을 눌러라냥</p>
            <span className="bob mt-1 text-[26px] leading-none" aria-hidden>
              👇
            </span>
          </div>
        ) : (
          <p className="mt-4 text-center text-[12px] text-muted">이 안내는 위쪽 📲 버튼을 누르면 언제든 다시 볼 수 있다냥</p>
        )}
      </BottomSheet>
    </>
  );
}
