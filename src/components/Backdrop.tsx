"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The room around the 480px column. "gate": a fortune-teller's entrance at night (eaves, lanterns, 신대 flags,
 * stone wall, fog). "inside": the consultation room (병풍, 오방천, lattice window, altar with candles and incense).
 * Layers drift with scroll (--sy) and the camera creeps toward the altar as the interview goes on (--progress,
 * set by the Questionnaire). Entering plays a pair of 한옥 doors that shut and slide open.
 */
export type Scene = "gate" | "inside";

export const DOOR_EVENT = "nyang:door";
export const FLARE_EVENT = "nyang:flare";
/** Make the candles flare once (an answer was given). */
export const flareCandles = () => window.dispatchEvent(new Event(FLARE_EVENT));
/** Close the doors, then run `next` (the screen change) once they meet. */
export function enterThroughDoors(next: () => void) {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return next();
  window.dispatchEvent(new Event(DOOR_EVENT));
  setTimeout(next, 520);
}

export function Backdrop({ scene }: { scene: Scene }) {
  const root = useRef<HTMLDivElement>(null);
  const prev = useRef<Scene>(scene);
  const [door, setDoor] = useState<"idle" | "closing" | "opening">("idle");

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      // Capped: long result pages would otherwise drag the scenery off screen.
      raf = requestAnimationFrame(() => root.current?.style.setProperty("--sy", String(Math.min(window.scrollY, 420))));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const onDoor = () => setDoor("closing");
    window.addEventListener(DOOR_EVENT, onDoor);
    let flareT: ReturnType<typeof setTimeout>;
    const onFlare = () => {
      const el = root.current;
      if (!el) return;
      el.classList.remove("flare");
      void el.offsetWidth; // restart the animation
      el.classList.add("flare");
      clearTimeout(flareT);
      flareT = setTimeout(() => el.classList.remove("flare"), 1000);
    };
    window.addEventListener(FLARE_EVENT, onFlare);
    return () => {
      window.removeEventListener(FLARE_EVENT, onFlare);
      clearTimeout(flareT);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(DOOR_EVENT, onDoor);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (prev.current !== scene && scene === "inside" && door === "closing") {
      setDoor("opening");
      const t = setTimeout(() => setDoor("idle"), 1700);
      prev.current = scene;
      return () => clearTimeout(t);
    }
    prev.current = scene;
    if (scene === "gate") document.documentElement.style.setProperty("--progress", "0");
  }, [scene, door]);

  return (
    <>
      <div ref={root} className={`backdrop scene-${scene}`} aria-hidden>
        {scene === "gate" ? <Gate /> : <Inside />}
        <div className="atmos-layer">
          <div className="incense" />
          <div className="incense" />
          <div className="incense" />
          <div className="candle-glow" />
        </div>
      </div>
      {door !== "idle" && <Doors state={door} />}
    </>
  );
}

// ───────────── 입구 ─────────────

function Gate() {
  return (
    <>
      <div className="moon" />
      <div className="doorway-light" />
      <div className="layer-far">
        <StoneWall side="left" />
        <StoneWall side="right" />
      </div>
      <div className="pillar pillar-l" />
      <div className="pillar pillar-r" />
      <div className="layer-mid">
        <div className="sindae">
          <Sindae />
        </div>
        <div className="signboard">
          <span className="sign-big">占</span>
          <span className="sign-text">냥신 점집</span>
          <span className="sign-small">사주 · 궁합 · 신점</span>
        </div>
      </div>
      <div className="layer-near">
        <Eaves />
        <div className="lantern lantern-l">
          <Lantern char="占" />
        </div>
        <div className="lantern lantern-r">
          <Lantern char="神" />
        </div>
      </div>
      <div className="fog" />
    </>
  );
}

