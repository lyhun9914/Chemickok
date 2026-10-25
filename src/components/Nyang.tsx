/** 냥신 — the cat fortune-teller mascot wearing a 갓. Pure SVG so it scales and exports in share cards. */

export type Mood = "smug" | "wow" | "happy" | "talk";

function Eyes({ mood }: { mood: Mood }) {
  const stroke = { stroke: "#2b1d16", strokeWidth: 3.2, strokeLinecap: "round" as const, fill: "none" };
  switch (mood) {
    case "wow":
      return (
        <g fill="#2b1d16">
          <circle cx="45" cy="74" r="6" />
          <circle cx="75" cy="74" r="6" />
          <circle cx="47" cy="72" r="2" fill="#fff" />
          <circle cx="77" cy="72" r="2" fill="#fff" />
        </g>
      );
    case "happy":
      return (
        <g {...stroke}>
          <path d="M38 76 Q45 68 52 76" />
          <path d="M68 76 Q75 68 82 76" />
        </g>
      );
    case "talk":
      return (
        <g fill="#2b1d16">
          <ellipse cx="45" cy="74" rx="4.5" ry="5.5" />
          <ellipse cx="75" cy="74" rx="4.5" ry="5.5" />
          <circle cx="46.5" cy="72" r="1.6" fill="#fff" />
          <circle cx="76.5" cy="72" r="1.6" fill="#fff" />
        </g>
      );
    default: // smug: half-closed
      return (
        <g {...stroke}>
          <path d="M38 73 L52 73" />
          <path d="M40 73 Q45 79 50 73" fill="#2b1d16" />
          <path d="M68 73 L82 73" />
          <path d="M70 73 Q75 79 80 73" fill="#2b1d16" />
        </g>
      );
  }
}

export function Nyang({ mood = "smug", size = 64, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-label="냥신" role="img">
      {/* ears */}
      <path d="M24 66 L30 30 L54 48 Z" fill="#f3dcc2" stroke="#2b1d16" strokeWidth="3" strokeLinejoin="round" />
      <path d="M96 66 L90 30 L66 48 Z" fill="#f3dcc2" stroke="#2b1d16" strokeWidth="3" strokeLinejoin="round" />
      <path d="M31 40 L35 54 L45 49 Z" fill="#ffb3c7" />
      <path d="M89 40 L85 54 L75 49 Z" fill="#ffb3c7" />
      {/* head */}
      <ellipse cx="60" cy="78" rx="40" ry="33" fill="#f3dcc2" stroke="#2b1d16" strokeWidth="3" />
      {/* forehead stripes */}
      <path d="M54 50 L56 58 M60 48 L60 57 M66 50 L64 58" stroke="#d9a877" strokeWidth="3" strokeLinecap="round" />
      {/* 갓: crown + brim */}
      <rect x="42" y="10" width="36" height="28" rx="9" fill="#1d1a24" />
      <rect x="42" y="30" width="36" height="5" fill="#ff5fa2" />
      <ellipse cx="60" cy="40" rx="52" ry="8" fill="#1d1a24" opacity="0.92" />
      <Eyes mood={mood} />
      {/* blush */}
      <ellipse cx="34" cy="86" rx="7" ry="4" fill="#ff8fab" opacity="0.6" />
      <ellipse cx="86" cy="86" rx="7" ry="4" fill="#ff8fab" opacity="0.6" />
      {/* nose + mouth */}
      <path d="M56 84 L64 84 L60 89 Z" fill="#ff7a9a" />
      {mood === "wow" || mood === "talk" ? (
        <ellipse cx="60" cy="96" rx="4" ry={mood === "wow" ? 5 : 3} fill="#2b1d16" />
      ) : (
        <path d="M52 92 Q56 97 60 92 Q64 97 68 92" stroke="#2b1d16" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      )}
      {/* whiskers */}
      <g stroke="#2b1d16" strokeWidth="1.8" strokeLinecap="round" opacity="0.75">
        <path d="M22 84 L8 80 M22 90 L8 92" />
        <path d="M98 84 L112 80 M98 90 L112 92" />
      </g>
    </svg>
  );
}

/** A speech line from 냥신. */
export function Say({
  children,
  mood = "talk",
  typing = false,
}: {
  children: React.ReactNode;
  mood?: Mood;
  typing?: boolean;
}) {
  return (
    <div className="fade-up flex items-end gap-2">
      <div className="shrink-0">
        <Nyang mood={mood} size={44} />
      </div>
      <div className="relative max-w-[82%] rounded-2xl rounded-bl-md bg-[#fff6ec] px-4 py-3 text-[15px] font-medium leading-relaxed text-[#2b1d16] shadow-sm">
        {typing ? (
          <span className="typing-dots" aria-label="냥신이 말하는 중">
            <i />
            <i />
            <i />
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/** Tarot-style card: tap to flip and reveal. */
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
