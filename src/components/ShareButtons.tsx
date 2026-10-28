"use client";

import { useEffect, useRef, useState } from "react";
import type { TeaserReport } from "@/models/types";
import { shareService, siteUrl, type ShareOutcome } from "@/services/shareService";
import { ShareCard } from "./ShareCard";

const OUTCOME_MSG: Record<ShareOutcome, string | null> = {
  shared: null,
  copied: "복사했어요! 붙여넣기 해서 공유해 주세요 📋",
  downloaded: "이미지를 저장했어요! 인스타 스토리에 올려보세요 📸",
  cancelled: null,
  storyCamera: "카드 이미지를 저장했어요! 인스타 스토리 화면이 열리면 방금 저장한 사진을 골라 주세요 📸",
  desktopImage: "카드 이미지를 저장했어요! PC 인스타그램은 스토리 올리기를 지원하지 않아서, 폰으로 옮겨 스토리에 올려 주세요 📸",
};

interface Props {
  teaser: TeaserReport;
  myName: string;
  partnerName: string;
  toast: (m: string) => void;
}

export function ShareButtons({ teaser, myName, partnerName, toast }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  // Pre-render the card image: phones only open the share sheet if it's called right in the tap, with the file ready.
  const cardBlob = useRef<Blob | null>(null);
  useEffect(() => {
    shareService.prepareKakao().catch(() => {});
    const t = setTimeout(() => {
      if (!cardRef.current) return;
      shareService
        .captureCard(cardRef.current)
        .then((b) => (cardBlob.current = b))
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const shareText = {
    title: `냥신이 본 내 연애 유형: ${teaser.myType.name} ${teaser.myType.emoji}`,
    description: teaser.couple
      ? `우리 궁합 ${teaser.couple.matchScore}% - ${teaser.couple.coupleTitle} 😳 소름 돋게 잘 맞음. 너도 해 봐!`
      : `나랑 찰떡인 사람은 '${teaser.match.bestType.name}' 유형이래 😳 소름 돋게 잘 맞음. 너도 해 봐!`,
  };

  const run = async (fn: () => Promise<ShareOutcome> | ShareOutcome) => {
    setBusy(true);
    try {
      const outcome = await fn();
      const m = OUTCOME_MSG[outcome];
      if (m) toast(m);
    } catch (e) {
      toast(e instanceof Error ? e.message : "공유에 실패했어요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-bold">📤 내 유형 카드 자랑하기</h2>
      <p className="mb-4 text-sm text-muted">친구들은 무슨 유형일까? 카드를 공유해 보세요</p>
      <ShareCard ref={cardRef} teaser={teaser} myName={myName} partnerName={partnerName} />

      <div className="mt-5 space-y-3">
        <button
          disabled={busy}
          onClick={() => run(() => shareService.shareKakao({ ...shareText, url: siteUrl() }))}
          className="w-full rounded-2xl bg-[#fee500] py-4 font-bold text-[#191919] transition active:scale-[0.98] disabled:opacity-50"
        >
          💬 카카오톡으로 내 결과 공유하기
        </button>
        <button
          disabled={busy}
          onClick={() =>
            run(() => {
              if (cardBlob.current) return shareService.shareImage(cardBlob.current);
              if (!cardRef.current) throw new Error("카드를 찾을 수 없어요");
              // Not rendered yet: render now (the share sheet may then be refused → story camera fallback).
              return shareService.captureCard(cardRef.current).then((b) => {
                cardBlob.current = b;
                return shareService.shareImage(b);
              });
            })
          }
          className="w-full rounded-2xl bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] py-4 font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          📸 인스타그램 스토리에 결과 공유하기
        </button>
        <p className="text-center text-[11px] text-muted">폰: 공유 창에서 Instagram → 스토리 · PC: 카드 이미지 저장</p>
      </div>
    </section>
  );
}
