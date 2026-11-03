"use client";

import { useAppStore } from "@/store/useAppStore";
import { useBack } from "@/lib/back";
import { isFortuneCard } from "@/models/types";
import { Say } from "./Nyang";
import { ShareButtons } from "./ShareButtons";
import { ShareCard } from "./ShareCard";
import { useToast } from "./Toast";

/** A share card handed over from another device (a reading reopened from 내 점괘함): just the card and the share buttons. */
export function StoryScreen() {
  const story = useAppStore((s) => s.story);
  const reset = useAppStore((s) => s.reset);
  const toast = useToast();
  useBack(true, reset);
  if (!story) return null;
  if (story.friend) {
    // A friend opened a card sent over KakaoTalk: show what arrived, then the way in for their own.
    const love = !isFortuneCard(story.card);
    return (
      <main className="enter-dark flex flex-1 flex-col px-5 pb-10 pt-8">
        <Say mood="smug">{story.me || "친구"}의 점괘가 도착했다냥. 냥신이 직접 봐 준 거다냥 🕯️</Say>
        <div className="mt-5">
          <ShareCard teaser={story.card} myName={story.me} partnerName={story.partner} />
        </div>
        <button
          onClick={() => {
            const play = story.play;
            reset();
            // from a mini game: straight into the same game on the landing
            if (play) useAppStore.setState({ deepLink: { game: play } });
          }}
          className="btn-primary glow shine mt-7 w-full py-4 text-[17px]"
        >
          🔮 {story.play ? "나도 해 보기" : love ? "나도 내 연애 팔자 보기" : "나도 내 점괘 보기"}
        </button>
        <p className="mt-3 text-center text-[13px] text-muted">3분 면담 · 맛보기는 무료다냥</p>
      </main>
    );
  }
  return (
    <main className="enter-dark flex flex-1 flex-col px-5 pb-10 pt-8">
      <Say mood="smug">이어서 왔다냥. {story.me}의 점괘, 여기서 바로 걸어라냥.</Say>
      <ShareButtons teaser={story.card} myName={story.me} partnerName={story.partner} toast={toast.show} tapToShare={Boolean(story.insta)} />
      <button onClick={reset} className="mt-8 w-full rounded-2xl border border-line py-3.5 text-sm font-semibold text-muted">
        🕯️ 나도 점집 들어가 보기
      </button>
      {toast.node}
    </main>
  );
}
