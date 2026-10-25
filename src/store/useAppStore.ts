"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ConcernId,
  FullReport,
  PersonInput,
  QuestionnaireInput,
  RelationshipStatus,
  TeaserReport,
  UnlockResponse,
} from "@/models/types";

export type Screen = "landing" | "form" | "loading" | "result";

const emptyPerson: PersonInput = { name: "", gender: "female", birthdate: "", birthtime: "" };

interface AppState {
  screen: Screen;
  step: number;
  input: QuestionnaireInput;
  inputHash: string | null;
  teaser: TeaserReport | null;
  report: Partial<FullReport> | null;
  level: "none" | "share" | "full";
  error: string | null;

  setScreen: (s: Screen) => void;
  setStep: (n: number) => void;
  updateMe: (p: Partial<PersonInput>) => void;
  updatePartner: (p: Partial<PersonInput>) => void;
  setStatus: (s: RelationshipStatus) => void;
  setConcern: (c: ConcernId) => void;
  setSelf: (id: string, v: number) => void;
  setPartnerObs: (id: string, v: number) => void;
  setTeaser: (teaser: TeaserReport, inputHash: string) => void;
  applyUnlock: (u: UnlockResponse) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

const initialInput = (): QuestionnaireInput => ({
  me: { ...emptyPerson },
  partner: { ...emptyPerson, gender: "male" },
  status: "dating",
  concern: "contact",
  self: {},
  partnerObs: {},
});

const initial = {
  screen: "landing" as Screen,
  step: 0,
  inputHash: null,
  teaser: null,
  report: null,
  level: "none" as const,
  error: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initial,
      input: initialInput(),
      setScreen: (screen) => set({ screen, error: null }),
      setStep: (step) => set({ step }),
      updateMe: (p) => set((s) => ({ input: { ...s.input, me: { ...s.input.me, ...p } } })),
      updatePartner: (p) => set((s) => ({ input: { ...s.input, partner: { ...s.input.partner, ...p } } })),
      setStatus: (status) => set((s) => ({ input: { ...s.input, status } })),
      setConcern: (concern) => set((s) => ({ input: { ...s.input, concern } })),
      setSelf: (id, v) => set((s) => ({ input: { ...s.input, self: { ...s.input.self, [id]: v } } })),
      setPartnerObs: (id, v) =>
        set((s) => ({ input: { ...s.input, partnerObs: { ...s.input.partnerObs, [id]: v } } })),
      setTeaser: (teaser, inputHash) =>
        set({ teaser, inputHash, report: null, level: "none", screen: "result" }),
      // Never downgrade: a later "share" unlock must not hide an already-paid full report.
      applyUnlock: ({ level, report }) =>
        set((s) =>
          s.level === "full" ? {} : { level, report: { ...(s.report ?? {}), ...report } },
        ),
      setError: (error) => set({ error }),
      reset: () => set({ ...initial, input: initialInput() }),
    }),
    {
      name: "love-chemistry-v2",
      // sessionStorage survives the Toss redirect round-trip but not a new tab/session.
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ screen, step, input, inputHash, teaser, report, level }) => ({
        screen: screen === "loading" ? "form" : screen,
        step,
        input,
        inputHash,
        teaser,
        report,
        level,
      }),
    },
  ),
);
