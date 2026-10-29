import type { FortuneMode, Mode } from "@/models/types";

/**
 * 복채는 냥(兩)으로 낸다: the old coin unit, and what a cat says. Coins are charged into a 복주머니 in packs and spent
 * one reading at a time; a guest can also buy exactly what one reading costs, on the spot.
 * Change the packs and costs here (next deploy).
 */
export interface CoinPack {
  id: string;
  coins: number;
  /** 원 */
  price: number;
  tag?: string;
}

export const COIN_PACKS: CoinPack[] = [
  { id: "n1", coins: 1, price: 990 },
  { id: "n2", coins: 2, price: 1490, tag: "궁합 한 번" },
  { id: "n5", coins: 5, price: 3490, tag: "인기" },
  { id: "n10", coins: 10, price: 5990, tag: "최대 혜택" },
];
export const packOf = (id: unknown) => COIN_PACKS.find((p) => p.id === id) ?? null;
/** What a guest pays to open one reading that costs `coins` (the smallest pack of exactly that size). */
const directPrice = (coins: number) => COIN_PACKS.find((p) => p.coins === coins)?.price ?? coins * COIN_PACKS[0].price;
/** Smallest pack that covers a shortfall. */
export const packFor = (need: number) => COIN_PACKS.find((p) => p.coins >= need) ?? COIN_PACKS[COIN_PACKS.length - 1];
export const nyang = (n: number) => `${n}냥`;
/** The part of a user id in a 충전 orderId (`c{coins}-{tag}-…`), binding the payment to whoever started it. */
export const chargeTag = (uid: string) => uid.replaceAll("-", "").slice(0, 10);

/** Gifts, given once. Only to accounts made with Kakao / Naver / Google, which can't be mass-produced like emails. */
export const WELCOME_COINS = 1;
/** 친구 초대: both get this when a friend's first social login came through your link; at most INVITE_LIMIT friends. */
export const INVITE_COINS = 1;
export const INVITE_LIMIT = 20;

/** 상품. `coins` is what one full reading costs; `price` is the same reading bought directly by a guest. */
export interface Product {
  name: string;
  emoji: string;
  coins: number;
  price: number;
  orderName: string;
  pitch: string;
  /** 연애 점괘 (love interview) or 사주·운세 (chart readings) — the landing menu groups by this */
  category: "love" | "fortune";
}

const GAN = "갑을병정무기경신임계";
const JI = "자축인묘진사오미신유술해";
/** The year a 신년운세 reads: from October on, people want next year's. */
export function newYearOf(now = new Date()): number {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  return k.getUTCMonth() >= 9 ? k.getUTCFullYear() + 1 : k.getUTCFullYear();
}
export const yearGanji = (y: number) => GAN[(((y - 4) % 10) + 10) % 10] + JI[(((y - 4) % 12) + 12) % 12];
const NY = newYearOf();

export const PRODUCTS: Record<Mode, Product> = {
  solo: {
    name: "내 연애 팔자",
    emoji: "🐾",
    coins: 1,
    price: directPrice(1),
    orderName: "냥신 점괘 · 내 연애 팔자",
    pitch: "내 연애 유형 · 찰떡 궁합 · 반복하는 실수 · 이번 달 인연 날짜",
    category: "love",
  },
  couple: {
    name: "그 사람과 궁합",
    emoji: "💞",
    coins: 2,
    price: directPrice(2),
    orderName: "냥신 점괘 · 그 사람과 궁합",
    pitch: "궁합 점수 · 그 사람 속마음 · 보내지 못한 편지 · 이별 위기",
    category: "love",
  },
  reunion: {
    name: "재회운",
    emoji: "🔁",
    coins: 1,
    price: directPrice(1),
    orderName: "냥신 점괘 · 재회운",
    pitch: "다시 만날 가능성 · 그 사람 마음 온도 · 연락해도 되는 날짜 · 첫 문장",
    category: "love",
  },
  spouse: {
    name: "미래 배우자운",
    emoji: "💍",
    coins: 1,
    price: directPrice(1),
    orderName: "냥신 점괘 · 미래 배우자운",
    pitch: "배우자 자리로 보는 성격·외모·직업 · 만나는 해와 달 · 만나는 곳",
    category: "love",
  },
  newyear: {
    name: `${NY} 신년운세`,
    emoji: "🎍",
    coins: 1,
    price: directPrice(1),
    orderName: `냥신 점괘 · ${NY} 신년운세`,
    pitch: `${NY} ${yearGanji(NY)}년 총운 · 12달 흐름 · 좋은 달·조심할 달 · 삼재 · 재물·연애·일·건강`,
    category: "fortune",
  },
  saju: {
    name: "타고난 사주 팔자",
    emoji: "📜",
    coins: 1,
    price: directPrice(1),
    orderName: "냥신 점괘 · 타고난 사주 팔자",
    pitch: "타고난 그릇 · 재물 · 일과 적성 · 건강 · 귀인 · 올해·내년 · 개운법",
    category: "fortune",
  },
  daeun: {
    name: "인생 대운 흐름",
    emoji: "🌊",
    coins: 1,
    price: directPrice(1),
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
