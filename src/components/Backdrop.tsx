"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The room around the 480px column. "gate": a fortune-teller's house at night (기와 eaves, plastered walls in
 * lantern light, 신대 flags, a bare tree, stone base, fog). "inside": the consultation room (일월오봉도 병풍,
 * 오방천, moonlit lattice window, 무신도 scroll, an altar with candles, offerings and incense).
 * Layers drift with scroll (--sy); the camera creeps toward the altar as the interview goes on (--progress, set
 * by the Questionnaire). Entering plays a pair of 한옥 doors that shut and slide open. Every so often the candles
 * nearly go out and a shadow crosses the wall.
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
    // Phones skip scroll parallax: restyling the whole scene on every scroll frame is what made them stutter.
    const coarse = window.matchMedia?.("(max-width: 760px), (pointer: coarse)").matches;
    if (!coarse) window.addEventListener("scroll", onScroll, { passive: true });
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
        <Particles kind={scene === "gate" ? "embers" : "dust"} />
        <div className="atmos-layer">
          <div className="incense" />
          <div className="incense" />
          <div className="incense" />
        </div>
      </div>
      {door !== "idle" && <Doors state={door} />}
    </>
  );
}

// ───────────── 떠다니는 것들 (불티 · 먼지) ─────────────

/** Embers rising from the lanterns, or dust motes turning in candlelight. One small canvas, ~40 particles. */
function Particles({ kind }: { kind: "embers" | "dust" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const phone = window.matchMedia?.("(max-width: 760px), (pointer: coarse)").matches;
    let w = 0;
    let h = 0;
    const dpr = phone ? 1 : Math.min(2, window.devicePixelRatio || 1);
    // Phones fire resize whenever the address bar slides; reallocating the canvas then blanks it for a frame.
    // Only resize when the width changes or the height grows past what we have.
    const resize = () => {
      const nw = cv.clientWidth;
      const nh = cv.clientHeight;
      if (nw === w && nh <= h) return;
      w = nw;
      h = Math.max(nh, h);
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // One glow sprite drawn once and stamped per particle (no gradient objects per frame).
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const sc = sprite.getContext("2d")!;
    const g = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, kind === "embers" ? "rgba(255,180,90,1)" : "rgba(255,228,190,1)");
    g.addColorStop(1, "rgba(255,140,60,0)");
    sc.fillStyle = g;
    sc.fillRect(0, 0, 32, 32);

    const N = phone ? 14 : 40;
    const spawn = (init: boolean) => ({
      x: Math.random() * w,
      y: init ? Math.random() * h : kind === "embers" ? h + 10 : Math.random() * h,
      r: kind === "embers" ? 0.6 + Math.random() * 1.6 : 0.5 + Math.random() * 1.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: kind === "embers" ? -(0.25 + Math.random() * 0.6) : (Math.random() - 0.5) * 0.12,
      life: Math.random() * Math.PI * 2,
    });
    const ps = Array.from({ length: N }, () => spawn(true));
    // Phones: 30fps is plenty for slow drifting specks and halves the work.
    const frameMs = phone ? 33 : 16;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < frameMs) return;
      const step = Math.min(3, (t - last) / 16.7 || 1);
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.life += 0.02 * step;
        p.x += (p.vx + Math.sin(p.life * 0.7) * 0.18) * step;
        p.y += p.vy * step;
        if (p.y < -10 || p.x < -10 || p.x > w + 10 || (kind === "dust" && p.y > h + 10)) Object.assign(p, spawn(false));
        ctx.globalAlpha = kind === "embers" ? 0.35 + 0.45 * Math.abs(Math.sin(p.life * 2.3)) : 0.12 + 0.18 * Math.abs(Math.sin(p.life));
        const s = p.r * 8;
        ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
      }
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", start);
    };
  }, [kind]);
  return <canvas ref={ref} className="particles" />;
}

// ───────────── 입구 ─────────────

