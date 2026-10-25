export const PRODUCT = {
  price: 990,
  orderName: "연애 케미 & 속마음 리포트 (전체)",
} as const;

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
