import "server-only";
import { DEFAULT_BANNER, DEFAULT_PRICING, DEFAULT_SALE, cleanBanner, cleanPricing, cleanSale, type Banner, type Pricing, type Sale } from "@/lib/pricing";
import { DEFAULT_FEEDBACK, cleanFeedbackSettings, type FeedbackSettings } from "@/lib/feedback";
import { DEFAULT_HOME, cleanHome, type HomeSettings } from "@/lib/home";
import { getDb } from "./db";

export interface Settings {
  pricing: Pricing;
  sale: Sale;
  banner: Banner;
  /** 냥신 건의함: 채택 선물 */
  feedback: FeedbackSettings;
  /** 홈 첫 화면 시즌 주인공 */
  home: HomeSettings;
}

const DEFAULTS: Settings = { pricing: DEFAULT_PRICING, sale: DEFAULT_SALE, banner: DEFAULT_BANNER, feedback: DEFAULT_FEEDBACK, home: DEFAULT_HOME };
let cache: { at: number; value: Settings } | null = null;
const TTL = 15_000;

/**
 * The live 가격 · 세일 · 공지 · 채택 선물, read from the DB (kept 15 seconds per server). A saved value that no longer passes the
 * checks, or a DB hiccup, falls back to the code's defaults rather than breaking payments.
 */
export async function getSettings(fresh = false): Promise<Settings> {
  if (!fresh && cache && Date.now() - cache.at < TTL) return cache.value;
  const db = getDb();
  if (!db) return DEFAULTS;
  try {
    const raw = await db.getSettings();
    const p = raw.pricing ? cleanPricing(raw.pricing) : null;
    const s = raw.sale ? cleanSale(raw.sale) : null;
    const b = raw.banner ? cleanBanner(raw.banner) : null;
    const f = raw.feedback ? cleanFeedbackSettings(raw.feedback) : null;
    const h = raw.home ? cleanHome(raw.home) : null;
    const value: Settings = {
      pricing: p?.ok ? p.value : DEFAULT_PRICING,
      sale: s?.ok ? s.value : DEFAULT_SALE,
      banner: b?.ok ? b.value : DEFAULT_BANNER,
      feedback: f?.ok ? f.value : DEFAULT_FEEDBACK,
      home: h?.ok ? h.value : DEFAULT_HOME,
    };
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.error("settings read failed", e);
    return cache?.value ?? DEFAULTS;
  }
}

/** After the 관리자 saves: the next read goes to the DB. */
export const dropSettingsCache = () => {
  cache = null;
};