const STARS = Array.from({ length: 70 }, (_, i) => {
  const x = (i * 197) % 100;
  const y = (i * 61) % 45;
  const o = 0.2 + ((i * 37) % 60) / 100;
  return `${x}vw ${y}vh 0 ${i % 7 === 0 ? 1 : 0}px rgba(230,220,200,${o.toFixed(2)})`;
}).join(",");

function Gate() {
  return (
    <>
      <div className="sky">
        <span className="stars" style={{ boxShadow: STARS }} />
        <div className="moon" />
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
      </div>
      <div className="layer-far">
        <FarRoofs />
      </div>
      <div className="facade facade-l">
        <Facade />
      </div>
      <div className="facade facade-r">
        <Facade />
      </div>
      <div className="pillar pillar-l" />
      <div className="pillar pillar-r" />
      <div className="doorway-light" />
      <div className="threshold" />
      <div className="layer-mid">
        <div className="lantern-cast cast-l" />
        <div className="lantern-cast cast-r" />
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
        <div className="branch">
          <Branch />
        </div>
      </div>
      <div className="fog fog-1" />
      <div className="fog fog-2" />
    </>
  );
}

/** Distant rooftops and a ridge line, blurred by night air. */
function FarRoofs() {
  return (
    <svg className="far-roofs" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice">
      <path d="M0 170 Q200 90 420 140 T820 110 T1240 150 T1600 100 V300 H0 Z" fill="#0b0a0e" />
      <path d="M60 230 q90 -40 180 0 v70 h-180 Z M300 240 q70 -30 140 0 v60 h-140 Z M1180 235 q90 -38 180 0 v65 h-180 Z M1400 245 q60 -26 120 0 v55 h-120 Z" fill="#0d0b0c" />
    </svg>
  );
}

/** 한옥 wall beside the door: plaster panels framed in dark timber, on a stone base (기단). */
function Facade() {
  return (
    <>
      <div className="plaster">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="stone-base" />
    </>
  );
}

function Lantern({ char }: { char: string }) {
  return (
    <svg viewBox="0 0 90 190" width="90" height="190">
      <defs>
        <radialGradient id={`lg-${char}`} cx="50%" cy="48%" r="62%">
          <stop offset="0%" stopColor="#ffd28a" />
          <stop offset="28%" stopColor="#ff7a3a" />
          <stop offset="62%" stopColor="#b8261a" />
          <stop offset="100%" stopColor="#4a0a07" />
        </radialGradient>
        <linearGradient id={`lr-${char}`} x1="0" x2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
          <stop offset="30%" stopColor="rgba(0,0,0,0)" />
          <stop offset="75%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
        </linearGradient>
      </defs>
      <line x1="45" y1="0" x2="45" y2="28" stroke="#2a1a10" strokeWidth="2" />
      <path d="M30 26 h30 l4 10 h-38 z" fill="#1a110b" />
      <rect x="8" y="36" width="74" height="104" rx="34" fill={`url(#lg-${char})`} />
      <rect x="8" y="36" width="74" height="104" rx="34" fill={`url(#lr-${char})`} />
      <g stroke="rgba(70,12,6,0.55)" strokeWidth="1.3" fill="none">
        {[50, 64, 78, 92, 106, 120].map((y) => (
          <path key={y} d={`M${12 + Math.abs(y - 88) * 0.25} ${y} Q45 ${y + (y > 88 ? 5 : -5)} ${78 - Math.abs(y - 88) * 0.25} ${y}`} />
        ))}
      </g>
      <text x="45" y="100" textAnchor="middle" fontSize="32" fill="#2a0a06" opacity="0.85" fontFamily="'Song Myung', serif">
        {char}
      </text>
      <path d="M26 140 h38 l-4 10 h-30 z" fill="#1a110b" />
      <g stroke="#b32a1e" strokeWidth="1.4">
        {[36, 40, 45, 50, 54].map((x, i) => (
          <line key={x} x1={x} y1="150" x2={x + (i - 2) * 0.6} y2={178 + (i % 2) * 6} />
        ))}
      </g>
      <circle cx="45" cy="152" r="3" fill="#c9a25a" />
    </svg>
  );
}

