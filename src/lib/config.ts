import type { FortuneMode, Mode } from "@/models/types";

const price = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 100 ? n : fallback;
};

/**
 * 상품 · 가격. Change the numbers here, or override per deploy without code changes with
 * NEXT_PUBLIC_PRICE_SOLO / _COUPLE / _SAJU / _DAEUN / _REUNION / _SPOUSE in Vercel (takes effect on the next deploy).
 */
export interface Product {
  name: string;
  emoji: string;
  price: number;
  orderName: string;
  pitch: string;
  /** 연애 점괘 (love interview) or 사주·운세 (chart readings) — the landing menu groups by this */
  category: "love" | "fortune";
}

export const PRODUCTS: Record<Mode, Product> = {
  solo: {
    name: "내 연애 팔자",
    emoji: "🐾",
    price: price(process.env.NEXT_PUBLIC_PRICE_SOLO, 990),
    orderName: "냥신 점괘 · 내 연애 팔자",
    pitch: "내 연애 유형 · 찰떡 궁합 · 반복하는 실수 · 이번 달 인연 날짜",
    category: "love",
  },
  couple: {
    name: "그 사람과 궁합",
    emoji: "💞",
    price: price(process.env.NEXT_PUBLIC_PRICE_COUPLE, 1900),
    orderName: "냥신 점괘 · 그 사람과 궁합",
    pitch: "궁합 점수 · 그 사람 속마음 · 보내지 못한 편지 · 이별 위기",
    category: "love",
  },
  reunion: {
    name: "재회운",
    emoji: "🔁",
    price: price(process.env.NEXT_PUBLIC_PRICE_REUNION, 2900),
    orderName: "냥신 점괘 · 재회운",
    pitch: "다시 만날 가능성 · 그 사람 마음 온도 · 연락해도 되는 날짜 · 첫 문장",
    category: "love",
  },
  spouse: {
    name: "미래 배우자운",
    emoji: "💍",
    price: price(process.env.NEXT_PUBLIC_PRICE_SPOUSE, 2900),
    orderName: "냥신 점괘 · 미래 배우자운",
    pitch: "배우자 자리로 보는 성격·외모·직업 · 만나는 해와 달 · 만나는 곳",
    category: "love",
  },
  saju: {
    name: "타고난 사주 팔자",
    emoji: "📜",
    price: price(process.env.NEXT_PUBLIC_PRICE_SAJU, 3900),
    orderName: "냥신 점괘 · 타고난 사주 팔자",
    pitch: "타고난 그릇 · 재물 · 일과 적성 · 건강 · 귀인 · 올해·내년 · 개운법",
    category: "fortune",
  },
  daeun: {
    name: "인생 대운 흐름",
    emoji: "🌊",
    price: price(process.env.NEXT_PUBLIC_PRICE_DAEUN, 2900),
    orderName: "냥신 점괘 · 인생 대운 흐름",
    pitch: "10년마다 바뀌는 운 · 지금 대운 · 황금기와 고비 · 교운기 · 앞으로 3년",
    category: "fortune",
  },
};

/** 재회운 · 배우자운 · 사주 · 대운: chart readings with their own interview (not the love engine). */
export const isFortune = (mode: Mode): mode is FortuneMode => mode !== "solo" && mode !== "couple";

export const productOf = (mode: Mode) => PRODUCTS[mode];
export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** Client-side flag. When true, the payment modal bypasses the PG and unlocks instantly. */
export const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE !== "false";

export const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
/** Kakao JavaScript key (public by design: it ships in the page and is locked to the registered web domains). */
export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "25000b6441c29a58f1ce4ede8d0726f7";

export const BUSINESS = {
  company: "넥스트원",
  rep: "이용훈",
  bizId: "110-40-19781",
  ecommerceNo: "제 2025-경북구미-0987 호",
  address: "경상북도 구미시 송원서로6길 (원평동)",
  phone: "010-2375-9914",
  email: "chemickok@gmail.com",
  hosting: "Vercel Inc.",
} as const;
