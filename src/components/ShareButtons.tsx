"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { handoffUrl, inAppBrowser, openExternally } from "@/lib/handoff";
import { drawStoryImage } from "@/lib/storyImage";
import type { StoryCard } from "@/models/types";
import { isMobile, shareService, siteUrl, type ShareOutcome } from "@/services/shareService";
import { useAppStore } from "@/store/useAppStore";
import { ShareCard } from "./ShareCard";

const OUTCOME_MSG: Partial<Record<ShareOutcome, string>> = {
  copied: "링크를 복사했다냥! 붙여넣어서 보내라냥 📋",
  unsupported: "이 브라우저는 인스타 공유 창을 못 연다냥. 크롬이나 사파리에서 다시 눌러라냥",
};

interface Props {
  teaser: StoryCard;
  myName: string;
  partnerName: string;
  toast: (m: string) => void;
  /** arrived from a QR / in-app handoff to post on Instagram: cover the screen, one tap anywhere shares */
  tapToShare?: boolean;
}

export function ShareButtons({ teaser, myName, partnerName, toast, tapToShare = false }: Props) {
  const input = useAppStore((s) => s.input);
  const story = useRef<Blob | null>(null);
  const drawing = useRef<Promise<Blob | null> | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cover, setCover] = useState(tapToShare);
  const [qr, setQr] = useState<{ img: string; url: string } | null>(null);
  const [iosGuide, setIosGuide] = useState<string | null>(null);

  // Draw the story image ahead of time: phones open the share sheet only straight from the tap.
  useEffect(() => {
    shareService.prepareKakao().catch(() => {});
    let alive = true;
    let url: string | null = null;
    const t = setTimeout(
      () => {
        drawing.current = drawStoryImage(teaser, myName, partnerName)
          .then((b) => {
            if (alive) {
              story.current = b;
              url = URL.createObjectURL(b);
              setPreview(url);
            }
            return b;
          })
          .catch(() => null)
          .finally(() => alive && setReady(true));
      },
      tapToShare ? 0 : 400,
    );
    return () => {
      alive = false;
      clearTimeout(t);
      if (url) URL.revokeObjectURL(url);
    };
  }, [teaser, myName, partnerName, tapToShare]);

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
    if (!isMobile()) {
      const url = handoffUrl(input, { card: teaser, me: myName, partner: partnerName }, "insta");
      QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: "L", color: { dark: "#1a0f08", light: "#e9dcbd" } })
        .then((img) => setQr({ img, url }))
        .catch(() => toast("QR을 만들지 못했다냥"));
      return;
    }
    if (inAppBrowser()) {
      const url = handoffUrl(input, { card: teaser, me: myName, partner: partnerName }, "insta");
      if (!openExternally(url)) setIosGuide(url);
      return;
    }
    if (story.current) {
      report(shareService.shareStory(story.current));
      return;
    }
    // Tapped before the image was ready: Chrome keeps the tap valid for a few seconds, so finish drawing first.
    const pending = drawing.current;
    if (!pending) return toast("점괘 카드를 그리는 중이다냥. 잠깐 뒤 다시 눌러라냥");
    report(pending.then((b) => (b ? shareService.shareStory(b) : ("unsupported" as const))));
  };

  return (
    <section className="mt-10">
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
          className="share-plaque share-insta w-full py-4 transition active:scale-[0.98] disabled:opacity-60"
        >
          <span className="share-icon bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">📸</span>
          {isMobileSafe() && !ready ? "점괘 카드 그리는 중…" : "인스타 스토리에 점괘 걸기"}
        </button>
        <p className="text-center text-[12px] text-muted">폰: 공유 창에서 Instagram → 스토리 · PC: QR을 폰으로 찍어 이어서 올리기</p>
      </div>

      {cover && (
        <button
          onClick={() => {
            onInsta();
            setCover(false);
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/85 px-8 text-center"
          aria-label="인스타 스토리에 점괘 걸기"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="스토리에 올라갈 점괘" className="max-h-[58dvh] w-auto rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)]" />
          ) : (
            <span className="font-ritual text-lg text-muted">점괘 카드 그리는 중…</span>
          )}
          <span className="share-plaque share-insta glow w-full max-w-[320px] py-4">
            <span className="share-icon bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">📸</span>
            톡 치면 인스타 스토리로
          </span>
          <span className="text-xs leading-relaxed text-muted">
            화면 아무 데나 한 번 누르면 공유 창이 뜬다냥.
            <br />
            거기서 <b className="text-ink">Instagram → 스토리</b>를 고르면 끝이다냥.
          </span>
        </button>
      )}
      {qr && (
        <Sheet onClose={() => setQr(null)}>
          <p className="font-ritual text-[20px]">폰으로 이어서 걸어라냥 📸</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            PC 인스타그램은 스토리를 못 올린다냥.
            <br />
            폰 카메라로 아래 QR을 찍고 링크를 열면
            <br />
            화면 한 번 톡 치는 걸로 스토리에 올라간다냥.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.img} alt="폰으로 이어 보기 QR" width={240} height={240} className="mx-auto mt-4 rounded-xl" />
          <button
            data-handoff={qr.url}
            onClick={() =>
              navigator.clipboard
                ?.writeText(qr.url)
                .then(() => toast("링크 복사했다냥! 카톡 '나와의 채팅'으로 폰에 보내라냥"))
                .catch(() => toast("복사를 못 했다냥"))
            }
            className="mt-3 w-full rounded-2xl border border-line py-3 text-sm font-semibold"
          >
            📋 QR이 안 찍히면 링크 복사해서 폰으로 보내기
          </button>
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