/** 기와 처마 with shaded round tiles, moonlit edges, 단청 under the eave. */
function Eaves() {
  const W = 1800;
  const y = (x: number) => 78 + 52 * Math.sin((Math.PI * x) / W);
  const n = 70;
  const ends = Array.from({ length: n }, (_, i) => 12 + i * ((W - 24) / (n - 1)));
  return (
    <svg className="eaves" viewBox={`0 0 ${W} 220`} preserveAspectRatio="xMidYMin slice">
      <defs>
        <linearGradient id="tileRound" x1="0" x2="1">
          <stop offset="0%" stopColor="#0a0808" />
          <stop offset="45%" stopColor="#2d2a2c" />
          <stop offset="60%" stopColor="#3b3739" />
          <stop offset="100%" stopColor="#0c0a0a" />
        </linearGradient>
        <pattern id="tiles2" width={(W - 24) / (n - 1)} height="220" patternUnits="userSpaceOnUse" x="0">
          <rect width="30" height="220" fill="#100d0d" />
          <rect x="6" width="14" height="220" fill="url(#tileRound)" />
        </pattern>
        <linearGradient id="roofShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(150,160,190,0.18)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
        </linearGradient>
        <pattern id="dancheong" width="40" height="18" patternUnits="userSpaceOnUse">
          <rect width="40" height="18" fill="#1f3b30" />
          <rect x="0" y="0" width="40" height="4" fill="#5a1a14" />
          <circle cx="20" cy="11" r="5" fill="#2e5a4a" stroke="#b9a27a" strokeWidth="1" />
          <circle cx="20" cy="11" r="2" fill="#8e2a1e" />
          <rect x="0" y="15" width="40" height="3" fill="#0f1c18" />
        </pattern>
      </defs>
      {/* underside of the eave (soffit) with 단청, then rafters */}
      <path d={`M0 ${y(0) + 10} ${ends.map((x) => `L${x} ${y(x) + 10}`).join(" ")} L${W} ${y(W) + 10} L${W} ${y(W) + 48} ${ends.map((x) => `L${x} ${y(x) + 48}`).reverse().join(" ")} L0 ${y(0) + 48} Z`} fill="url(#dancheong)" opacity="0.55" />
      {ends.map((x) => (
        <g key={`r${x}`}>
          <rect x={x - 5} y={y(x) + 2} width="10" height="30" fill="#24160d" />
          <circle cx={x} cy={y(x) + 32} r="5" fill="#2f5a43" />
          <circle cx={x} cy={y(x) + 32} r="2.4" fill="#a3261b" />
        </g>
      ))}
      <path d={`M0 0 H${W} V${y(W) - 30} ${ends.map((x) => `L${x} ${y(x) - 6}`).reverse().join(" ")} L0 ${y(0) - 30} Z`} fill="url(#tiles2)" />
      <path d={`M0 0 H${W} V${y(W) - 30} ${ends.map((x) => `L${x} ${y(x) - 6}`).reverse().join(" ")} L0 ${y(0) - 30} Z`} fill="url(#roofShade)" />
      {/* 막새 (tile ends), moonlit on top */}
      {ends.map((x) => (
        <g key={`t${x}`}>
          <circle cx={x} cy={y(x) - 4} r="11" fill="#1a1617" stroke="#0a0808" strokeWidth="2" />
          <circle cx={x} cy={y(x) - 4} r="6" fill="none" stroke="#3b3638" strokeWidth="1.5" />
          <path d={`M${x - 9} ${y(x) - 9} a11 11 0 0 1 18 0`} stroke="rgba(190,200,225,0.35)" strokeWidth="1.6" fill="none" />
        </g>
      ))}
      {/* the beam the doors hang from */}
      <path d={ends.map((x, i) => `${i ? "L" : "M"}${x} ${y(x) + 60}`).join(" ")} stroke="#2a1a0f" strokeWidth="16" fill="none" />
      <path d={ends.map((x, i) => `${i ? "L" : "M"}${x} ${y(x) + 54}`).join(" ")} stroke="rgba(255,170,90,0.12)" strokeWidth="2" fill="none" />
    </svg>
  );
}

