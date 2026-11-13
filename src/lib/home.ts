import type { Mode } from "@/models/types";
import { PRODUCTS } from "./config";

/** 홈 첫 화면의 시즌 주인공 (app_settings 'home'). auto: 12월~1월(한국 시간)엔 신년운세, 그 밖엔 없음. */
export interface HomeSettings {
  hero: "auto" | "off" | Mode;
}
export const DEFAULT_HOME: HomeSettings = { hero: "auto" };

const isMode = (v: unknown): v is Mode => typeof v === "string" && Object.hasOwn(PRODUCTS, v);

export function cleanHome(v: unknown): { ok: true; value: HomeSettings } | { ok: false; error: string } {
  const hero = (v as Partial<HomeSettings> | null)?.hero;
  if (hero === "auto" || hero === "off" || isMode(hero)) return { ok: true, value: { hero } };
  return { ok: false, error: "주인공으로 고를 수 없는 점괘예요." };
}

/** The product shown big on the first screen now, or null. */
export function heroMode(h: HomeSettings, now = Date.now()): Mode | null {
  if (h.hero === "off") return null;
  if (h.hero !== "auto") return h.hero;
  const month = new Date(now + 9 * 3600e3).getUTCMonth();
  return month === 11 || month === 0 ? "newyear" : null;
}

/** ?open= 바로가기(인스타 링크): 점괘 이름이면 면담을, 게임 이름이면 그 게임을 연다. 별칭만 여기서 바꾼다. */
export const OPEN_ALIAS: Record<string, string> = { bujeok: "exam" };
export const openTarget = (open: string): { mode: Mode } | { game: string } => {
  const id = OPEN_ALIAS[open] ?? open;
  return isMode(id) ? { mode: id } : { game: id };
};
