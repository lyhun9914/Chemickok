"use client";

import { useAppStore } from "@/store/useAppStore";
import { Say } from "./Nyang";
import { ShareButtons } from "./ShareButtons";
import { useToast } from "./Toast";

/** A share card handed over from another device (a reading reopened from 내 점괘함): just the card and the share buttons. */
export function StoryScreen() {
  const story = useAppStore((s) => s.story);
  const reset = useAppStore((s) => s.reset);
  const toast = useToast();
  if (!story) return null;
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
