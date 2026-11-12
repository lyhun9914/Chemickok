"use client";

import { useEffect, useState } from "react";
import { albumApi } from "@/services/apiClient";
import { useAppStore } from "@/store/useAppStore";

/**
 * 고양이 도감 모으기, as a daily quest in the home top bar: 🗂️ with how many cats are in (12/60) and a red dot while
 * today's cat is still waiting. Guests see the icon too; the sheet asks them to log in.
 */
export function AlbumQuest({ onOpen, refresh }: { onOpen: () => void; refresh?: unknown }) {
  const me = useAppStore((s) => s.me);
  const [st, setSt] = useState<{ count: number; size: number; ready: boolean } | null>(null);
  useEffect(() => {
    if (!me) return setSt(null);
    let off = false;
    albumApi
      .get()
      .then((v) => !off && setSt({ count: v.cards.length, size: v.size, ready: !v.drawnToday && v.cards.length < v.size }))
      .catch(() => !off && setSt(null));
    return () => {
      off = true;
    };
  }, [me, refresh]);
  const label = st ? `고양이 도감 ${st.count}/${st.size}${st.ready ? " · 오늘 고양이 뽑기 가능" : ""}` : "고양이 도감 모으기";
  return (
    <button
      onClick={onOpen}
      aria-label={label}
      title={label}
      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-surface/85 text-[16px] transition active:scale-90 ${st?.ready ? "border-peach/70" : "border-line"}`}
    >
      <span aria-hidden>🗂️</span>
      {st?.ready && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-pink ring-2 ring-[#120a07]" aria-hidden />}
      {st && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-violet px-1 text-[9px] font-bold leading-[13px] text-white" aria-hidden>
          {st.count}/{st.size}
        </span>
      )}
    </button>
  );
}