/** 신대: bamboo pole with white and red cloth strips. */
function Sindae() {
  return (
    <svg viewBox="0 0 140 470" width="140" height="470">
      <defs>
        <linearGradient id="bamboo" x1="0" x2="1">
          <stop offset="0%" stopColor="#1d2414" />
          <stop offset="50%" stopColor="#4a5a30" />
          <stop offset="100%" stopColor="#1a2010" />
        </linearGradient>
      </defs>
      <rect x="66" y="20" width="8" height="450" fill="url(#bamboo)" />
      {[100, 190, 280, 370].map((y) => (
        <rect key={y} x="64" y={y} width="12" height="4" fill="#2a3318" />
      ))}
      <g className="cloth">
        <path d="M70 34 C48 70 36 130 26 200 L40 203 C46 140 58 80 72 46 Z" fill="#d8d0bf" opacity="0.9" />
        <path d="M70 36 C94 80 108 140 114 220 L100 220 C94 150 82 92 68 50 Z" fill="#a8261c" opacity="0.92" />
        <path d="M70 38 C66 90 60 160 56 240 L67 240 C70 170 72 100 74 44 Z" fill="#ece5d6" opacity="0.75" />
        <path d="M70 40 C80 100 88 170 90 260 L80 258 C78 180 74 110 70 50 Z" fill="#7a1f1a" opacity="0.7" />
      </g>
    </svg>
  );
}

/** A bare branch reaching in from the corner. */
function Branch() {
  return (
    <svg viewBox="0 0 420 260" width="290" height="180">
      <g stroke="#060505" strokeLinecap="round" fill="none">
        <path d="M-10 40 C80 60 150 50 230 90 S340 150 400 140" strokeWidth="9" />
        <path d="M120 58 C140 20 170 10 200 -10" strokeWidth="5" />
        <path d="M200 80 C220 130 210 170 230 220" strokeWidth="4" />
        <path d="M290 118 C300 90 330 70 360 66" strokeWidth="3" />
        <path d="M330 140 C340 170 330 200 350 230" strokeWidth="2.5" />
        <path d="M60 50 C50 90 70 120 60 160" strokeWidth="3" />
        <path d="M160 70 C180 100 170 120 190 140" strokeWidth="2" />
      </g>
    </svg>
  );
}

// ───────────── 점집 안 ─────────────

