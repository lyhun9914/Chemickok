"use client";

import { useEffect, useRef, useState } from "react";
import { BLOOD_TYPES } from "@/lib/blood";
import { josa } from "@/lib/josa";
import type { BloodType } from "@/models/types";
import { useAppStore } from "@/store/useAppStore";
import { DateTimeSelects } from "./DateTimeSelects";
import { Say } from "./Nyang";

/** 기본 정보 the free fortunes read: who, born when, which blood type. */
export interface BasicInfo {
  name: string;
  birthdate: string;
  blood: BloodType | "";
}

const iGuNyang = (name: string) => `${name}${josa(name, "이/가").endsWith("이") ? "이" : ""}구냥`;
const fmtDate = (d: string) => d.replaceAll("-", ".");

/** The logged-in visitor's saved 기본 정보, if complete enough to read from. */
export function useSavedInfo(): BasicInfo | null {
  const p = useAppStore((s) => s.me?.profile ?? null);
  return p?.name && p.birthdate ? { name: p.name, birthdate: p.birthdate, blood: p.blood ?? "" } : null;
}

/**
 * Asks for 기본 정보 before a free fortune, so the reading is visibly about *you*. A logged-in visitor with a saved
 * profile isn't asked again: 냥신 greets them ("또 왔냥?"), shows what it remembers, and starts on its own; they can
 * still switch to someone else's details. Guests get a short form, prefilled from this visit.
 */
export function InfoGate({
  ask,
  purpose,
  cta,
  busy,
  onReady,
  startManual = false,
}: {
  ask: string;
  purpose: string;
  cta: string;
  busy: boolean;
  onReady: (info: BasicInfo) => void;
  /** skip the saved-profile greeting (e.g. "someone else's" was picked) */
  startManual?: boolean;
}) {
  const saved = useSavedInfo();
  const session = useAppStore((s) => s.input.me);
  const updateMe = useAppStore((s) => s.updateMe);
  const [manual, setManual] = useState(startManual);
  const started = useRef(false);
  const [name, setName] = useState(session.name || "");
  const [birthdate, setBirthdate] = useState(session.birthdate || "");
  // null = not picked yet ("몰라" is a real answer: "")
  const [blood, setBlood] = useState<BloodType | "" | null>(session.blood ?? null);

  useEffect(() => {
    if (!saved || manual || started.current) return;
    const t = setTimeout(() => {
      started.current = true;
      onReady(saved);
    }, 1200);
    return () => clearTimeout(t);
    // saved is rebuilt each render; its fields are what matter
  }, [saved?.name, saved?.birthdate, saved?.blood, manual]);

  if (saved && !manual) {
    return (
      <div className="space-y-3">
        <Say mood="happy">
          {iGuNyang(saved.name)}. 또 왔냥? 기억해 둔 기본 정보로 바로 {purpose} 🐾
        </Say>
        <div className="flex items-center gap-3 rounded-2xl border border-violet/35 bg-white/[0.03] px-4 py-3">
          <span className="text-xl" aria-hidden>
            🪪
          </span>
          <span className="min-w-0 flex-1 text-[14px]">
            <span className="block font-bold">{saved.name}</span>
            <span className="block text-[13px] text-muted">
              {fmtDate(saved.birthdate)}
              {saved.blood ? ` · ${saved.blood}형` : " · 혈액형 모름"}
            </span>
          </span>
          <span className="flicker text-lg" aria-hidden>
            🕯️
          </span>
        </div>
        <p className="animate-pulse text-center text-[13px] text-peach">{busy ? `${saved.name}의 기운을 읽는 중…` : "곧 펼친다냥…"}</p>
        <button onClick={() => setManual(true)} disabled={busy} className="w-full py-2 text-[13px] text-muted underline underline-offset-4 disabled:opacity-40">
          다른 사람 정보로 볼래
        </button>
      </div>
    );
  }

  const ok = name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(birthdate) && blood !== null;
  const submit = () => {
    if (!ok) return;
    const info = { name: name.trim(), birthdate, blood: blood ?? "" };
    // Remember it for this visit, so the next game (and the interview) doesn't ask again — but never over someone's own.
    if (!session.name && !session.birthdate) updateMe(info);
    onReady(info);
  };
  return (
    <div className="space-y-4">
      <Say mood="smug">{ask}</Say>
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">이름</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          placeholder="예: 김지민"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-muted/60 focus:border-pink/60"
        />
      </label>
      <div>
        <span className="mb-1.5 block text-[13px] text-muted">생년월일 (양력)</span>
        <DateTimeSelects type="date" initial={birthdate} onChange={setBirthdate} />
      </div>
      <div>
        <span className="mb-1.5 block text-[13px] text-muted">혈액형</span>
        <div className="grid grid-cols-5 gap-1.5">
          {[...BLOOD_TYPES, ""].map((b) => (
            <button
              key={b || "none"}
              onClick={() => setBlood(b as BloodType | "")}
              className={`rounded-xl border py-2.5 text-[14px] ${blood === b ? "border-pink bg-pink/15 font-bold text-ink" : "border-line text-muted"}`}
            >
              {b ? `${b}형` : "몰라"}
            </button>
          ))}
        </div>
      </div>
      <button onClick={submit} disabled={!ok || busy} className="btn-primary w-full py-4">
        {busy ? "냥신이 기운을 읽는 중…" : cta}
      </button>
    </div>
  );
}
