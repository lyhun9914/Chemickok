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

/** 오늘의 운세: blood type × the 십성 group today's 일진 brings. */
export const BLOOD_DAY: Record<BloodType, Record<"비겁" | "식상" | "재성" | "관성" | "인성", string>> = {
  A: {
    비겁: "A형은 오늘 남과 비교하는 마음이 커진다냥. 네 속도대로 가면 이긴다냥.",
    식상: "A형인데 오늘은 말이 술술 나온다냥. 미뤄 둔 연락 하나 해라냥.",
    재성: "A형의 꼼꼼함이 돈이 되는 날이다냥. 영수증 한 번 더 봐라냥.",
    관성: "A형은 오늘 눈치가 두 배로 보인다냥. 칭찬받을 일이 생긴다냥.",
    인성: "A형은 오늘 생각이 깊어진다냥. 결정은 저녁에 해라냥.",
  },
  B: {
    비겁: "B형 고집이 오늘 더 세진다냥. 한 번만 져 주면 판이 풀린다냥.",
    식상: "B형 재치가 터지는 날이다냥. 분위기 메이커는 너다냥.",
    재성: "B형 촉이 돈 냄새를 맡는 날이다냥. 단, 지르기 전에 하루 재워라냥.",
    관성: "B형에겐 답답한 날이다냥. 규칙 하나만 지키면 무난하다냥.",
    인성: "B형이 오늘은 조용해진다냥. 혼자 있는 시간이 약이다냥.",
  },
  O: {
    비겁: "O형 리더 기질이 살아나는 날이다냥. 사람들이 너를 따른다냥.",
    식상: "O형은 오늘 베풀수록 돌아온다냥. 밥 한 번 사라냥.",
    재성: "O형 추진력이 돈을 부르는 날이다냥. 미룬 일부터 처리해라냥.",
    관성: "O형은 오늘 책임질 일이 생긴다냥. 맡으면 인정받는다냥.",
    인성: "O형은 오늘 누군가에게 기대도 되는 날이다냥. 혼자 다 하지 마라냥.",
  },
  AB: {
    비겁: "AB형 두 얼굴이 빛나는 날이다냥. 겉은 차분, 속은 계산 끝이다냥.",
    식상: "AB형 아이디어가 번뜩이는 날이다냥. 떠오르면 바로 메모해라냥.",
    재성: "AB형 계산이 정확한 날이다냥. 손해 보는 거래는 바로 보인다냥.",
    관성: "AB형은 오늘 선을 잘 그어야 한다냥. 거절도 실력이다냥.",
    인성: "AB형 직감이 맞는 날이다냥. 처음 느낌을 믿어라냥.",
  },
};

/** 합격 부적: how each blood type wins on exam day. */
export const BLOOD_EXAM: Record<BloodType, string> = {
  A: "A형은 마지막 검토에서 점수를 번다냥. 교시마다 10분은 남겨라냥.",
  B: "B형은 첫 느낌이 정답일 때가 많다냥. 한 문제를 너무 오래 붙잡지 마라냥.",
  O: "O형은 아는 문제부터 쓸어 담을 때 강하다냥. 순서대로 풀지 마라냥.",
  AB: "AB형은 함정 문제를 잘 본다냥. 이상하다 싶으면 한 번 더 읽어라냥.",
};