function Inside() {
  return (
    <div className="dolly">
      <div className="room-wall" />
      <div className="room-frame" />
      <div className="ceiling" />
      <div className="layer-far">
        <div className="moonbeam" />
        <div className="lattice">
          <Lattice />
        </div>
        <div className="scroll-painting">
          <ShrineScroll />
        </div>
        <div className="screen-fold">
          <FoldingScreen />
        </div>
        <div className="passing-shadow" />
      </div>
      <div className="layer-mid">
        <div className="obang obang-l">
          {OBANG.map((c, i) => (
            <span key={c} style={{ ["--c" as string]: c, height: 170 + ((i * 37) % 90), animationDelay: `${-i * 0.7}s` }} />
          ))}
        </div>
        <div className="obang obang-r">
          {[...OBANG].reverse().map((c, i) => (
            <span key={c} style={{ ["--c" as string]: c, height: 160 + ((i * 53) % 100), animationDelay: `${-i * 0.9}s` }} />
          ))}
        </div>
      </div>
      <div className="candlelight" />
      <div className="altar">
        <div className="altar-cloth" />
        <div className="altar-drape" />
        <Offerings />
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

const OBANG = ["#8a2219", "#22406e", "#9a7a22", "#c9c0ae", "#2f6243"];

function Candle({ className, tall = false }: { className: string; tall?: boolean }) {
  return (
    <div className={`candle ${className} ${tall ? "candle-tall" : ""}`}>
      <span className="halo" />
      <span className="flame">
        <i />
      </span>
      <span className="wick" />
      <span className="wax">
        <i className="drip d1" />
        <i className="drip d2" />
      </span>
      <span className="holder" />
    </div>
  );
}

/** 제기 with fruit, a bowl of 정화수, rice with 엽전. */
function Offerings() {
  return (
    <>
      <svg className="offer offer-l" viewBox="0 0 150 90" width="150" height="90">
        <path d="M30 60 h60 l-8 16 h-44 z" fill="#3a1d10" />
        <rect x="52" y="76" width="16" height="12" fill="#2a140b" />
        <circle cx="45" cy="50" r="12" fill="#8e1f17" />
        <circle cx="68" cy="48" r="12" fill="#a3261b" />
        <circle cx="56" cy="32" r="11" fill="#7a1a14" />
        <circle cx="41" cy="46" r="3" fill="rgba(255,200,150,0.35)" />
        <circle cx="64" cy="44" r="3" fill="rgba(255,200,150,0.35)" />
        <path d="M100 66 q20 -14 40 0 l-4 14 h-32 z" fill="#e9e2d2" />
        <path d="M104 66 q16 -6 32 0" stroke="rgba(150,180,200,0.6)" strokeWidth="2" fill="none" />
      </svg>
      <svg className="offer offer-r" viewBox="0 0 150 90" width="150" height="90">
        <path d="M20 64 q30 -22 60 0 l-6 16 h-48 z" fill="#d9cfbf" />
        <path d="M26 62 q24 -16 48 0" fill="#efe8da" />
        <circle cx="42" cy="56" r="5" fill="none" stroke="#b8893a" strokeWidth="2.5" />
        <rect x="40.5" y="54.5" width="3" height="3" fill="#2a1a10" />
        <circle cx="56" cy="54" r="5" fill="none" stroke="#b8893a" strokeWidth="2.5" />
        <rect x="54.5" y="52.5" width="3" height="3" fill="#2a1a10" />
        <path d="M95 60 h44 l-6 14 h-32 z" fill="#3a1d10" />
        <ellipse cx="108" cy="48" rx="11" ry="13" fill="#b89a3a" />
        <ellipse cx="127" cy="50" rx="10" ry="12" fill="#a8892e" />
        <ellipse cx="117" cy="34" rx="9" ry="11" fill="#c2a444" />
      </svg>
    </>
  );
}

function Censer() {
  return (
    <svg viewBox="0 0 100 80" width="100" height="80">
      <defs>
        <linearGradient id="brass" x1="0" x2="1">
          <stop offset="0%" stopColor="#4a3418" />
          <stop offset="40%" stopColor="#c9a25a" />
          <stop offset="65%" stopColor="#8a6a30" />
          <stop offset="100%" stopColor="#3a2810" />
        </linearGradient>
      </defs>
      {[42, 50, 58].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={4 + i} x2={x + (i - 1) * 2} y2="36" stroke="#5a3a24" strokeWidth="2" />
          <circle cx={x} cy={4 + i} r="1.8" fill="#ff8a3a" className="ember" />
        </g>
      ))}
      <path d="M10 36 H90 Q88 66 50 68 Q12 66 10 36 Z" fill="url(#brass)" />
      <ellipse cx="50" cy="36" rx="40" ry="5" fill="#2a1d10" stroke="#d9b26a" strokeWidth="1.5" />
      <path d="M22 68 l-4 10 M78 68 l4 10 M50 68 v10" stroke="#5a4020" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Bells() {
  return (
    <svg viewBox="0 0 80 130" width="80" height="130">
      <defs>
        <radialGradient id="bell" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f2d48a" />
          <stop offset="50%" stopColor="#a8823a" />
          <stop offset="100%" stopColor="#4a3418" />
        </radialGradient>
      </defs>
      <rect x="37" y="0" width="6" height="52" rx="2" fill="#5a3a1c" />
      <path d="M40 46 q-20 6 -26 14 M40 46 q20 6 26 14" stroke="#a3261b" strokeWidth="2" fill="none" />
      {[
        [22, 64],
        [40, 58],
        [58, 64],
        [30, 82],
        [50, 82],
        [40, 100],
        [22, 98],
        [58, 98],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9.5" fill="url(#bell)" />
          <path d={`M${x - 6} ${y + 3} h12`} stroke="#2a1a0a" strokeWidth="1.6" />
        </g>
      ))}
      <path d="M40 108 v20 M36 110 l-4 18 M44 110 l4 18" stroke="#a3261b" strokeWidth="2" />
    </svg>
  );
}

function Lattice() {
  return (
    <svg viewBox="0 0 240 300" width="240" height="300">
      <defs>
        <radialGradient id="moonlight" cx="72%" cy="22%" r="85%">
          <stop offset="0%" stopColor="rgba(190,205,235,0.55)" />
          <stop offset="60%" stopColor="rgba(60,70,90,0.25)" />
          <stop offset="100%" stopColor="rgba(20,22,28,0.1)" />
        </radialGradient>
      </defs>
      <rect width="240" height="300" fill="#16181d" />
      <rect width="240" height="300" fill="url(#moonlight)" />
      {/* a branch's shadow on the paper */}
      <path d="M240 40 C180 60 150 50 110 90 S60 140 20 150 M150 62 C140 40 120 30 100 20 M120 84 C130 110 120 130 132 150" stroke="rgba(10,10,14,0.45)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <g stroke="#100a06" strokeWidth="5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="300" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`h${i}`} x1="0" y1={i * 43} x2="240" y2={i * 43} />
        ))}
      </g>
      <rect x="0" y="0" width="240" height="300" fill="none" stroke="#24140a" strokeWidth="16" />
    </svg>
  );
}

