"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

let locks = 0;
let startX = 0;
let startY = 0;

const onTouchStart = (e: TouchEvent) => {
  startX = e.touches[0]?.clientX ?? 0;
  startY = e.touches[0]?.clientY ?? 0;
};

/**
 * An up/down drag while an overlay is up goes nowhere unless it scrolls a box inside the overlay that can still move
 * that way. Without this the drag reached the browser: KakaoTalk's (and Chrome's) toolbar slid in and out, the screen
 * height changed with it, and the sheet jumped up and down under the finger.
 */
const onTouchMove = (e: TouchEvent) => {
  if (e.touches.length > 1) return; // pinch zoom stays possible
  const dx = (e.touches[0]?.clientX ?? 0) - startX;
  const dy = (e.touches[0]?.clientY ?? 0) - startY;
  if (Math.abs(dx) > Math.abs(dy)) return; // sideways swipes (cards, carousels) don't move the toolbar
  for (let el = e.target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight + 1 || !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) continue;
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    if ((dy > 0 && !atTop) || (dy < 0 && !atBottom)) return; // this box scrolls: let it
    break;
  }
  if (e.cancelable) e.preventDefault();
};

/** While any overlay is up the page behind holds still, and so does the browser around it. */
function lockScroll() {
  // in-app browsers scroll the page inside #app-scroll (see globals.css): that is the one to hold still there
  const box = document.documentElement.classList.contains("inapp-scroll") ? document.getElementById("app-scroll") : null;
  if (locks++ === 0) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (box) box.style.overflowY = "hidden";
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
  }
  return () => {
    if (--locks === 0) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (box) box.style.overflowY = "";
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    }
  };
}

/**
 * A full-screen layer (sheet, dialog, guide) drawn straight into <body>. Rendered where it is used, a `fixed z-50`
 * stays inside its parent's stacking context: the 📲 guide, opened from the top bar (z-10), had the page's own z-10
 * pieces (the 一 二 三 circles of 감정법) drawn over it. Mount it only while open.
 */
export function Overlay({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.body);
    return lockScroll();
  }, []);
  return host ? createPortal(children, host) : null;
}
