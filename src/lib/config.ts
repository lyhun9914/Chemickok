import type { Mode } from "@/models/types";

const price = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 100 ? n : fallback;
};

/**
 * 상품 · 가격. Change the numbers here, or override per deploy without code changes with
 * NEXT_PUBLIC_PRICE_SOLO / NEXT_PUBLIC_PRICE_COUPLE in Vercel (takes effect on the next deploy).
 */
export const PRODUCTS: Record<Mode, { name: string; emoji: string; price: number; orderName: string; pitch: string }> = {
  solo: {
    name: "내 연애 팔자",
    emoji: "🐾",
    price: price(process.env.NEXT_PUBLIC_PRICE_SOLO, 990),
    orderName: "냥신 점괘 · 내 연애 팔자",
    pitch: "내 연애 유형 · 찰떡 궁합 · 반복하는 실수 · 이번 달 인연 날짜",
  },
  couple: {
    name: "그 사람과 궁합",
    emoji: "💞",
    price: price(process.env.NEXT_PUBLIC_PRICE_COUPLE, 1900),
    orderName: "냥신 점괘 · 그 사람과 궁합",
    pitch: "궁합 점수 · 그 사람 속마음 · 보내지 못한 편지 · 이별 위기",
  },
};

export const productOf = (mode: Mode) => PRODUCTS[mode];
export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** Client-side flag. When true, the payment modal bypasses the PG and unlocks instantly. */
export const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE !== "false";

export const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";

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
