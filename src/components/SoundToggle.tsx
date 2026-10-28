"use client";

import { useSyncExternalStore } from "react";
import { sound } from "@/lib/sound";

const subscribe = (fn: () => void) => sound().subscribe(fn);
const isOn = () => sound().enabled;

/** 🔊 / 🔇 for the room sound. `floating` pins it to the top-right corner of the 480px column. */
export function SoundToggle({ floating = false, className = "" }: { floating?: boolean; className?: string }) {
  const on = useSyncExternalStore(subscribe, isOn, () => true);
  return (
    <button
      onClick={() => sound().toggle()}
      aria-label={on ? "소리 끄기" : "소리 켜기"}
      aria-pressed={on}
      title={on ? "소리 끄기" : "소리 켜기"}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-[15px] transition active:scale-90 ${on ? "bg-surface/85 text-ink" : "bg-surface/60 text-muted"} ${floating ? "fixed top-3 z-40 shadow-lg backdrop-blur-md right-[max(12px,calc(50vw_-_228px))]" : ""} ${className}`}
    >
      <span aria-hidden>{on ? "🔊" : "🔇"}</span>
    </button>
  );
}
