/** A 부적 (paper talisman) hanging from a red thread, swaying a little. Decorative only. */
export function Talisman({ className = "" }: { className?: string }) {
  return (
    <div className={`talisman pointer-events-none ${className}`} aria-hidden>
      <svg viewBox="0 0 40 120" width="34" height="102">
        <line x1="20" y1="0" x2="20" y2="18" stroke="#8e1f17" strokeWidth="1.5" />
        <rect x="4" y="18" width="32" height="98" rx="1.5" fill="#d9b25a" />
        <rect x="7" y="21" width="26" height="92" fill="none" stroke="#9e2a1c" strokeWidth="1.2" />
        <g stroke="#a3261b" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M20 30 v14 M13 37 h14" />
          <path d="M12 54 q8 -6 16 0 q-8 6 -16 0 z" />
          <path d="M20 64 v26 M14 72 l12 6 M26 72 l-12 6" />
          <circle cx="20" cy="100" r="5" />
        </g>
      </svg>
    </div>
  );
}
