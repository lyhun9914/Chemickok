import { won } from "@/lib/config";
import { MODES, directPriceIn, type Pricing } from "@/lib/pricing";
import type { Mode } from "@/models/types";

/**
 * 가격을 바꾸면 사이트 화면은 저절로 따라가지만, 사이트 밖에 적어 둔 가격(인스타 DM 자동 답변, 릴스 캡션·영상,
 * 토스에 낸 결제경로)은 사람이 고쳐야 한다. 무엇이 바뀌었는지 보고 고칠 곳과 새 문구를 만든다.
 * 인스타 문구는 실제로 등록해 둔 문구와 같은 틀이다(바꾸면 여기도 같이 바꾼다).
 */
export interface FollowUp {
  /** 어디를 고치나 */
  where: string;
  /** 왜, 어떻게 */
  why: string;
  /** 그대로 붙여 넣을 새 문구 */
  text?: string;
}

const SHORT: Record<Mode, string> = {
  solo: "연애 팔자",
  couple: "궁합",
  reunion: "재회운",
  spouse: "배우자운",
  newyear: "신년운세",
  saju: "사주",
  daeun: "대운",
};

/** 은/는: by the last syllable's 받침 */
const eunNeun = (word: string) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "은" : "는";
};

const coinsWon = (pr: Pricing, coins: number) => `${coins}냥(${won(directPriceIn(pr, coins))})`;

/** 인스타 DM 추가 질문 "가격이 얼마예요?"의 답 */
export function priceAnswer(pr: Pricing): string {
  const costs = MODES.map((m) => pr.costs[m]);
  const min = Math.min(...costs);
  const groups = [...new Set(costs.filter((c) => c > min))]
    .sort((a, b) => a - b)
    .map((c) => {
      const names = MODES.filter((m) => pr.costs[m] === c).map((m) => SHORT[m]).join(" · ");
      return `${names}${eunNeun(names)} ${coinsWon(pr, c)}`;
    });
  const readings = groups.length ? `점괘 하나 ${coinsWon(pr, min)}부터, ${groups.join(", ")}이에요.` : `모든 점괘가 ${coinsWon(pr, min)}이에요.`;
  const packs = pr.packs.map((p) => `${p.coins}냥 ${won(p.price)}`).join(" · ");
  return `기본 풀이는 무료고, 전체 감정서만 냥으로 열어요. ${readings} 냥은 ${packs}으로 충전할 수 있어요.`;
}

/** 인스타 DM 질문 "무료인가요?"의 답 */
export function freeAnswer(pr: Pricing): string {
  const first = pr.packs[0];
  return `할까? 말까? 타로 · 일주 고양이 도감 · 합격 부적은 무료예요. 다른 점괘도 기본 풀이는 무료고, 전체 감정서만 냥(${first.coins}냥 ${won(first.price)}부터)으로 열어요.`;
}

/** 0 = nothing a customer sees changed (only a tag, or nothing at all). */
export function priceFollowUps(before: Pricing, after: Pricing): FollowUp[] {
  const packKey = (p: Pricing) => p.packs.map((x) => `${x.coins}:${x.price}`).join(",");
  const packsChanged = packKey(before) !== packKey(after);
  const changedModes = MODES.filter((m) => before.costs[m] !== after.costs[m] || directPriceIn(before, before.costs[m]) !== directPriceIn(after, after.costs[m]));
  if (!packsChanged && !changedModes.length) return [];

  const out: FollowUp[] = [
    {
      where: "인스타 DM › 자주 묻는 질문 › 추가 질문 ‘가격이 얼마예요?’",
      why: "답에 점괘별 냥과 충전 묶음 가격이 적혀 있어요. 아래 문구로 바꿔 주세요.",
      text: priceAnswer(after),
    },
  ];
  const a = before.packs[0];
  const b = after.packs[0];
  if (a.coins !== b.coins || a.price !== b.price) {
    out.push({ where: "인스타 DM › 자주 묻는 질문 ‘무료인가요?’", why: "답에 가장 싼 충전 묶음 가격이 적혀 있어요.", text: freeAnswer(after) });
  }
  if (changedModes.includes("newyear")) {
    out.push({
      where: "릴스 ④ 2027 신년운세 캡션",
      why: "캡션의 가격 줄을 바꿔 주세요. 이미 올린 릴스는 게시물 ⋯ › 수정에서 고칠 수 있어요.",
      text: `기본 풀이는 무료, 전체 감정서는 ${coinsWon(after, after.costs.newyear)}`,
    });
  }
  if (changedModes.includes("couple")) {
    out.push({
      where: "릴스 ⑤ 그 사람과 궁합 캡션",
      why: "캡션의 가격 줄을 바꿔 주세요. 이미 올린 릴스는 게시물 ⋯ › 수정에서 고칠 수 있어요.",
      text: `기본 풀이는 무료, 그 사람 속마음까지 ${coinsWon(after, after.costs.couple)}`,
    });
  }
  if (changedModes.some((m) => before.costs[m] !== after.costs[m])) {
    out.push({
      where: "릴스 영상",
      why: "영상 속 상품 목록과 결제 버튼에 예전 냥이 보여요. 아직 안 올린 영상은 Claude에게 다시 녹화를 부탁하세요. 이미 올린 영상은 그대로 두되 캡션의 가격을 고쳐 주세요.",
    });
  }
  if (packsChanged) {
    out.push({
      where: "토스페이먼츠",
      why: "충전 묶음 가격이 심사 때 낸 결제경로(1냥 990원 ~ 10냥 5,990원)와 달라졌어요. 크게 바꿨다면 토스 고객센터(1544-7772)에 알려 두는 게 안전해요.",
    });
  }
  const over = after.packs.filter((p) => p.price > 100_000);
  if (over.length) {
    out.push({
      where: "⚠️ 토스 포인트충전 조건",
      why: `충전 묶음은 10만 원 이하여야 해요. ${over.map((p) => `${p.coins}냥 ${won(p.price)}`).join(", ")}을(를) 10만 원 이하로 다시 정해 주세요.`,
    });
  }
  return out;
}

/** The same list as a plain-text mail body. */
export function followUpMail(items: FollowUp[], site: string): string {
  return [
    "냥신 점괘의 가격을 바꿨어요. 사이트 화면은 저절로 바뀌었고, 사이트 밖에 적어 둔 가격은 직접 고쳐야 해요.",
    "",
    ...items.flatMap((f, i) => [`${i + 1}. ${f.where}`, `   ${f.why}`, ...(f.text ? ["   새 문구:", `   ${f.text}`] : []), ""]),
    `관리자 화면(가격·세일 탭)에서도 같은 목록과 복사 버튼을 볼 수 있어요: ${site}/admin`,
  ].join("\n");
}
