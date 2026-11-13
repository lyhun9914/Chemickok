"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StoryShare } from "@/lib/handoff";
import { isFortune } from "@/lib/config";
import { accountApi, type LoginProvider, type Me, type PairView, type SavedReading } from "@/services/apiClient";
import { setShareRef } from "@/services/shareService";
import { newId, track } from "@/lib/track";
import type {
  FortuneTeaser,
  FullReport,
  Mode,
  PersonInput,
  QuestionnaireInput,
  RelationshipStatus,
  TeaserReport,
  UnlockResponse,
} from "@/models/types";

export type Screen = "landing" | "form" | "loading" | "result" | "my" | "story";

const emptyPerson: PersonInput = { name: "", gender: "female", birthdate: "", birthtime: "", mbti: "" };

interface AppState {
  screen: Screen;
  step: number;
  input: QuestionnaireInput;
  inputHash: string | null;
  teaser: TeaserReport | null;
  /** free part of a 사주·대운·재회·배우자 reading (input.mode is a FortuneMode) */
  fortune: FortuneTeaser | null;
  report: FullReport | null;
  level: "none" | "share" | "full";
  error: string | null;
  /** logged-in user (not persisted; reloaded from the session cookie) */
  me: Me | null;
  providers: LoginProvider[];
  meLoaded: boolean;
  /** reopen the payment sheet after returning from the login redirect */
  resumePay: boolean;
  /** a 충전 left for Toss from the paywall: open the reading with the new 냥 when it comes back */
  pendingSpend: boolean;
  /** what the interview already knows: the product picked on the landing page, 기본 정보, and (answering a 궁합
   * 신청서) the relationship status the sender chose */
  preset: { mode: boolean; me: boolean; status?: boolean };
  /** a share card handed over from another device without its answers (screen "story") */
  story: StoryShare | null;
  /** answering someone's 맞궁합 초대장: sent with this interview's answers when the reading is drawn */
  pair: { id: string; from: string } | null;
  /** the 맞궁합 once both sides answered (shown on the result) */
  pairView: PairView | null;
  /** opened from a link (?pair= · ?present= · ?game=): the landing opens the matching sheet once */
  deepLink: { pair?: string; gift?: string; game?: string; room?: string; quiz?: string; open?: string } | null;
  /** 이용 흐름: this interview's random id (lib/track) */
  runId: string | null;
  /** the paid reading on screen, as saved in 내 점괘함 (its 점괘 평가 is kept per reading) */
  readingId: string | null;

