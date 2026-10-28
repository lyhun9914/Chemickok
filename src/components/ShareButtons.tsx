"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { handoffUrl, inAppBrowser, openExternally } from "@/lib/handoff";
import { drawStoryImage } from "@/lib/storyImage";
import type { TeaserReport } from "@/models/types";
import { isMobile, shareService, siteUrl, type ShareOutcome } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { ShareCard } from "./ShareCard";

const OUTCOME_MSG: Partial<Record<ShareOutcome, string>> = {
  copied: "링크를 복사했다냥! 붙여넣어서 보내라냥 📋",
  unsupported: "이 브라우저는 인스타 공유 창을 못 연다냥. 크롬이나 사파리에서 다시 눌러라냥",
};

/** Set by page.tsx when the result was handed over from another device / in-app browser to share on Instagram. */
export const SHARE_INSTA_FLAG = "nyang-then-insta";

interface Props {
  teaser: TeaserReport;
  myName: string;
  partnerName: string;
  toast: (m: string) => void;
}

export function ShareButtons({ teaser, myName, partnerName, toast }: Props) {
  const input = useAppStore((s) => s.input);
  const section = useRef<HTMLElement>(null);
  const story = useRef<Blob | null>(null);
  const [ready, setReady] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [iosGuide, setIosGuide] = useState<string | null>(null);
  const [beckon, setBeckon] = useState(false);

  // Draw the story image ahead of time: phones open the share sheet only straight from the tap.
  useEffect(() => {
    shareService.prepareKakao().catch(() => {});
    let alive = true;
    const t = setTimeout(() => {
      drawStoryImage(teaser, myName, partnerName)
        .then((b) => {
          if (!alive) return;
          story.current = b;
          setReady(true);
        })
        .catch(() => alive && setReady(true));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [teaser, myName, partnerName]);

  // Arrived here to share on Instagram (from a QR scan or out of an in-app browser): bring the button into view.
  useEffect(() => {
    let flagged = false;
    try {
      flagged = sessionStorage.getItem(SHARE_INSTA_FLAG) === "1";
      sessionStorage.removeItem(SHARE_INSTA_FLAG);
    } catch {
      /* storage blocked */
    }
    if (!flagged) return;
    const t = setTimeout(() => {
      section.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setBeckon(true);
      toast("이어서 왔다냥! 아래 '스토리에 점괘 걸기'를 누르면 바로 인스타로 간다냥");
    }, 1200);
    return () => clearTimeout(t);
  }, [toast]);

  const shareText = {
    title: `냥신이 본 내 연애 유형: ${teaser.myType.name} ${teaser.myType.emoji}`,
    description: teaser.couple
      ? `우리 궁합 ${teaser.couple.matchScore}점 - ${teaser.couple.coupleTitle} 😳 소름 돋게 잘 맞음. 너도 해 봐!`
      : `나랑 찰떡인 사람은 '${teaser.match.bestType.name}' 유형이래 😳 소름 돋게 잘 맞음. 너도 해 봐!`,
  };

  const report = (p: Promise<ShareOutcome>) =>
    p.then((o) => OUTCOME_MSG[o] && toast(OUTCOME_MSG[o]!)).catch(() => toast("공유에 실패했다냥. 다시 눌러라냥"));

  // Everything up to navigator.share runs synchronously inside the tap.
  const onInsta = () => {
    setBeckon(false);
    if (!isMobile()) {
      const url = handoffUrl(input, "insta");
      QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: "L", color: { dark: "#1a0f08", light: "#e9dcbd" } })
        .then(setQr)
        .catch(() => toast("QR을 만들지 못했다냥"));
      return;
    }
    if (inAppBrowser()) {
      const url = handoffUrl(input, "insta");
      if (!openExternally(url)) setIosGuide(url);
      return;
    }
    if (!story.current) {
      toast("점괘 카드를 그리는 중이다냥. 잠깐 뒤 다시 눌러라냥");
      return;
    }
    report(shareService.shareStory(story.current));
  };

  return (
    <section ref={section} className="mt-10">
      <h2 className="mb-1 text-[20px]">📜 이 점괘, 혼자 보기 아깝다냥</h2>
      <p className="mb-4 text-sm text-muted">친구 팔자도 궁금하지? 점괘 한 장 건네 봐라냥</p>
      <ShareCard teaser={teaser} myName={myName} partnerName={partnerName} />

      <div className="mt-5 space-y-3">
        <button
          onClick={() => report(shareService.shareKakao({ ...shareText, url: siteUrl() }))}
          className="share-plaque share-kakao w-full py-4 transition active:scale-[0.98]"
        >
          <span className="share-icon bg-[#fee500] text-[#191919]">💬</span>
          카카오톡으로 점괘 전하기
        </button>
        <button
          onClick={onInsta}
          disabled={isMobileSafe() && !ready}
          className={`share-plaque share-insta w-full py-4 transition active:scale-[0.98] disabled:opacity-60 ${beckon ? "glow" : ""}`}
        >
          <span className="share-icon bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">📸</span>
          {isMobileSafe() && !ready ? "점괘 카드 그리는 중…" : "인스타 스토리에 점괘 걸기"}
        </button>
        <p className="text-center text-[11px] text-muted">폰: 공유 창에서 Instagram → 스토리 · PC: QR을 폰으로 찍어 이어서 올리기</p>
      </div>

      {qr && (
        <Sheet onClose={() => setQr(null)}>
          <p className="font-ritual text-[20px]">폰으로 이어서 걸어라냥 📸</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            PC 인스타그램은 스토리를 못 올린다냥.
            <br />
            폰 카메라로 아래 QR을 찍으면 이 점괘가 그대로 열리고,
            <br />
            버튼 한 번이면 스토리로 간다냥.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="폰으로 이어 보기 QR" width={220} height={220} className="mx-auto mt-4 rounded-xl" />
        </Sheet>
      )}
      {iosGuide && (
        <Sheet onClose={() => setIosGuide(null)}>
          <p className="font-ritual text-[20px]">사파리에서 열어야 한다냥</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            이 앱 안에서는 인스타로 사진을 못 넘긴다냥.
            <br />
            링크를 복사해서 사파리 주소창에 붙여넣으면
            <br />
            점괘가 그대로 열린다냥.
          </p>
          <button
            onClick={() =>
              navigator.clipboard
                ?.writeText(iosGuide)
                .then(() => toast("복사했다냥! 사파리에 붙여넣어라냥"))
                .catch(() => toast("복사를 못 했다냥"))
            }
            className="btn-primary mt-4 w-full py-3"
          >
            🔗 링크 복사하기
          </button>
        </Sheet>
      )}
    </section>
  );
}

/** isMobile() reads navigator; safe during the first client render. */
const isMobileSafe = () => typeof navigator !== "undefined" && isMobile();

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div className="chip-pop w-full max-w-[480px] rounded-t-3xl border border-line bg-surface p-6 text-center sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {children}
        <button onClick={onClose} className="mt-4 w-full text-sm text-muted">
          닫기
        </button>
      </div>
    </div>
  );
}