function Lantern({ char }: { char: string }) {
  return (
    <svg viewBox="0 0 80 170" width="80" height="170">
      <defs>
        <radialGradient id={`lg-${char}`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ff9a5a" />
          <stop offset="45%" stopColor="#c9301f" />
          <stop offset="100%" stopColor="#5a0e0a" />
        </radialGradient>
      </defs>
      <line x1="40" y1="0" x2="40" y2="26" stroke="#3a2416" strokeWidth="2" />
      <rect x="27" y="24" width="26" height="9" rx="2" fill="#1d120b" />
      <rect x="9" y="32" width="62" height="96" rx="28" fill={`url(#lg-${char})`} />
      <g stroke="rgba(60,10,6,0.55)" strokeWidth="1.2" fill="none">
        <path d="M12 52 Q40 46 68 52" />
        <path d="M10 80 Q40 76 70 80" />
        <path d="M12 108 Q40 114 68 108" />
      </g>
      <text x="40" y="92" textAnchor="middle" fontSize="30" fill="#f6d27e" fontFamily="'Song Myung', serif">
        {char}
      </text>
      <rect x="27" y="127" width="26" height="8" rx="2" fill="#1d120b" />
      <g stroke="#a3261b" strokeWidth="1.6">
        <line x1="34" y1="135" x2="33" y2="165" />
        <line x1="40" y1="135" x2="40" y2="168" />
        <line x1="46" y1="135" x2="47" y2="165" />
      </g>
    </svg>
  );
}

/** 기와 처마: curved eave with tile ends (막새) and painted rafter ends (단청). */
function Eaves() {
  const W = 1700;
  const y = (x: number) => 70 + 46 * Math.sin((Math.PI * x) / W); // sags in the middle, lifts at the ends
  const ends = Array.from({ length: 62 }, (_, i) => 14 + i * ((W - 28) / 61));
  return (
    <svg className="eaves" viewBox={`0 0 ${W} 190`} preserveAspectRatio="xMidYMin slice">
      <defs>
        <pattern id="tiles" width="26" height="190" patternUnits="userSpaceOnUse">
          <rect width="26" height="190" fill="#120c0a" />
          <rect x="4" width="14" height="190" fill="#1c1411" />
          <rect x="8" width="3" height="190" fill="#2a1f19" opacity="0.6" />
        </pattern>
      </defs>
      <path d={`M0 0 H${W} V${y(W) - 30} ${ends.map((x) => `L${x} ${y(x) - 8}`).reverse().join(" ")} L0 ${y(0) - 30} Z`} fill="url(#tiles)" />
      {/* rafters */}
      {ends.map((x) => (
        <g key={`r${x}`}>
          <rect x={x - 4} y={y(x)} width="8" height="26" fill="#2b1a10" />
          <circle cx={x} cy={y(x) + 26} r="4.2" fill="#2f5a43" />
          <circle cx={x} cy={y(x) + 26} r="1.8" fill="#8e2a1e" />
        </g>
      ))}
      {ends.map((x) => (
        <circle key={`t${x}`} cx={x} cy={y(x) - 2} r="10" fill="#1a1310" stroke="#3a2c22" strokeWidth="2" />
      ))}
      <path d={ends.map((x, i) => `${i ? "L" : "M"}${x} ${y(x) + 40}`).join(" ")} stroke="#3a2416" strokeWidth="10" fill="none" />
    </svg>
  );
}

/** 신대: bamboo pole with white and red cloth strips. */
function Sindae() {
  return (
    <svg viewBox="0 0 120 420" width="120" height="420">
      <line x1="60" y1="20" x2="60" y2="420" stroke="#3d4a2a" strokeWidth="6" />
      {[90, 170, 250, 330].map((y) => (
        <line key={y} x1="56" y1={y} x2="64" y2={y} stroke="#26301a" strokeWidth="3" />
      ))}
      <g className="cloth">
        <path d="M60 30 C40 60 30 110 22 170 L34 172 C40 120 50 70 62 40 Z" fill="#d8d0bf" opacity="0.85" />
        <path d="M60 32 C80 70 92 120 98 190 L86 190 C80 130 70 80 58 44 Z" fill="#a8261c" opacity="0.9" />
        <path d="M60 34 C56 80 50 140 46 210 L56 210 C60 150 62 90 64 40 Z" fill="#e8e1d2" opacity="0.7" />
      </g>
    </svg>
  );
}

function StoneWall({ side }: { side: "left" | "right" }) {
  const stones: { x: number; y: number; rx: number; ry: number }[] = [];
  let seed = side === "left" ? 7 : 13;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let row = 0; row < 5; row++) {
    for (let x = row % 2 ? 0 : 30; x < 720; x += 58 + rnd() * 18) {
      stones.push({ x, y: 40 + row * 30 + rnd() * 6, rx: 26 + rnd() * 10, ry: 14 + rnd() * 4 });
    }
  }
  return (
    <svg className={`wall wall-${side}`} viewBox="0 0 720 200" preserveAspectRatio="none">
      <rect x="0" y="40" width="720" height="160" fill="#0f0b09" />
      {stones.map((s, i) => (
        <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill="#1c1613" stroke="#0a0706" strokeWidth="3" />
      ))}
      <path d="M0 34 H720 V48 H0 Z" fill="#17110e" />
      {Array.from({ length: 36 }, (_, i) => (
        <circle key={i} cx={10 + i * 20} cy="34" r="8" fill="#1d1612" stroke="#2c221b" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// ───────────── 점집 안 ─────────────

function Inside() {
  return (
    <div className="dolly">
      <div className="wall-room" />
      <div className="beam" />
      <div className="layer-far">
        <div className="lattice">
          <Lattice />
        </div>
        <div className="scroll-painting">
          <ShrineScroll />
        </div>
        <div className="screen-fold">
          <FoldingScreen />
        </div>
      </div>
      <div className="layer-mid">
        <div className="obang obang-l">
          {OBANG.map((c, i) => (
            <span key={c} style={{ background: c, height: 150 + ((i * 37) % 90), animationDelay: `${-i * 0.7}s` }} />
          ))}
        </div>
        <div className="obang obang-r">
          {[...OBANG].reverse().map((c, i) => (
            <span key={c} style={{ background: c, height: 140 + ((i * 53) % 100), animationDelay: `${-i * 0.9}s` }} />
          ))}
        </div>
      </div>
      <div className="altar">
        <div className="altar-top" />
        <Candle className="cd-1" />
        <Candle className="cd-2" tall />
        <Candle className="cd-3" tall />
        <Candle className="cd-4" />
        <div className="censer">
          <Censer />
          <span className="smoke" />
          <span className="smoke smoke-2" />
          <span className="smoke smoke-3" />
        </div>
        <div className="bells">
          <Bells />
        </div>
      </div>
    </div>
  );
}

const OBANG = ["#7a1f1a", "#1f3560", "#8a6d1f", "#b9b0a0", "#2e5a3a"];

function Candle({ className, tall = false }: { className: string; tall?: boolean }) {
  return (
    <div className={`candle ${className} ${tall ? "candle-tall" : ""}`}>
      <span className="flame" />
      <span className="halo" />
      <span className="wax" />
    </div>
  );
}

function Censer() {
  return (
    <svg viewBox="0 0 90 70" width="90" height="70">
      <line x1="38" y1="0" x2="40" y2="30" stroke="#5a3a24" strokeWidth="2" />
      <line x1="45" y1="0" x2="45" y2="30" stroke="#5a3a24" strokeWidth="2" />
      <line x1="52" y1="2" x2="50" y2="30" stroke="#5a3a24" strokeWidth="2" />
      <circle cx="38" cy="1" r="1.6" fill="#ff8a3a" />
      <circle cx="45" cy="0.5" r="1.6" fill="#ff8a3a" />
      <circle cx="52" cy="2" r="1.6" fill="#ff8a3a" />
      <path d="M10 30 H80 Q78 58 45 60 Q12 58 10 30 Z" fill="#7a5a2a" />
      <path d="M10 30 H80" stroke="#c9a25a" strokeWidth="3" />
      <rect x="28" y="60" width="34" height="8" rx="2" fill="#4a3418" />
    </svg>
  );
}

function Bells() {
  return (
    <svg viewBox="0 0 70 110" width="70" height="110">
      <line x1="35" y1="0" x2="35" y2="40" stroke="#6b4a24" strokeWidth="4" />
      {[
        [20, 52],
        [35, 46],
        [50, 52],
        [26, 70],
        [44, 70],
        [35, 88],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9" fill="#a8823a" />
          <circle cx={x - 3} cy={y - 3} r="3" fill="#e3c27a" opacity="0.7" />
          <line x1={x - 5} y1={y + 3} x2={x + 5} y2={y + 3} stroke="#4a3418" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

function Lattice() {
  return (
    <svg viewBox="0 0 220 280" width="220" height="280">
      <rect width="220" height="280" fill="#1f2228" />
      <rect width="220" height="280" fill="url(#moonlight)" />
      <defs>
        <radialGradient id="moonlight" cx="70%" cy="25%" r="80%">
          <stop offset="0%" stopColor="rgba(170,190,220,0.35)" />
          <stop offset="100%" stopColor="rgba(20,22,28,0)" />
        </radialGradient>
      </defs>
      <g stroke="#120c08" strokeWidth="5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`v${i}`} x1={i * 36.6} y1="0" x2={i * 36.6} y2="280" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`h${i}`} x1="0" y1={i * 40} x2="220" y2={i * 40} />
        ))}
      </g>
      <rect x="0" y="0" width="220" height="280" fill="none" stroke="#2a170c" strokeWidth="14" />
    </svg>
  );
}

/** A faded 무신도-style hanging scroll: a robed figure in red and blue, mostly shadow. */
function ShrineScroll() {
  return (
    <svg viewBox="0 0 150 320" width="150" height="320">
      <rect x="6" y="0" width="138" height="10" rx="3" fill="#2a170c" />
      <rect x="12" y="10" width="126" height="290" fill="#3a2c1c" />
      <rect x="20" y="18" width="110" height="274" fill="#4a3a26" opacity="0.7" />
      <g opacity="0.55">
        <circle cx="75" cy="78" r="18" fill="#c9a27a" />
        <path d="M58 60 h34 l-4 -14 h-26 z" fill="#1a1410" />
        <path d="M42 270 L52 110 Q75 92 98 110 L108 270 Z" fill="#7a1f1a" />
        <path d="M62 112 L75 200 L88 112" stroke="#1f3560" strokeWidth="10" fill="none" />
        <path d="M40 150 Q30 190 46 210" stroke="#c9a25a" strokeWidth="4" fill="none" />
      </g>
      <rect x="6" y="300" width="138" height="12" rx="4" fill="#2a170c" />
    </svg>
  );
}

function FoldingScreen() {
  const panels = 8;
  const w = 130;
  return (
    <svg viewBox={`0 0 ${panels * w} 440`} preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: panels }, (_, i) => (
        <g key={i} transform={`translate(${i * w} 0)`}>
          <rect width={w} height="440" fill={i % 2 ? "#1b130e" : "#1f1610"} />
          <rect x="8" y="8" width={w - 16} height="424" fill="none" stroke="#5c4428" strokeWidth="3" />
          <rect x="14" y="14" width={w - 28} height="412" fill="none" stroke="#3a2a18" strokeWidth="1" />
        </g>
      ))}
      {/* ink mountains running across the panels, a red sun and a white moon (일월오봉도 in shadow) */}
      <path
        d="M0 330 L90 220 L160 300 L260 160 L360 290 L470 120 L590 290 L690 170 L790 300 L880 210 L1000 320 L1040 300 L1040 440 L0 440 Z"
        fill="#16100c"
        stroke="#3a2a1a"
        strokeWidth="2"
      />
      <circle cx="250" cy="90" r="30" fill="#7a1f1a" opacity="0.7" />
      <circle cx="800" cy="90" r="28" fill="#c8bfae" opacity="0.35" />
      <path d="M0 380 Q130 360 260 385 T520 380 T780 385 T1040 378" stroke="#2a3a44" strokeWidth="6" fill="none" opacity="0.6" />
    </svg>
  );
}

// ───────────── 문 ─────────────

function Doors({ state }: { state: "closing" | "opening" }) {
  return (
    <div className={`doors doors-${state}`} aria-hidden>
      <div className="door door-l">
        <span className="ring" />
      </div>
      <div className="door door-r">
        <span className="ring" />
      </div>
      <div className="door-seam" />
    </div>
  );
}
