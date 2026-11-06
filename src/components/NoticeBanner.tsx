"use client";

import { useEffect, useState } from "react";
import { useLive } from "@/lib/liveSettings";

const TONE = {
  info: { icon: "📢", cls: "border-violet/50 bg-[#1b1420]" },
  event: { icon: "🎉", cls: "border-pink/55 bg-[#2a1214]" },
  warn: { icon: "🛠️", cls: "border-peach/60 bg-[#2a1a0f]" },
} as const;

const key = (t: string) => `nyang-banner-${t.length}-${t.slice(0, 24)}`;

/** 관리자 공지·이벤트 배너, top of the home. Closing it hides this text for the rest of the visit. */
export function NoticeBanner() {
  const { banner } = useLive();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    if (!banner) return;
    try {
      setHidden(sessionStorage.getItem(key(banner.text)) === "1");
    } catch {
      setHidden(false);
    }
  }, [banner]);
  if (!banner || hidden) return null;
  const t = TONE[banner.tone];
  const close = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(key(banner.text), "1");
    } catch {}
  };
  const body = (
    <>
      <span aria-hidden>{t.icon}</span> {banner.text}
      {banner.link && <span className="ml-1 font-semibold text-peach underline underline-offset-2">자세히</span>}
    </>
  );
  return (
    <div className={`fade-up relative z-30 mb-2 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed text-ink shadow-[0_8px_24px_-10px_rgba(0,0,0,0.9)] ${t.cls}`} role="status">
      {banner.link ? (
        <a href={banner.link} target={banner.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="min-w-0 flex-1">
          {body}
        </a>
      ) : (
        <p className="min-w-0 flex-1">{body}</p>
      )}
      <button onClick={close} className="-mr-1 shrink-0 px-1 text-muted" aria-label="공지 닫기">
        ✕
      </button>
    </div>
  );
}
