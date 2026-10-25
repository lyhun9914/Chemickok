"use client";

import { forwardRef } from "react";
import type { TeaserReport } from "@/models/types";
import { Nyang } from "./Nyang";

/** The shareable "Type Card" — rendered to PNG by html-to-image (9:16-ish for IG stories). */
export const ShareCard = forwardRef<HTMLDivElement, { teaser: TeaserReport; myName: string; partnerName: string }>(
  function ShareCard({ teaser, myName, partnerName }, ref) {
    return (
      <div
        ref={ref}
        className="relative mx-auto aspect-[9/14] w-full max-w-[320px] overflow-hidden rounded-[28px] p-6 text-white"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, #ff5fa2 0%, transparent 55%), radial-gradient(120% 80% at 100% 100%, #9b6bff 0%, transparent 55%), #1b1234",
          fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif",
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2">
            <Nyang mood="smug" size={30} />
            <p className="text-xs font-semibold tracking-wide text-white/80">냥신이 본 연애 점괘</p>
          </div>
          <p className="mt-6 text-sm text-white/80">{myName}의 연애 유형</p>
          <div className="mt-3 text-[72px] leading-none">{teaser.myType.emoji}</div>
          <p className="mt-3 text-[26px] font-extrabold leading-tight">{teaser.myType.name}</p>
          <p className="mt-2 text-sm text-white/85">{teaser.myType.tagline}</p>
          <p className="mt-3 text-xs font-bold tracking-[0.3em] text-white/70">
            {[teaser.myType.code, teaser.match.myMbti, teaser.saju && `${teaser.saju.dayMaster.hangul}${teaser.saju.dayMaster.hanja}일간`]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="mt-auto rounded-2xl bg-black/25 p-4 backdrop-blur">
            {teaser.couple ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-white/75">
                    {myName} 💞 {partnerName}
                  </span>
                  <span className="text-3xl font-black">{teaser.couple.matchScore}%</span>
                </div>
                <p className="mt-1 text-[13px] font-semibold leading-snug">{teaser.couple.coupleTitle}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-white/75">💘 나와 찰떡인 사람</p>
                <p className="mt-1 text-[15px] font-bold leading-snug">
                  {teaser.match.bestType.emoji} {teaser.match.bestType.name}
                </p>
                <p className="mt-1 text-[12px] text-white/80">
                  {[teaser.match.bestMbti.join("·"), teaser.match.goodAnimals.slice(0, 2).map((a) => `${a}띠`).join("·")]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
              </>
            )}
          </div>
          <p className="mt-3 text-center text-[10px] text-white/60">🐾 냥신한테 나도 점 보기</p>
        </div>
      </div>
    );
  },
);
