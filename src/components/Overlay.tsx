"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

let locks = 0;

/** While any overlay is up the page behind holds still: a swipe on the dim layer otherwise scrolled the page under it. */
function lockScroll() {
  if (locks++ === 0) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  return () => {
    if (--locks === 0) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
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
