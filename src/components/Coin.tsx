import { useId } from "react";

/**
 * 엽전 — the coin 냥 is counted in: a brass disc with a square hole. Drawn rather than the 🪙 emoji, which Windows 10
 * and older Androids can't show. Sized to the surrounding text (1em).
 */
export function Coin({ className = "" }: { className?: string }) {
  const id = useId().replace(/[^\w]/g, "");
  return (
    <svg viewBox="0 0 24 24" className={`inline-block h-[1em] w-[1em] shrink-0 align-[-0.15em] ${className}`} aria-hidden data-coin>
      <defs>
        <radialGradient id={`${id}g`} cx="34%" cy="28%" r="78%">
          <stop offset="0" stopColor="#fdeebf" />
          <stop offset="0.5" stopColor="#e3b354" />
          <stop offset="1" stopColor="#94661f" />
        </radialGradient>
        <mask id={`${id}m`}>
          <rect width="24" height="24" fill="#fff" />
          <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="0.5" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${id}m)`}>
        <circle cx="12" cy="12" r="11" fill={`url(#${id}g)`} stroke="#6b4312" strokeWidth="1" />
        <circle cx="12" cy="12" r="8.4" fill="none" stroke="#8a5a1c" strokeWidth="0.8" opacity="0.65" />
        <rect x="8.3" y="8.3" width="7.4" height="7.4" rx="0.7" fill="none" stroke="#734a14" strokeWidth="1" />
      </g>
    </svg>
  );
}
