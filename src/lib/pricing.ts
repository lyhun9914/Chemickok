import { COIN_PACKS, PRODUCTS, type CoinPack, type Product } from "@/lib/config";
import type { Mode } from "@/models/types";

/**
 * Prices the 관리자 can change without a deploy: the 충전 packs, the 냥 each reading costs, a 세일 on the packs and the
 * 공지 배너. The code's values (config.ts) are the defaults until a setting is saved.
 */
export interface Pricing {
  packs: CoinPack[];
  /** 냥 one full reading costs */
  costs: Record<Mode, number>;
}

/** 충전 세일: for a while, the packs cost less and/or give extra 냥. */
export interface Sale {
  on: boolean;
  label: string;
  /** ISO; empty = from now / no end */
  from: string;
  to: string;
  /** % off the pack price (0–90) */
  discountPct: number;
  /** % more 냥 (0–200), rounded down per pack */
  bonusPct: number;
}

export interface Banner {
  on: boolean;
  text: string;
  tone: "info" | "event" | "warn";
  /** optional link (https://…) */
  link: string;
}

export const MODES: Mode[] = ["solo", "couple", "reunion", "spouse", "newyear", "saju", "daeun"];

export const DEFAULT_PRICING: Pricing = {
  packs: COIN_PACKS,
  costs: Object.fromEntries(MODES.map((m) => [m, PRODUCTS[m].coins])) as Record<Mode, number>,
};
export const DEFAULT_SALE: Sale = { on: false, label: "", from: "", to: "", discountPct: 0, bonusPct: 0 };
export const DEFAULT_BANNER: Banner = { on: false, text: "", tone: "info", link: "" };

/** Checks a pricing the 관리자 typed; returns the clean value or what's wrong. */
export function cleanPricing(v: unknown): { ok: true; value: Pricing } | { ok: false; error: string } {
  const p = v as Partial<Pricing> | null;
  if (!p || !Array.isArray(p.packs) || !p.costs) return { ok: false, error: "가격 정보가 비었어요." };
  if (p.packs.length < 1 || p.packs.length > 8) return { ok: false, error: "충전 묶음은 1~8개로 정해 주세요." };
  const packs: CoinPack[] = [];
  for (const x of p.packs) {
    const coins = Math.trunc(Number(x?.coins));
    const price = Math.trunc(Number(x?.price));
    const id = String(x?.id ?? "").trim();
    const tag = String(x?.tag ?? "").trim().slice(0, 12);
    if (!/^[a-z0-9]{1,12}$/.test(id)) return { ok: false, error: "묶음 이름표(id)가 올바르지 않아요." };
    if (!(coins >= 1 && coins <= 100)) return { ok: false, error: "묶음의 냥은 1~100냥으로 넣어 주세요." };
    if (!(price >= 100 && price <= 1_000_000) || price % 10) return { ok: false, error: "가격은 100원~100만 원, 10원 단위로 넣어 주세요." };
    if (packs.some((y) => y.id === id)) return { ok: false, error: "묶음 이름표가 겹쳐요." };
    if (packs.some((y) => y.coins === coins)) return { ok: false, error: `${coins}냥 묶음이 두 개예요.` };
    packs.push({ id, coins, price, ...(tag ? { tag } : {}) });
  }
  packs.sort((a, b) => a.coins - b.coins);
  const costs = {} as Record<Mode, number>;
  for (const m of MODES) {
    const c = Math.trunc(Number((p.costs as Record<string, unknown>)[m]));
    if (!(c >= 1 && c <= 20)) return { ok: false, error: `${PRODUCTS[m].name}의 냥은 1~20냥으로 넣어 주세요.` };
    costs[m] = c;
  }
  return { ok: true, value: { packs, costs } };
}

