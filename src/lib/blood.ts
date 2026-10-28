import type { BloodType } from "@/models/types";

export const BLOOD_TYPES: BloodType[] = ["A", "B", "O", "AB"];

export const normalizeBlood = (v: unknown): BloodType | "" => (BLOOD_TYPES.includes(v as BloodType) ? (v as BloodType) : "");

export const BLOOD_CHIP: Record<BloodType, string> = { A: "🅰️ A형", B: "🅱️ B형", O: "🅾️ O형", AB: "🆎 AB형" };
/** One word under each chip in the interview dock. */
export const BLOOD_HINT: Record<BloodType, string> = { A: "섬세", B: "직진", O: "의리", AB: "반전" };

/** 냥신's reaction in the interview. */
export const BLOOD_REACT: Record<BloodType, string> = {
  A: "A형이구냥. 겉으론 무던한데 속으론 다 기억하는 타입이다냥.",
  B: "B형이구냥. 꽂히면 직진이지? 사주랑 같이 보면 더 재밌다냥.",
  O: "O형이구냥. 판을 이끄는 기운이 있다냥.",
  AB: "AB형이구냥… 속을 두 겹으로 감추는 타입이다냥.",
};

/** 연애 기질 by 혈액형 (shown next to the 일간 reading). */
export const BLOOD_LOVE: Record<BloodType, string> = {
  A: "A형은 연애에서 확인받아야 안심하는 타입이다냥. 작은 변화도 다 눈에 들어온다냥.",
  B: "B형은 좋으면 직진, 식으면 미련 없이 돈다냥. 자유를 존중받아야 오래 간다냥.",
  O: "O형은 한번 내 사람이면 끝까지 책임지는 타입이다냥. 대신 서운한 건 티 안 내고 쌓아 둔다냥.",
  AB: "AB형은 다가오면 물러서고, 멀어지면 궁금해하는 타입이다냥. 속도 조절이 연애의 열쇠다냥.",
};

/** 혈액형 × 신강/신약: [신강, 신약]. */
export const BLOOD_CHART: Record<BloodType, [string, string]> = {
  A: ["A형에 신강 사주다냥. 겉은 조심스러운데 한번 정하면 안 꺾인다냥.", "A형에 신약 사주다냥. 남 눈치를 두 번 본다냥. 그래서 결정이 늦다냥."],
  B: ["B형에 신강 사주다냥. 하고 싶은 건 해야 직성이 풀린다냥.", "B형에 신약 사주다냥. 마음 가는 대로 달리다 쉽게 지친다냥."],
  O: ["O형에 신강 사주다냥. 판을 이끄는 우두머리 기질이다냥.", "O형에 신약 사주다냥. 사람을 챙기다 정작 자기는 못 챙긴다냥."],
  AB: ["AB형에 신강 사주다냥. 남들이 못 따라오는 자기 세계가 확실하다냥.", "AB형에 신약 사주다냥. 진짜 마음은 딱 한 사람한테만 연다냥."],
};

/** 잘 맞는 혈액형 (popular pairing lore). */
export const BLOOD_MATCH: Record<BloodType, BloodType[]> = { A: ["O", "A"], B: ["O", "AB"], O: ["A", "B"], AB: ["B", "AB"] };
