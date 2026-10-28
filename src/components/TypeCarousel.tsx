"use client";

import { useEffect, useRef } from "react";

/** The 16 연애 팔자 (names mirror engine/content/free TYPES). */
const TYPES = [
  { emoji: "🚂", name: "풀악셀 폭주기관차", tagline: "사랑도 싸움도 브레이크가 없는 직진러" },
  { emoji: "☀️", name: "직진 태양 장군", tagline: "주는 사랑에 거침없는 든든한 리더" },
  { emoji: "🛳️", name: "사랑 폭격 후 잠수함", tagline: "고백은 1등, 싸움 나면 잠수도 1등" },
  { emoji: "🏄", name: "마이웨이 직진 서퍼", tagline: "흐름 타며 사랑하는 쿨한 낭만파" },
  { emoji: "📡", name: "츤데레 질투 레이더", tagline: "티는 안 내는데 다 보고 있는 사람" },
  { emoji: "🛠️", name: "무뚝뚝 행동파 해결사", tagline: "말보다 행동, 고민보다 해결" },
  { emoji: "💣", name: "속으로 타는 시한폭탄", tagline: "괜찮다던 그 말, 사실 카운트다운" },
  { emoji: "🐈", name: "마이웨이 고양이", tagline: "다가갈 때도 내 맘, 거리 둘 때도 내 맘" },
  { emoji: "🌋", name: "기다리다 터지는 감성 화산", tagline: "참고 참다 한 번에 쏟아내는 진심" },
  { emoji: "🗼", name: "다정한 등대지기", tagline: "기다려주고, 비춰주고, 솔직한 사람" },
  { emoji: "🌙", name: "새벽 3시 감성 소설가", tagline: "답장 하나로 장편 연재하는 감성파" },
  { emoji: "🐼", name: "느긋한 힐링 판다", tagline: "같이 있으면 편해지는 평화주의자" },
  { emoji: "🦔", name: "겉바속촉 고슴도치", tagline: "가시를 세운 건 사실 겁나서야" },
  { emoji: "⚖️", name: "팩트폭격 철벽 변호사", tagline: "감정보다 논리, 그런데 의리는 최고" },
  { emoji: "🐌", name: "속앓이 장인 달팽이", tagline: "다 느끼는데 아무 말 못 하는 중" },
  { emoji: "🐻‍❄️", name: "철벽 북극곰", tagline: "다가오면 한 발 뒤로, 그래도 속은 따뜻" },
];

const SPEED = 32; // px per second
const RESUME_MS = 2200;

/**
 * Cards drift sideways on their own; a finger (or mouse drag) takes over and the strip follows it, then the drift
 * resumes. Three copies of the list let it loop seamlessly in both directions.
 */
export function TypeCarousel() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const set = () => el.scrollWidth / 3; // one copy of the list
    let pos = set(); // float position we drive; the browser may round scrollLeft
    let lastSet = -1;
    let holdUntil = 0;
    let held = false;
    let visible = true;
    let raf = 0;
    let prev = performance.now();
    el.scrollLeft = pos;

    const wrap = () => {
      const w = set();
      if (el.scrollLeft >= w * 2) el.scrollLeft -= w;
      else if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
    };
    const tick = (now: number) => {
      const dt = Math.min(64, now - prev);
      prev = now;
      if (visible && !held && !reduce && now > holdUntil) {
        pos += (SPEED * dt) / 1000;
        const w = set();
        if (pos >= w * 2) pos -= w;
        el.scrollLeft = pos;
        lastSet = el.scrollLeft;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Anything that moved the strip other than us is the user: follow them, then pick up from where they left it.
    const onScroll = () => {
      if (Math.abs(el.scrollLeft - lastSet) > 1.5) {
        holdUntil = performance.now() + RESUME_MS;
        wrap();
        pos = el.scrollLeft;
      }
    };
    const grab = () => {
      held = true;
      holdUntil = performance.now() + RESUME_MS;
    };
    const release = () => {
      held = false;
      holdUntil = performance.now() + RESUME_MS;
      pos = el.scrollLeft;
    };

    // Mouse drag on PC (touch scrolls natively).
    let dragX: number | null = null;
    const down = (e: PointerEvent) => {
      grab();
      if (e.pointerType === "mouse") {
        dragX = e.clientX;
        el.setPointerCapture(e.pointerId);
      }
    };
    const move = (e: PointerEvent) => {
      if (dragX === null) return;
      el.scrollLeft -= e.clientX - dragX;
      dragX = e.clientX;
      wrap();
    };
    const up = () => {
      dragX = null;
      release();
    };

    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("touchstart", grab, { passive: true });
    el.addEventListener("touchend", release, { passive: true });
    el.addEventListener("wheel", grab, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("touchstart", grab);
      el.removeEventListener("touchend", release);
      el.removeEventListener("wheel", grab);
    };
  }, []);

  return (
    <div
      ref={box}
      className="no-scrollbar -mx-5 flex cursor-grab select-none gap-3 overflow-x-auto px-5 pb-1 active:cursor-grabbing"
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
      }}
      aria-label="16가지 연애 팔자"
    >
      {[0, 1, 2].flatMap((copy) =>
        TYPES.map((t) => (
          <div key={`${copy}-${t.name}`} aria-hidden={copy !== 1} className="w-[158px] shrink-0 rounded-2xl border border-line bg-surface p-4">
            <div className="text-[34px] leading-none">{t.emoji}</div>
            <div className="mt-2.5 text-[15px] font-bold leading-snug">{t.name}</div>
            <div className="mt-1 text-[12.5px] leading-snug text-muted">{t.tagline}</div>
          </div>
        )),
      )}
    </div>
  );
}
