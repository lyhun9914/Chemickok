"use client";

import { useEffect, useState } from "react";

/**
 * Tarot-style card: tap to flip and reveal. Once the turn is over it is drawn flat: a card left standing in 3D
 * (preserve-3d, a hidden face still pulsing behind it) flickered on phones whenever the page scrolled over it.
 */
export function FlipCard({
  flipped,
  onFlip,
  back,
  hint = "탭해서 카드 뒤집기",
}: {
  flipped: boolean;
  onFlip: () => void;
  back: React.ReactNode;
  hint?: string;
}) {
  // already turned when it first appears (a reopened reading, "한 번에 다 보기"): flat from the start
  const [settled, setSettled] = useState(flipped);
  useEffect(() => {
    if (!flipped) return setSettled(false);
    const t = setTimeout(() => setSettled(true), 850); // just past the 0.8s turn
    return () => clearTimeout(t);
  }, [flipped]);
  if (flipped && settled) {
    return (
      <div className="mx-auto block aspect-[3/4] w-full max-w-[260px] rounded-3xl border-2 border-pink/50 bg-chemi p-5" aria-label="뒤집힌 카드">
        {back}
      </div>
    );
  }
  return (
    <button
      onClick={onFlip}
      disabled={flipped}
      className="flip-card mx-auto block aspect-[3/4] w-full max-w-[260px]"
      aria-label={flipped ? "뒤집힌 카드" : hint}
    >
      <div className={`flip-inner ${flipped ? "is-flipped" : ""}`}>
        <div className="flip-face flex flex-col items-center justify-center rounded-3xl border-2 border-peach/40 bg-card-front">
          <div className="text-5xl">🐾</div>
          <p className="mt-3 text-xs tracking-[0.3em] text-peach">CHEMI CARD</p>
          <p className="glow mt-6 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">👆 {hint}</p>
        </div>
        <div className="flip-face flip-back rounded-3xl border-2 border-pink/50 bg-chemi p-5">
          {back}
        </div>
      </div>
    </button>
  );
}
