"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The phone's back gesture inside a one-page app: without this it leaves the site, mid-interview or with a sheet open.
 * Every open sheet / inner screen pushes one history entry and a handler; back pops the newest handler (close the
 * sheet, step out of the screen). Closing by a button gives the entry back. All entries are the same URL, so they're
 * interchangeable: only their count matters.
 */
const stack: { id: number; fn: () => void }[] = [];
let seq = 0;
let ignore = 0;
let toPop = 0;
let installed = false;

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("popstate", () => {
    if (ignore > 0) {
      ignore--;
      return;
    }
    stack.pop()?.fn();
  });
}

function push(fn: () => void): () => void {
  install();
  const id = ++seq;
  stack.push({ id, fn });
  window.history.pushState({ nyangBack: id }, "");
  return () => {
    const i = stack.findIndex((h) => h.id === id);
    if (i < 0) return; // already used by a back press
    stack.splice(i, 1);
    // Several sheets may close in one go: give their entries back with one traversal.
    if (toPop++ === 0)
      queueMicrotask(() => {
        const n = toPop;
        toPop = 0;
        ignore++;
        window.history.go(-n);
      });
  };
}

/** While `active`, the back gesture calls `onBack` instead of leaving (again on every press, as long as it stays active). */
export function useBack(active: boolean, onBack: () => void) {
  const fn = useRef(onBack);
  useEffect(() => {
    fn.current = onBack;
  });
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!active) return;
    let used = false;
    const release = push(() => {
      used = true;
      fn.current();
      setRound((r) => r + 1);
    });
    return () => {
      if (!used) release();
    };
  }, [active, round]);
}
