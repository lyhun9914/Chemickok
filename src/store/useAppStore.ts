"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { accountApi, type LoginProvider, type Me } from "@/services/apiClient";
import type {
  FullReport,
  Mode,
  PersonInput,
  QuestionnaireInput,
  RelationshipStatus,
  TeaserReport,
  UnlockResponse,
} from "@/models/types";

export type Screen = "landing" | "form" | "loading" | "result" | "my";

const emptyPerson: PersonInput = { name: "", gender: "female", birthdate: "", birthtime: "", mbti: "" };

interface AppState {
  screen: Screen;
  step: number;
  input: QuestionnaireInput;
  inputHash: string | null;
  teaser: TeaserReport | null;
  report: FullReport | null;
  level: "none" | "share" | "full";
  error: string | null;
  /** logged-in user (not persisted; reloaded from the session cookie) */
  me: Me | null;
  providers: LoginProvider[];
  meLoaded: boolean;
  /** reopen the payment sheet after returning from the login redirect */
  resumePay: boolean;
  /** what the interview already knows: the product picked on the landing page, and 기본 정보 */
  preset: { mode: boolean; me: boolean };

  setScreen: (s: Screen) => void;
  setStep: (n: number) => void;
  setMode: (m: Mode) => void;
  updateMe: (p: Partial<PersonInput>) => void;
  updatePartner: (p: Partial<PersonInput>) => void;
  setStatus: (s: RelationshipStatus) => void;
  setSelf: (id: string, v: string) => void;
  setPartnerObs: (id: string, v: string) => void;
  setTeaser: (teaser: TeaserReport, inputHash: string) => void;
  applyUnlock: (u: UnlockResponse) => void;
  setError: (e: string | null) => void;
  reset: () => void;
  loadMe: () => Promise<Me | null>;
  setMe: (me: Me | null) => void;
  setResumePay: (v: boolean) => void;
  /** start a fresh interview; `mode` from a product card, `me` from saved 기본 정보 or the previous reading */
  startInterview: (opts?: { mode?: Mode; me?: PersonInput | null }) => void;
  /** open a saved reading from 내 점괘함 */
  openSaved: (r: { mode: Mode; names: { me: string; partner: string }; teaser: TeaserReport; report: FullReport }) => void;
}

const initialInput = (): QuestionnaireInput => ({
  mode: "solo",
  me: { ...emptyPerson },
  partner: { ...emptyPerson, gender: "male" },
  status: "dating",
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
  resumePay: false,
  preset: { mode: false, me: false },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initial,
      input: initialInput(),
      me: null,
      providers: [],
      meLoaded: false,
      setScreen: (screen) => set({ screen, error: null }),
      setStep: (step) => set({ step }),
      setMode: (mode) => set((s) => ({ input: { ...s.input, mode } })),
      updateMe: (p) => set((s) => ({ input: { ...s.input, me: { ...s.input.me, ...p } } })),
      updatePartner: (p) => set((s) => ({ input: { ...s.input, partner: { ...s.input.partner, ...p } } })),
      setStatus: (status) => set((s) => ({ input: { ...s.input, status } })),
      setSelf: (id, v) => set((s) => ({ input: { ...s.input, self: { ...s.input.self, [id]: v } } })),
      setPartnerObs: (id, v) =>
        set((s) => ({ input: { ...s.input, partnerObs: { ...s.input.partnerObs, [id]: v } } })),
      setTeaser: (teaser, inputHash) =>
        set({ teaser, inputHash, report: null, level: "none", screen: "result" }),
      // Never downgrade: a later "share" unlock must not hide an already-paid full report.
      applyUnlock: ({ level, report }) => set((s) => (s.level === "full" ? {} : { level, report })),
      setError: (error) => set({ error }),
      reset: () => set({ ...initial, input: initialInput() }),
      loadMe: async () => {
        const r = await accountApi.me().catch(() => ({ user: null, providers: [] as LoginProvider[] }));
        set({ me: r.user, providers: r.providers, meLoaded: true });
        return r.user;
      },
      setMe: (me) => set({ me }),
      setResumePay: (resumePay) => set({ resumePay }),
      startInterview: (opts = {}) => {
        const base = initialInput();
        const me = opts.me?.name && opts.me.birthdate ? opts.me : null;
        set({
          input: { ...base, mode: opts.mode ?? base.mode, me: me ? { ...base.me, ...me } : base.me },
          preset: { mode: Boolean(opts.mode), me: Boolean(me) },
          step: 0,
          screen: "form",
          error: null,
        });
      },
      openSaved: ({ mode, names, teaser, report }) => {
        const base = initialInput();
        set({
          input: { ...base, mode, me: { ...base.me, name: names.me }, partner: { ...base.partner, name: names.partner } },
          teaser,
          report,
          level: "full",
          inputHash: "saved",
          screen: "result",
        });
      },
    }),
    {
      name: "love-chemistry-v6",
      // sessionStorage survives the Toss redirect round-trip but not a new tab/session.
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ screen, step, input, inputHash, teaser, report, level, resumePay, preset }) => ({
        resumePay,
        preset,
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
