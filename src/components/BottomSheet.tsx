"use client";

import { useEffect, useState } from "react";
import { useBack } from "@/lib/back";
import { shareService } from "@/services/shareService";
import { Overlay } from "./Overlay";

/** The app's bottom sheet: dim backdrop, ✕, Escape and the back gesture close it. */
export function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useBack(open, onClose);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <Overlay>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fade-up max-h-[92dvh] w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface p-6 pb-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">{title}</h2>
            <button onClick={onClose} className="rounded-full px-3 py-1 text-muted hover:bg-white/5" aria-label="닫기">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </Overlay>
  );
}

/** KakaoTalk share of a specific link (falls back to the share sheet / copying), plus a plain copy button. */
export function ShareLinkButtons({ label, title, description, url }: { label: string; title: string; description: string; url: string }) {
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    shareService.prepareKakao().catch(() => {});
  }, []);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={() =>
            shareService
              .shareKakao({ title, description, url })
              .then((o) => o === "copied" && setNote("카톡 창을 못 열어서 링크를 복사했다냥. 붙여넣어 보내라냥 📋"))
              .catch(() => setNote("공유를 못 했다냥. 다시 눌러라냥"))
          }
          className="rounded-xl bg-[#FEE500] py-3 text-[14.5px] font-bold text-[#191600] active:scale-[0.98]"
        >
          {label}
        </button>
        <button
          onClick={() =>
            navigator.clipboard
              ?.writeText(url)
              .then(() => setNote("링크를 복사했다냥 📋"))
              .catch(() => setNote(url))
          }
          className="rounded-xl border border-line px-4 text-[13.5px] font-semibold"
        >
          링크 복사
        </button>
      </div>
      {note && <p className="fade-up break-all text-center text-xs text-peach">{note}</p>}
    </div>
  );
}