export function cleanSale(v: unknown): { ok: true; value: Sale } | { ok: false; error: string } {
  const s = v as Partial<Sale> | null;
  if (!s) return { ok: false, error: "세일 정보가 비었어요." };
  const discountPct = Math.trunc(Number(s.discountPct ?? 0));
  const bonusPct = Math.trunc(Number(s.bonusPct ?? 0));
  if (!(discountPct >= 0 && discountPct <= 90)) return { ok: false, error: "할인은 0~90%로 넣어 주세요." };
  if (!(bonusPct >= 0 && bonusPct <= 200)) return { ok: false, error: "보너스 냥은 0~200%로 넣어 주세요." };
  const date = (x: unknown) => {
    const t = String(x ?? "").trim();
    return t && !Number.isNaN(Date.parse(t)) ? new Date(t).toISOString() : "";
  };
  const from = date(s.from);
  const to = date(s.to);
  if (from && to && from >= to) return { ok: false, error: "세일 끝나는 때가 시작보다 뒤여야 해요." };
  const on = Boolean(s.on);
  if (on && !discountPct && !bonusPct) return { ok: false, error: "할인이나 보너스 냥 중 하나는 넣어 주세요." };
  return { ok: true, value: { on, label: String(s.label ?? "").trim().slice(0, 30), from, to, discountPct, bonusPct } };
}

export function cleanBanner(v: unknown): { ok: true; value: Banner } | { ok: false; error: string } {
  const b = v as Partial<Banner> | null;
  if (!b) return { ok: false, error: "공지 정보가 비었어요." };
  const text = String(b.text ?? "").trim().slice(0, 120);
  const link = String(b.link ?? "").trim().slice(0, 300);
  if (b.on && !text) return { ok: false, error: "공지 문구를 넣어 주세요." };
  if (link && !/^https:\/\/[^\s]+$/.test(link) && !/^\/[^\s]*$/.test(link)) return { ok: false, error: "링크는 https:// 로 시작하거나 /로 시작하는 주소만 돼요." };
  const tone = b.tone === "event" || b.tone === "warn" ? b.tone : "info";
  return { ok: true, value: { on: Boolean(b.on), text, tone, link } };
}

/** Is the sale running at `now`? (the clock is read only when a sale is switched on) */
export function saleLive(s: Sale | null | undefined, now?: number): s is Sale {
  if (!s?.on || !(s.discountPct || s.bonusPct)) return false;
  const t = now ?? Date.now();
  return (!s.from || Date.parse(s.from) <= t) && (!s.to || t < Date.parse(s.to));
}

/** A pack as it sells now: the sale price and the 냥 it gives (base + bonus). */
export interface SellPack extends CoinPack {
  /** price before the sale */
  basePrice: number;
  /** extra 냥 from the sale */
  bonus: number;
  /** coins + bonus: what lands in the 복주머니 */
  total: number;
}
export function sellPack(p: CoinPack, sale: Sale | null | undefined, now?: number): SellPack {
  const live = saleLive(sale, now);
  const price = live && sale.discountPct ? Math.max(100, Math.round((p.price * (100 - sale.discountPct)) / 1000) * 10) : p.price;
  const bonus = live && sale.bonusPct ? Math.floor((p.coins * sale.bonusPct) / 100) : 0;
  return { ...p, price, basePrice: p.price, bonus, total: p.coins + bonus };
}

/** What a guest pays to open one reading that costs `coins`: the pack of exactly that size, else 냥 × the 1냥 price. */
export function directPriceIn(pr: Pricing, coins: number): number {
  return pr.packs.find((p) => p.coins === coins)?.price ?? coins * Math.round(pr.packs[0].price / pr.packs[0].coins);
}

/** A product with the live 냥 cost and direct price. */
export function productIn(pr: Pricing, mode: Mode): Product {
  const coins = pr.costs[mode] ?? PRODUCTS[mode].coins;
  return { ...PRODUCTS[mode], coins, price: directPriceIn(pr, coins) };
}

/** Smallest pack covering a shortfall. */
export const packForIn = (packs: CoinPack[], need: number) => packs.find((p) => p.coins >= need) ?? packs[packs.length - 1];
