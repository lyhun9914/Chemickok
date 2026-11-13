"use client";

import { useSyncExternalStore } from "react";
import type { Mode } from "@/models/types";
import { DEFAULT_FEEDBACK, type FeedbackSettings } from "./feedback";
import { DEFAULT_HOME, type HomeSettings } from "./home";
import { DEFAULT_PRICING, packForIn, productIn, sellPack, type Banner, type Pricing, type Sale, type SellPack } from "./pricing";

/**
 * The live 가격 · 세일 · 공지 in the browser. Starts with the code's defaults (so the first paint never waits) and
 * switches to what the 관리자 set once /api/settings answers.
 */
export interface Live {
  pricing: Pricing;
  sale: Sale | null;
  banner: Banner | null;
  feedback: FeedbackSettings;
  home: HomeSettings;
  loaded: boolean;
}

let state: Live = { pricing: DEFAULT_PRICING, sale: null, banner: null, feedback: DEFAULT_FEEDBACK, home: DEFAULT_HOME, loaded: false };
const subs = new Set<() => void>();
let inflight: Promise<void> | null = null;

export function loadLive(force = false): Promise<void> {
  if (inflight && !force) return inflight;
  inflight = fetch("/api/settings", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((b: Omit<Live, "loaded"> | null) => {
      if (b?.pricing?.packs?.length) state = { pricing: b.pricing, sale: b.sale ?? null, banner: b.banner ?? null, feedback: b.feedback ?? DEFAULT_FEEDBACK, home: b.home ?? DEFAULT_HOME, loaded: true };
      else state = { ...state, loaded: true };
      subs.forEach((f) => f());
    })
    .catch(() => undefined);
  return inflight;
}

const SERVER: Live = state;
export const getLive = () => state;

/** Subscribes the component to the live settings (and loads them once). */
export function useLive(): Live {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      if (!state.loaded) void loadLive();
      return () => subs.delete(f);
    },
    () => state,
    () => SERVER,
  );
}

/** The packs as they sell now (with the 세일). */
export const sellPacks = (l: Live): SellPack[] => l.pricing.packs.map((p) => sellPack(p, l.sale));
export const liveProduct = (l: Live, mode: Mode) => productIn(l.pricing, mode);
export const livePackFor = (l: Live, need: number) => sellPack(packForIn(l.pricing.packs, need), l.sale);
