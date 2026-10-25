"use client";

import { useCallback, useEffect, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2400);
    return () => clearTimeout(t);
  }, [msg]);
  const show = useCallback((m: string) => setMsg(m), []);
  const node = msg ? (
    <div
      role="status"
      className="fade-up fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black shadow-lg"
    >
      {msg}
    </div>
  ) : null;
  return { show, node };
}
