import "server-only";
import { ANIMALS } from "./saju";
import { zodiacToday } from "./today";

/** 띠 페이지: the 12 animals of the year pillar, who they get along with, and today's line from 띠별 운세. */

const TRAIT: { emoji: string; trait: string; love: string; work: string }[] = [
  {
    emoji: "🐭",
    trait: "영리하고 눈치가 빠르다냥. 기회를 남보다 먼저 알아채고, 한번 손에 쥔 건 쉽게 안 놓는다냥.",
    love: "마음을 쉽게 안 보여 주지만, 한번 정하면 살뜰하게 챙긴다냥. 연락은 계산하는 척해도 제일 먼저 확인한다냥.",
    work: "정보를 모으고 판을 읽는 일에 강하다냥. 숫자·기획·영업에서 빛난다냥.",
  },
  {
    emoji: "🐮",
    trait: "느려 보여도 끝까지 가는 뚝심이 있다냥. 약속을 지키고, 한번 마음먹은 건 안 바꾼다냥.",
    love: "연애는 천천히 시작하는데, 한번 사귀면 오래 간다냥. 말보다 꾸준함으로 사랑을 보여 준다냥.",
    work: "오래 쌓아야 빛나는 일에 맞다냥. 전문직·관리·기술직에서 믿음을 얻는다냥.",
  },
  {
    emoji: "🐯",
    trait: "앞장서야 숨이 쉬어지는 기질이다냥. 정의감이 강하고, 지는 걸 못 참는다냥.",
    love: "좋으면 직진이다냥. 고백도 먼저 하는 편이고, 연인한테는 든든한 방패가 되어 준다냥.",
    work: "판을 이끄는 자리에서 힘이 난다냥. 창업·리더·현장 지휘에 강하다냥.",
  },
  {
    emoji: "🐰",
    trait: "부드럽고 감각적이다냥. 분위기를 읽는 눈이 좋고, 다툼보다 조화를 고른다냥.",
    love: "설렘과 분위기에 약하다냥. 다정한 말 한마디에 마음이 열리고, 상처도 조용히 오래 간다냥.",
    work: "감각과 사람을 다루는 일에 맞다냥. 디자인·서비스·상담에서 빛난다냥.",
  },
  {
    emoji: "🐲",
    trait: "꿈과 스케일이 큰 기질이다냥. 자존심이 세고, 남들 앞에서 빛나는 걸 좋아한다냥.",
    love: "연애도 큰 그림을 그린다냥. 기대가 높아서, 상대가 그 그림을 같이 봐 주길 바란다냥.",
    work: "큰 판을 벌이는 일에 강하다냥. 기획·사업·무대에서 이름을 남긴다냥.",
  },
  {
    emoji: "🐍",
    trait: "생각이 깊고 집요하다냥. 겉으론 차분해도 속으로 다 계산하고 움직인다냥.",
    love: "질투를 숨기지만 다 보고 있다냥. 한번 믿으면 깊게 빠지고, 배신은 오래 기억한다냥.",
    work: "깊이 파고드는 일에 맞다냥. 연구·분석·전략에서 남다른 실력을 낸다냥.",
  },
  {
    emoji: "🐴",
    trait: "멈추면 답답한 자유로운 기질이다냥. 열정이 넘치고, 새로운 데로 먼저 달려간다냥.",
    love: "불같이 빠지고 식을 때도 빠르다냥. 숨 쉴 틈을 주는 사람 옆에서 오래 머문다냥.",
    work: "움직이고 사람을 만나는 일에 강하다냥. 영업·여행·방송·스포츠가 맞다냥.",
  },
  {
    emoji: "🐑",
    trait: "다정하고 정이 많다냥. 남을 먼저 챙기는데, 고집은 조용히 세다냥.",
    love: "챙겨 주는 연애를 한다냥. 서운함은 말 안 하고 쌓아 두니, 먼저 물어봐 주는 사람이 필요하다냥.",
    work: "사람을 돌보고 꾸미는 일에 맞다냥. 교육·예술·복지에서 빛난다냥.",
  },
  {
    emoji: "🐵",
    trait: "재주 많고 머리 회전이 빠르다냥. 재밌는 걸 좋아하고, 금방 질린다냥.",
    love: "재밌는 사람한테 끌린다냥. 지루해지면 마음이 먼저 떠나니, 함께 새로운 걸 해야 오래 간다냥.",
    work: "아이디어와 말재주가 필요한 일에 강하다냥. 마케팅·콘텐츠·IT가 맞다냥.",
  },
  {
    emoji: "🐔",
    trait: "깔끔하고 완벽주의다냥. 말 한마디도 정확해야 하고, 원칙을 중요하게 여긴다냥.",
    love: "기준이 높아 쉽게 안 빠진다냥. 대신 빠지면 깊고, 연인한테도 정성을 다한다냥.",
    work: "꼼꼼함이 무기인 일에 맞다냥. 회계·품질·법·디자인 마감에서 빛난다냥.",
  },
  {
    emoji: "🐶",
    trait: "의리가 센 기질이다냥. 내 사람은 끝까지 지키고, 거짓말을 제일 싫어한다냥.",
    love: "한 사람만 본다냥. 믿음이 깨지면 다시 붙이기 어려우니, 솔직한 사람이 맞다냥.",
    work: "사람을 지키고 책임지는 일에 강하다냥. 공공·보안·관리·팀 운영이 맞다냥.",
  },
  {
    emoji: "🐷",
    trait: "마음이 넓고 복이 많다냥. 태평해 보여도 사람을 끌어당기는 힘이 있다냥.",
    love: "다 퍼 주는 연애를 한다냥. 그래서 상처도 많으니, 받는 법도 배워야 한다냥.",
    work: "사람과 먹을 복이 붙는 일에 맞다냥. 요식·유통·서비스·재테크에 운이 있다냥.",
  },
];

/** 육합 partner of each branch. */
const HARMONY = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const SAMHAP = [
  [8, 0, 4],
  [11, 3, 7],
  [2, 6, 10],
  [5, 9, 1],
];

/** Birth years listed on the pages (a fixed range, so the pages can be built ahead of time). */
const FIRST_YEAR = 1944;
const LAST_YEAR = 2031;

export interface Tti {
  animal: string;
  emoji: string;
  trait: string;
  love: string;
  work: string;
  /** birth years (입춘 기준) */
  years: number[];
  best: string[];
  harmony: string;
  clash: string;
}

export function ttiAt(b: number): Tti {
  const group = SAMHAP.find((g) => g.includes(b))!.filter((x) => x !== b);
  const years: number[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) if ((((y - 4) % 12) + 12) % 12 === b) years.push(y);
  return {
    animal: ANIMALS[b],
    ...TRAIT[b],
    years,
    best: group.map((x) => ANIMALS[x]),
    harmony: ANIMALS[HARMONY[b]],
    clash: ANIMALS[(b + 6) % 12],
  };
}

export const allTti = (): Tti[] => ANIMALS.map((_, b) => ttiAt(b));

export const ttiByName = (animal: string): Tti | null => {
  const b = ANIMALS.indexOf(animal);
  return b < 0 ? null : ttiAt(b);
};

/** Today's line for this 띠 (KST). */
export function ttiToday(animal: string): { date: string; ganji: string; score: number; line: string } | null {
  const t = zodiacToday();
  const row = t.list.find((r) => r.animal === animal);
  return row ? { date: t.date, ganji: t.ganji, score: row.score, line: row.line } : null;
}