/** A faded 무신도 hanging scroll: robed figure with a fan and bells, mostly lost to soot. */
function ShrineScroll() {
  return (
    <svg viewBox="0 0 170 360" width="170" height="360">
      <defs>
        <linearGradient id="scrollPaper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a4630" />
          <stop offset="100%" stopColor="#3a2c1c" />
        </linearGradient>
      </defs>
      <rect x="4" y="0" width="162" height="12" rx="4" fill="#24140a" />
      <rect x="10" y="12" width="150" height="330" fill="#5c1d14" />
      <rect x="20" y="22" width="130" height="310" fill="url(#scrollPaper)" />
      <g opacity="0.7">
        <path d="M60 58 h50 l-6 -18 h-38 z" fill="#14100c" />
        <rect x="62" y="56" width="46" height="5" fill="#8e1f17" />
        <ellipse cx="85" cy="86" rx="17" ry="20" fill="#c9a27a" />
        <path d="M76 84 q4 3 8 0 M88 84 q4 3 8 0" stroke="#2a1a10" strokeWidth="2" fill="none" />
        <path d="M80 98 q5 3 10 0" stroke="#7a1f1a" strokeWidth="2" fill="none" />
        <path d="M40 320 L56 118 Q85 98 114 118 L130 320 Z" fill="#8e2a1e" />
        <path d="M70 120 L85 230 L100 120" stroke="#22406e" strokeWidth="12" fill="none" />
        <path d="M56 118 L48 320 M114 118 L122 320" stroke="#c9a25a" strokeWidth="3" />
        <path d="M30 170 q30 -30 40 10 q-20 10 -40 -10 z" fill="#c9a25a" opacity="0.8" />
        <circle cx="128" cy="170" r="6" fill="#c9a25a" />
        <circle cx="136" cy="180" r="6" fill="#c9a25a" />
        <circle cx="124" cy="184" r="6" fill="#c9a25a" />
      </g>
      <rect x="20" y="22" width="130" height="310" fill="rgba(10,6,4,0.35)" />
      <rect x="4" y="340" width="162" height="14" rx="5" fill="#24140a" />
    </svg>
  );
}

