"use client";

import { useCallback, useEffect, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    // Long instructions stay up long enough to read.
    const t = setTimeout(() => setMsg(null), Math.min(9000, 2400 + msg.length * 45));
    return () => clearTimeout(t);
  }, [msg]);
  const show = useCallback((m: string) => setMsg(m), []);
  const node = msg ? (
    <div
      role="status"
      className="fade-up hanji fixed bottom-8 left-1/2 z-[60] w-max max-w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl px-5 py-3 text-center text-sm font-medium leading-relaxed shadow-lg"
    >
      {msg}
    </div>
  ) : null;
  return { show, node };
}
