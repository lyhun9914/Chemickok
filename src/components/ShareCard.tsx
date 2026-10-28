"use client";

import { forwardRef } from "react";
import type { StoryCard } from "@/models/types";
import { Nyang } from "./Nyang";

/** The type card shown above the share buttons (the Instagram image itself is drawn in lib/storyImage). */
export const ShareCard = forwardRef<HTMLDivElement, { teaser: StoryCard; myName: string; partnerName: string }>(
  function ShareCard({ teaser, myName, partnerName }, ref) {
    const ritual = "'Song Myung', 'Nanum Myeongjo', serif";
    const meta = [teaser.myType.code, teaser.match.myMbti, teaser.saju && `${teaser.saju.dayMaster.hangul}${teaser.saju.dayMaster.hanja}일간`]
      .filter(Boolean)
      .join(" · ");
    return (
      <div
        ref={ref}
        className="relative mx-auto aspect-[9/14] w-full max-w-[320px] overflow-hidden rounded-[22px] p-[10px]"
        style={{
          // 옻칠한 나무판 + 놋쇠 테두리 안에 누런 한지 점괘
          background: "linear-gradient(160deg, #3a1a0e, #140806 55%, #2a0d08)",
          boxShadow: "inset 0 0 0 1.5px rgba(201,162,90,0.7), 0 20px 50px -20px rgba(0,0,0,0.9)",
          fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif",
        }}
      >
        <div
          className="relative flex h-full flex-col overflow-hidden rounded-[14px] px-5 pb-4 pt-4"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 38%, rgba(255,190,110,0.28), transparent 70%), radial-gradient(ellipse at 50% 120%, rgba(90,20,10,0.55), transparent 60%), linear-gradient(180deg, #1c110c, #0e0807)",
            boxShadow: "inset 0 0 0 1px rgba(201,162,90,0.35), inset 0 0 40px rgba(0,0,0,0.8)",
            color: "#ecdfc4",
          }}
        >
          {/* corner talismans */}
          <span className="absolute left-2 top-2 text-[12px]" style={{ color: "#c9a25a", fontFamily: ritual }}>
            神
          </span>
          <span className="absolute right-2 top-2 text-[12px]" style={{ color: "#c9a25a", fontFamily: ritual }}>
            占
          </span>
          <div className="flex items-center justify-center gap-2">
            <Nyang mood="smug" size={26} />
            <p className="text-[12px] tracking-[0.35em]" style={{ color: "#c9a25a", fontFamily: ritual }}>
              냥신 점괘
            </p>
          </div>
          <p className="mt-4 text-center text-[12px]" style={{ color: "#a8977e" }}>
            {myName}의 연애 팔자
          </p>
          <div
            className="mx-auto mt-2 grid h-[92px] w-[92px] place-items-center rounded-full text-[54px] leading-none"
            style={{
              background: "radial-gradient(circle, rgba(255,180,90,0.25), rgba(60,15,8,0.6) 70%)",
              boxShadow: "0 0 0 2px rgba(201,162,90,0.6), 0 0 0 6px rgba(201,162,90,0.12), 0 0 30px rgba(230,120,40,0.45)",
            }}
          >
            {teaser.myType.emoji}
          </div>
          <p className="mt-3 text-center text-[25px] leading-tight" style={{ fontFamily: ritual, color: "#f3dfae", textShadow: "0 0 14px rgba(230,140,50,0.45)" }}>
            {teaser.myType.name}
          </p>
          <p className="mt-1.5 text-center text-[12.5px]" style={{ color: "#c8b79a" }}>
            “{teaser.myType.tagline}”
          </p>
          <p className="mt-2 text-center text-[11px] tracking-[0.25em]" style={{ color: "#8f7d63" }}>
            {meta}
          </p>

          <div
            className="relative mt-auto rounded-[6px] px-4 pb-4 pr-10 pt-3"
            style={{
              background: "linear-gradient(180deg, #e9dcbd, #d6c49c)",
              color: "#2a1a10",
              boxShadow: "inset 0 0 14px rgba(120,85,40,0.35)",
            }}
          >
            {teaser.couple ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: "#6b4a2a" }}>
                    {myName} · {partnerName} 궁합
                  </span>
                  <span className="text-[28px] leading-none" style={{ fontFamily: ritual, color: "#8e1f17" }}>
                    {teaser.couple.matchScore}점
                  </span>
                </div>
                <p className="mt-1 text-[13px] font-semibold leading-snug">{teaser.couple.coupleTitle}</p>
              </>
            ) : (
              <>
                <p className="text-[12px]" style={{ color: "#6b4a2a" }}>
                  냥신이 점지한 인연
                </p>
                <p className="mt-0.5 text-[15px] leading-snug" style={{ fontFamily: ritual }}>
                  {teaser.match.bestType.emoji} {teaser.match.bestType.name}
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: "#6b4a2a" }}>
                  {[teaser.match.bestMbti.join("·"), teaser.match.goodAnimals.slice(0, 2).map((a) => `${a}띠`).join("·")]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
              </>
            )}
            {/* 붉은 낙관 */}
            <span
              className="absolute -bottom-4 -right-2 grid h-11 w-11 rotate-[8deg] place-items-center rounded-[5px] text-[13px] leading-[1.05]"
              style={{ background: "#a3261b", color: "#f6dcc0", fontFamily: ritual, boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}
            >
              냥신
              <br />之印
            </span>
          </div>
          <p className="mt-3 text-center text-[11px] tracking-[0.2em]" style={{ color: "#8f7d63" }}>
            골목 끝 점집 · 냥신 점괘
          </p>
        </div>
      </div>
    );
  },
);