/** 일월오봉도 folding screen: five peaks, sun and moon, pines, waterfalls and waves — faded by smoke. */
function FoldingScreen() {
  const panels = 8;
  const w = 140;
  const W = panels * w;
  return (
    <svg viewBox={`0 0 ${W} 480`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="peak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f5a52" />
          <stop offset="70%" stopColor="#1b3532" />
          <stop offset="100%" stopColor="#12201f" />
        </linearGradient>
        <linearGradient id="peakSide" x1="0" x2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
          <stop offset="50%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id="screenSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3424" />
          <stop offset="100%" stopColor="#2a2418" />
        </linearGradient>
        <pattern id="brocade" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#3a1410" />
          <path d="M8 2 l6 6 -6 6 -6 -6 z" fill="none" stroke="#8a6a30" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height="480" fill="url(#screenSky)" />
      {/* five peaks */}
      {[
        [560, 70, 230],
        [300, 150, 190],
        [820, 150, 190],
        [110, 230, 160],
        [1010, 230, 160],
      ].map(([cx, top, half], i) => (
        <g key={i}>
          <path d={`M${cx - half} 400 Q${cx - half * 0.35} ${top + 40} ${cx} ${top} Q${cx + half * 0.35} ${top + 40} ${cx + half} 400 Z`} fill="url(#peak)" />
          <path d={`M${cx - half} 400 Q${cx - half * 0.35} ${top + 40} ${cx} ${top} L${cx} 400 Z`} fill="url(#peakSide)" />
          <path d={`M${cx - 6} ${top + 30} Q${cx} ${top + 120} ${cx - 4} ${top + 200}`} stroke="rgba(230,235,230,0.35)" strokeWidth="4" fill="none" />
        </g>
      ))}
      <circle cx="300" cy="92" r="34" fill="#a3261b" />
      <circle cx="820" cy="92" r="32" fill="#e3ddcf" opacity="0.75" />
      {/* pines */}
      {[60, 1060].map((x) => (
        <g key={x}>
          <path d={`M${x} 470 C${x - 6} 400 ${x + 10} 340 ${x} 290`} stroke="#6a2a1a" strokeWidth="10" fill="none" />
          {[300, 330, 360, 390].map((y, i) => (
            <ellipse key={y} cx={x + (i % 2 ? 26 : -26)} cy={y} rx="34" ry="11" fill="#1f3a2c" />
          ))}
        </g>
      ))}
      {/* waves */}
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M${i * 82 - 10} 440 q20 -30 41 0 q20 -30 41 0`} stroke="#3a5a6a" strokeWidth="5" fill="none" opacity="0.8" />
      ))}
      <rect y="420" width={W} height="60" fill="rgba(20,40,50,0.4)" />
      {/* panel frames */}
      {Array.from({ length: panels }, (_, i) => (
        <g key={i} transform={`translate(${i * w} 0)`}>
          <rect x="0" y="0" width={w} height="480" fill="none" stroke="url(#brocade)" strokeWidth="18" />
          <rect x="9" y="9" width={w - 18} height="462" fill="none" stroke="#b8893a" strokeWidth="1.5" opacity="0.6" />
          <rect x={w - 2} y="0" width="4" height="480" fill="rgba(0,0,0,0.6)" />
          <rect x="0" y="0" width={w / 2} height="480" fill={i % 2 ? "rgba(0,0,0,0.18)" : "rgba(255,220,170,0.03)"} />
        </g>
      ))}
      {/* soot and age */}
      <rect width={W} height="480" fill="rgba(12,8,6,0.42)" />
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
