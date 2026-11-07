"use client";

import { useEffect, useState } from "react";
import { inAppBrowser, openExternally } from "@/lib/handoff";
import { BottomSheet } from "../BottomSheet";

/** How this browser installs the 관리자 app: its own install sheet, or the taps to do it by hand. */
type Way = "prompt" | "ios" | "inapp" | "manual";

const STEPS: Record<Exclude<Way, "prompt">, string[]> = {
  ios: ["사파리에서 이 관리자 화면을 연다", "아래 가운데 공유 버튼 ⬆️ 을 누른다", "'홈 화면에 추가' → 오른쪽 위 '추가'를 누르면 '냥신 관리자' 아이콘이 생긴다"],
  inapp: ["카카오톡 같은 앱 안에서는 설치할 수 없다", "아래 '브라우저로 열기'를 누른다 (아이폰은 ⋯ → 'Safari로 열기')", "브라우저에서 이 버튼을 다시 누른다"],
  manual: [
    "컴퓨터 크롬: 주소창 오른쪽 끝 설치 아이콘(모니터 모양)을 누른다. 안 보이면 오른쪽 위 ⋮ → '전송, 저장, 공유' → '페이지를 앱으로 설치'",
    "컴퓨터 엣지: 오른쪽 위 ⋯ → '앱' → '이 사이트를 앱으로 설치' / 휴대폰: 메뉴 ⋮ (삼성 인터넷은 아래 ≡) → '홈 화면에 추가' 또는 '앱 설치'",
    "설치 창에서 '설치'를 누르면 홈 화면·바탕화면에 '냥신 관리자'가 생긴다",
  ],
};

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/**
 * 📲 앱으로 설치: puts /admin on the phone's home screen or the computer's desktop as its own app ("냥신 관리자").
 * Chrome-family browsers get their own install sheet; Safari and the rest get the taps. Hidden inside the installed app.
 */
export function AdminInstall({ className = "" }: { className?: string }) {
  const [way, setWay] = useState<Way | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone) return;
    const take = () => window.__nyangInstall && setWay("prompt");
    const done = () => {
      setWay(null);
      setOpen(false);
    };
    if (inAppBrowser()) setWay("inapp");
    else if (isIos()) setWay("ios");
    else setWay("manual");
    take();
    window.addEventListener("nyang-installable", take);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("nyang-installable", take);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  if (!way) return null;
  const press = async () => {
    const ask = window.__nyangInstall;
    if (way === "prompt" && ask) {
      await ask.prompt();
      const { outcome } = await ask.userChoice;
      window.__nyangInstall = undefined;
      if (outcome === "accepted") setWay(null);
      else setWay("manual");
      return;
    }
    setNote(null);
    setOpen(true);
  };
  const steps = STEPS[way === "prompt" ? "manual" : way];

  return (
    <>
      <button onClick={press} className={`shrink-0 whitespace-nowrap rounded-full border border-peach/50 px-2.5 py-1 text-[12.5px] font-semibold text-peach ${className}`}>
        📲 앱 설치
      </button>
      <BottomSheet open={open} title="📲 관리자 화면을 앱으로 설치" onClose={() => setOpen(false)}>
        <p className="text-[13.5px] leading-relaxed text-muted">
          설치하면 홈 화면(컴퓨터는 바탕화면·작업 표시줄)에 <b className="text-peach">냥신 관리자</b> 아이콘이 생겨서, 주소를 칠 필요 없이 바로 열려요. 손님용 냥신 점괘 앱과는 따로 설치돼요.
        </p>
        <ol className="mt-4 space-y-2.5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.03] p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pink text-[12px] font-bold text-white">{i + 1}</span>
              <span className="text-[14px] leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
        {way === "inapp" && (
          <button
            onClick={() => {
              if (!openExternally(window.location.href)) setNote("이 앱에서는 직접 열 수 없어요. 오른쪽 위(또는 아래) ⋯ 메뉴에서 'Safari로 열기'를 눌러 주세요.");
            }}
            className="btn-primary mt-5 w-full py-3.5 text-[15px]"
          >
            🌐 브라우저로 열기
          </button>
        )}
        {note && <p className="mt-3 text-center text-[13px] text-pink">{note}</p>}
        <p className="mt-4 text-center text-[12px] leading-relaxed text-muted">
          크롬은 이 화면을 30초쯤 둘러본 뒤 다시 누르면 설치 창을 바로 띄워 주기도 해요. 설치한 앱에서도 처음 한 번은 관리자 키로 들어가야 해요.
        </p>
      </BottomSheet>
    </>
  );
}
