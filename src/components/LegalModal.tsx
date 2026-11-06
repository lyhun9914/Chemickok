"use client";

import { useEffect } from "react";
import { useBack } from "@/lib/back";
import { LEGAL_DOCS, type LegalDoc } from "@/lib/legal";

export type { LegalDoc };


export function LegalModal({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  useBack(doc !== null, onClose);
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, onClose]);

  if (!doc) return null;
  const d = LEGAL_DOCS[doc];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={d.title}
        className="fade-up max-h-[80dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{d.title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-muted hover:bg-white/5" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-muted">
          {d.sections.map(([h, b]) => (
            <section key={h}>
              <h3 className="mb-1 font-semibold text-ink">{h}</h3>
              <p>{b}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