  setScreen: (s: Screen) => void;
  setStep: (n: number) => void;
  setMode: (m: Mode) => void;
  updateMe: (p: Partial<PersonInput>) => void;
  updatePartner: (p: Partial<PersonInput>) => void;
  setStatus: (s: RelationshipStatus) => void;
  setSelf: (id: string, v: string) => void;
  setPartnerObs: (id: string, v: string) => void;
  setTeaser: (teaser: TeaserReport, inputHash: string) => void;
  setFortune: (fortune: FortuneTeaser, inputHash: string) => void;
  applyUnlock: (u: UnlockResponse) => void;
  setError: (e: string | null) => void;
  reset: () => void;
  loadMe: () => Promise<Me | null>;
  setMe: (me: Me | null) => void;
  setResumePay: (v: boolean) => void;
  setPendingSpend: (v: boolean) => void;
  /** 복주머니 balance changed (charge, spend) */
  setCoins: (n: number) => void;
  /** start a fresh interview; `mode` from a product card, `me` from saved 기본 정보 or the previous reading */
  startInterview: (opts?: { mode?: Mode; me?: PersonInput | null; partner?: Partial<PersonInput>; status?: RelationshipStatus; pair?: { id: string; from: string } }) => void;
  /** open a saved reading from 내 점괘함 */
  openSaved: (r: Pick<SavedReading, "mode" | "names" | "teaser" | "report"> & { id?: string }) => void;
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
  fortune: null as FortuneTeaser | null,
  report: null,
  level: "none" as const,
  error: null,
  resumePay: false,
  pendingSpend: false,
  preset: { mode: false, me: false },
  story: null as StoryShare | null,
  pair: null as { id: string; from: string } | null,
  pairView: null as PairView | null,
  deepLink: null as { pair?: string; gift?: string; game?: string; room?: string; quiz?: string; open?: string } | null,
  runId: null as string | null,
  readingId: null as string | null,
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
      setMode: (mode) =>
        set((s) => {
          track("start", s.runId, { product: mode });
          return { input: { ...s.input, mode } };
        }),
      updateMe: (p) => set((s) => ({ input: { ...s.input, me: { ...s.input.me, ...p } } })),
      updatePartner: (p) => set((s) => ({ input: { ...s.input, partner: { ...s.input.partner, ...p } } })),
      setStatus: (status) =>
        set((s) => {
          track("start", s.runId, { status });
          return { input: { ...s.input, status } };
        }),
      setSelf: (id, v) => set((s) => ({ input: { ...s.input, self: { ...s.input.self, [id]: v } } })),
      setPartnerObs: (id, v) =>
        set((s) => ({ input: { ...s.input, partnerObs: { ...s.input.partnerObs, [id]: v } } })),
      setTeaser: (teaser, inputHash) =>
        set({ teaser, fortune: null, inputHash, report: null, level: "none", readingId: null, screen: "result" }),
      setFortune: (fortune, inputHash) =>
        set({ fortune, teaser: null, inputHash, report: null, level: "none", readingId: null, screen: "result" }),
      // Never downgrade: a later "share" unlock must not hide an already-paid full report.
      applyUnlock: ({ level, report, coins, readingId }) =>
        set((s) => {
          if (level === "full" && s.level !== "full") track("paid", s.runId, { product: s.input.mode });
          return {
          ...(s.level === "full" ? {} : { level, report }),
          ...(readingId ? { readingId } : {}),
          ...(coins !== undefined && s.me ? { me: { ...s.me, coins } } : {}),
          };
        }),
      setError: (error) => set({ error }),
      reset: () => set({ ...initial, input: initialInput() }),
      loadMe: async () => {
        const r = await accountApi.me().catch(() => ({ user: null, providers: [] as LoginProvider[] }));
        set({ me: r.user, providers: r.providers, meLoaded: true });
        setShareRef(r.user?.refCode ?? null);
        return r.user;
      },
      setMe: (me) => {
        setShareRef(me?.refCode ?? null);
        set({ me });
      },
      setResumePay: (resumePay) => set({ resumePay }),
      setPendingSpend: (pendingSpend) => set({ pendingSpend }),
      setCoins: (coins) => set((s) => (s.me ? { me: { ...s.me, coins } } : {})),
      startInterview: (opts = {}) => {
        const base = initialInput();
        const runId = newId();
        track("start", runId, { product: opts.mode ?? "love", status: opts.status });
        const me = opts.me?.name && opts.me.birthdate ? opts.me : null;
        set({
          input: {
            ...base,
            mode: opts.mode ?? base.mode,
            me: me ? { ...base.me, ...me } : base.me,
            partner: { ...base.partner, ...opts.partner },
            status: opts.status ?? base.status,
          },
          pair: opts.pair ?? null,
          pairView: null,
          runId,
          preset: { mode: Boolean(opts.mode), me: Boolean(me), status: Boolean(opts.status) },
          step: 0,
          screen: "form",
          error: null,
          // a new interview replaces the last reading (the landing's "보던 점괘" would otherwise pair it with new answers)
          teaser: null,
          fortune: null,
          report: null,
          level: "none",
          inputHash: null,
          readingId: null,
        });
      },
      openSaved: ({ id, mode, names, teaser, report }) => {
        const base = initialInput();
        const fortune = isFortune(mode);
        set({
          input: { ...base, mode, me: { ...base.me, name: names.me }, partner: { ...base.partner, name: names.partner } },
          teaser: fortune ? null : (teaser as TeaserReport),
          fortune: fortune ? (teaser as FortuneTeaser) : null,
          report,
          level: "full",
          inputHash: "saved",
          readingId: id ?? null,
          screen: "result",
        });
      },
    }),
    {
      name: "love-chemistry-v6",
      // sessionStorage survives the Toss redirect round-trip but not a new tab/session.
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ screen, step, input, inputHash, teaser, fortune, report, level, resumePay, pendingSpend, preset, story, pair, pairView, runId, readingId }) => ({
        runId,
        readingId,
        story,
        pair,
        pairView,
        resumePay,
        pendingSpend,
        preset,
        screen: screen === "loading" ? "form" : screen,
        step,
        input,
        inputHash,
        teaser,
        fortune,
        report,
        level,
      }),
    },
  ),
);
