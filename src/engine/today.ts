import "server-only";
import { ANIMALS, SAMHAP, branchRelation, dayCycleIndex } from "./saju";
import { type TenGod, BRANCHES_HANGUL, BRANCH_ELEMENT, GROUP_OF, STEMS_HANGUL, buildChart, elementValue, tenGod } from "./fortune/chart";
import { LUCK } from "./fortune/common";
import { seedOf } from "./profile";

/**
 * 오늘의 운세 — free, daily. Today's 일진 (day pillar) read against the user's chart: the 십성 it brings sets the
 * theme, the 일지 relation adds or takes away, and the 용신 gives the lucky color / direction. Same answer all day.
 */

type Cat = "money" | "love" | "work" | "health";

/** What today's 십성 means for one day: headline, a line, do / don't, and how each area leans. */
const DAY: Record<TenGod, { title: string; line: string; do: string; dont: string; lean: Record<Cat, number> }> = {
  비견: {
    title: "내 힘으로 밀고 가는 날",
    line: "남 눈치 볼 필요 없는 날이다냥. 하던 일 밀어붙여라냥.",
    do: "혼자 끝낼 일 하나 끝내기",
    dont: "돈 빌려주기",
    lean: { money: -4, love: 0, work: 6, health: 4 },
  },
  겁재: {
    title: "지갑을 지켜야 하는 날",
    line: "나갈 돈이 생기는 날이다냥. 충동구매만 참으면 무난하다냥.",
    do: "약속 전에 예산 정하기",
    dont: "남 따라 사기",
    lean: { money: -10, love: 2, work: 2, health: 0 },
  },
  식신: {
    title: "먹을 복 있는 날",
    line: "마음이 편하고 입이 즐거운 날이다냥. 미뤄 둔 걸 시작해도 된다냥.",
    do: "맛있는 거 먹고 좋아하는 일 하기",
    dont: "과식",
    lean: { money: 4, love: 6, work: 4, health: 6 },
  },
  상관: {
    title: "말이 잘 먹히는 날",
    line: "재치가 터지는 날이다냥. 대신 윗사람한테 한마디 조심해라냥.",
    do: "발표·제안·고백",
    dont: "홧김에 하는 말",
    lean: { money: 2, love: 6, work: -2, health: -2 },
  },
  편재: {
    title: "뜻밖의 돈이 도는 날",
    line: "기회가 굴러오는 날이다냥. 움직이는 만큼 생긴다냥.",
    do: "약속 잡고 밖으로 나가기",
    dont: "큰돈 한 번에 걸기",
    lean: { money: 10, love: 4, work: 4, health: -2 },
  },
  정재: {
    title: "차곡차곡 쌓이는 날",
    line: "작은 돈이 모이고 일이 정리되는 날이다냥.",
    do: "가계부·정리·저축",
    dont: "한 방 노리기",
    lean: { money: 8, love: 2, work: 6, health: 2 },
  },
  편관: {
    title: "버티면 이기는 날",
    line: "압박이 오는 날이다냥. 피하지 말고 정면으로 받으면 넘어간다냥.",
    do: "급한 일부터 처리하기",
    dont: "무리한 운동·과로",
    lean: { money: -2, love: -4, work: 4, health: -8 },
  },
  정관: {
    title: "인정받는 날",
    line: "반듯하게 하면 보상이 오는 날이다냥. 사람들이 너를 본다냥.",
    do: "약속 시간 칼같이 지키기",
    dont: "규칙 어기기",
    lean: { money: 4, love: 6, work: 10, health: 2 },
  },
  편인: {
    title: "생각이 깊어지는 날",
    line: "혼자 있고 싶은 날이다냥. 공부·계획엔 최고다냥.",
    do: "책 읽기·계획 세우기",
    dont: "혼자 끙끙 앓기",
    lean: { money: -2, love: -4, work: 4, health: 0 },
  },
  정인: {
    title: "도움이 들어오는 날",
    line: "누가 손을 내미는 날이다냥. 부탁하면 들어준다냥.",
    do: "문서·계약·부탁",
    dont: "기대기만 하기",
    lean: { money: 2, love: 4, work: 6, health: 6 },
  },
};

const CAT_LINE: Record<Cat, [string, string, string]> = {
  // [good, so-so, careful]
  money: ["돈 들어올 구멍이 보인다냥.", "들어온 만큼 나간다냥.", "지갑 단속해라냥."],
  love: ["연락 오면 반갑게 받아라냥.", "평소처럼만 하면 된다냥.", "오늘은 말 한마디 조심해라냥."],
  work: ["하는 만큼 티가 난다냥.", "무난하게 흘러간다냥.", "실수 한 번 더 확인해라냥."],
  health: ["몸이 가볍다냥.", "잠만 잘 자면 된다냥.", "무리하면 탈 난다냥."],
};

/** Three blocks of the day, each read by the hour branch at its middle (巳 · 未 · 戌). */
const SLOTS = [
  { label: "오전", branch: 5, good: "중요한 일은 오전에 끝내라냥.", low: "오전엔 실수 한 번 더 확인해라냥." },
  { label: "오후", branch: 7, good: "약속·미팅은 오후가 좋다냥.", low: "오후엔 무리하지 말고 쉬어 가라냥." },
  { label: "저녁", branch: 10, good: "저녁에 좋은 연락이 온다냥.", low: "저녁엔 일찍 들어가라냥." },
];

const TIMES = ["오전 7~9시", "오전 9~11시", "낮 11~1시", "오후 1~3시", "오후 3~5시", "저녁 5~7시", "밤 7~9시"];

export interface TodayFortune {
  date: string; // "10월 28일"
  ganji: string; // "무술일"
  score: number;
  title: string;
  line: string;
  cats: { key: Cat; label: string; score: number; line: string }[];
  do: string;
  dont: string;
  color: string;
  direction: string;
  number: string;
  time: string;
  /** 오전 · 오후 · 저녁, read off the hour branch each block sits in */
  slots: { label: string; score: number; line: string }[];
  outfit: string;
  food: string;
}

export interface ZodiacToday {
  animal: string;
  score: number;
  line: string;
}

function today(now: Date) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const idx = dayCycleIndex(y, m, d);
  return { y, m, d, stem: idx % 10, branch: idx % 12, key: `${y}-${m}-${d}` };
}

const clamp = (n: number) => Math.max(42, Math.min(98, Math.round(n)));

export function todayFortune(birthdate: string, now = new Date()): TodayFortune | null {
  const c = buildChart(birthdate, "", "female");
  if (!c) return null;
  const t = today(now);
  const god = tenGod(c.dayStem, t.stem);
  const day = DAY[god];
  const rel = branchRelation(c.dayBranch, t.branch);
  const together = SAMHAP.some((g) => g.includes(c.dayBranch) && g.includes(t.branch)) && c.dayBranch !== t.branch;
  const seed = seedOf(`${birthdate}|${t.key}`);
  const bonus = rel === "harmony" ? 8 : together ? 5 : rel === "clash" ? -10 : 0;
  const base = 70 + bonus + ((seed % 9) - 4);
  const cats = (["money", "love", "work", "health"] as Cat[]).map((key, i) => {
    const score = clamp(base + day.lean[key] + (((seed >> (i * 3)) % 7) - 3));
    return { key, label: { money: "재물운", love: "연애운", work: "일·학업운", health: "건강운" }[key], score, line: CAT_LINE[key][score >= 78 ? 0 : score >= 62 ? 1 : 2] };
  });
  const L = LUCK[c.yongsin];
  return {
    date: `${t.m}월 ${t.d}일`,
    ganji: `${STEMS_HANGUL[t.stem]}${BRANCHES_HANGUL[t.branch]}일`,
    score: clamp(base + 2),
    title: day.title,
    line: [
      day.line,
      rel === "harmony"
        ? "게다가 오늘은 네 일지와 합이 드는 날이라 일이 술술 붙는다냥."
        : rel === "clash"
          ? "다만 오늘은 네 일지와 충이 드는 날이다냥. 이동·약속은 여유 있게 잡아라냥."
          : null,
    ]
      .filter(Boolean)
      .join(" "),
    cats,
    do: day.do,
    dont: day.dont,
    color: L.color.split("·")[0],
    direction: L.direction,
    number: L.numbers.split("·")[seed % 2] ?? L.numbers,
    time: TIMES[(seed >> 4) % TIMES.length],
    slots: SLOTS.map((sl, i) => {
      const r = branchRelation(c.dayBranch, sl.branch);
      const sc = clamp(base + elementValue(c, BRANCH_ELEMENT[sl.branch]) * 5 + (r === "harmony" ? 7 : r === "clash" ? -9 : 0) + (((seed >> (i + 9)) % 5) - 2));
      return { label: sl.label, score: sc, line: sc >= 78 ? sl.good : sc >= 62 ? "무난하게 흘러간다냥." : sl.low };
    }),
    outfit: `${L.color.split("·")[0]} 포인트 하나 — 양말·가방·폰 케이스면 충분하다냥`,
    food: L.food,
  };
}

/** 띠별 오늘의 운세: today's 일지 against each 띠. */
export function zodiacToday(now = new Date()): { date: string; ganji: string; list: ZodiacToday[] } {
  const t = today(now);
  const list = ANIMALS.map((animal, b) => {
    const rel = branchRelation(b, t.branch);
    const together = SAMHAP.some((g) => g.includes(b) && g.includes(t.branch)) && b !== t.branch;
    const seed = seedOf(`${animal}|${t.key}`);
    const score = clamp((rel === "harmony" ? 88 : together ? 82 : rel === "clash" ? 52 : b === t.branch ? 74 : 66) + ((seed % 9) - 4));
    const line =
      rel === "harmony"
        ? "오늘의 기운과 합이 든다냥. 부탁하면 다 들어준다냥."
        : together
          ? "같은 편 기운이 드는 날이다냥. 사람이 돕는다냥."
          : rel === "clash"
            ? "오늘 기운과 부딪친다냥. 서두르지 말고 한 번 더 확인해라냥."
            : b === t.branch
              ? "오늘이 네 띠의 날이다냥. 내 페이스대로 가면 된다냥."
              : ["평범한 하루다냥. 작은 친절이 돌아온다냥.", "무난한 날이다냥. 미뤄 둔 연락 하나 해라냥.", "조용한 날이다냥. 일찍 자면 내일이 가볍다냥."][seed % 3];
    return { animal, score, line };
  });
  return { date: `${t.m}월 ${t.d}일`, ganji: `${STEMS_HANGUL[t.stem]}${BRANCHES_HANGUL[t.branch]}일`, list };
}

// ───────────── 합격 부적 · 시험날 일진 ─────────────

const EXAM: Record<TenGod, { title: string; line: string; tip: string }> = {
  정인: { title: "공부한 게 머리에 붙는 날", line: "공부 기운(정인)이 드는 날이다냥. 아는 문제는 다 맞힌다냥.", tip: "첫 문제에서 막히면 바로 넘겨라냥. 돌아오면 풀린다냥." },
  편인: { title: "감이 맞는 날", line: "직감(편인)이 살아나는 날이다냥. 헷갈리면 처음 고른 답이 맞다냥.", tip: "답 고친 문제는 두 번만 확인하고 손 떼라냥." },
  정관: {
    title: "합격의 별이 뜨는 날",
    line: "합격의 별(정관)이 뜨는 날이다냥. 반듯하게 준비한 만큼 그대로 나온다냥.",
    tip: "수험표·신분증부터 챙겨라냥. 규칙대로 하면 이긴다냥.",
  },
  편관: {
    title: "긴장이 집중이 되는 날",
    line: "압박의 별(편관)이 드는 날이다냥. 떨리는 만큼 집중력이 올라간다냥.",
    tip: "시작 전 숨 네 번 — 넷 세고 들이쉬고, 넷 세고 내쉬어라냥.",
  },
  식신: { title: "실력이 술술 나오는 날", line: "실력이 편하게 나오는 날(식신)이다냥. 평소처럼만 하면 된다냥.", tip: "점심은 평소 먹던 걸로 가볍게 먹어라냥." },
  상관: { title: "머리가 번뜩이는 날", line: "머리가 번뜩이는 날(상관)이다냥. 서술형·면접에 강하다냥.", tip: "답안 옮겨 적기, 마지막에 한 번 더 확인해라냥." },
  정재: { title: "꼼꼼함이 점수가 되는 날", line: "꼼꼼함(정재)이 점수가 되는 날이다냥. 시간 배분만 지키면 된다냥.", tip: "시계를 보고 교시마다 마지막 10분은 검토에 써라냥." },
  편재: { title: "판을 넓게 보는 날", line: "넓게 보는 눈(편재)이 뜨는 날이다냥. 쉬운 문제부터 쓸어 담아라냥.", tip: "한 문제에 3분 넘게 붙잡지 마라냥." },
  비견: { title: "버티는 힘이 센 날", line: "버티는 힘(비견)이 센 날이다냥. 마지막 교시까지 체력이 남는다냥.", tip: "쉬는 시간엔 답 맞춰 보지 말고 다음 과목만 봐라냥." },
  겁재: { title: "승부욕이 불붙는 날", line: "승부욕(겁재)이 불붙는 날이다냥. 남 신경 끄면 네 실력이 다 나온다냥.", tip: "옆 사람 넘기는 소리는 무시해라냥. 네 속도로 가라냥." },
};

const EXAM_TIME: Record<string, string> = {
  wood: "아침 첫 시간",
  fire: "오전 늦게",
  earth: "점심 먹은 직후",
  metal: "오후",
  water: "늦은 오후",
};

export interface ExamDay {
  date: string; // "11월 19일 (목)"
  ganji: string;
  god: TenGod;
  score: number;
  title: string;
  line: string;
  tip: string;
  color: string;
  item: string;
  time: string;
  food: string;
}

/** 시험날 일진 against the chart: the 십성 the day brings, 합/충 with the 일지, and the 용신 for color / time. */
export function examDay(birthdate: string, date: string): ExamDay | null {
  const c = buildChart(birthdate, "", "female");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!c || !m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const idx = dayCycleIndex(y, mo, d);
  const stem = idx % 10;
  const branch = idx % 12;
  const god = tenGod(c.dayStem, stem);
  const rel = branchRelation(c.dayBranch, branch);
  const seed = seedOf(`${birthdate}|exam|${date}`);
  const g = GROUP_OF[god];
  const base = 74 + (g === "인성" || g === "관성" ? 8 : g === "식상" ? 5 : g === "비겁" ? 2 : 0) + (rel === "harmony" ? 6 : rel === "clash" ? -6 : 0) + ((seed % 7) - 3);
  const e = EXAM[god];
  const L = LUCK[c.yongsin];
  const color = L.color.split("·")[0];
  const weekday = "일월화수목금토"[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return {
    date: `${mo}월 ${d}일 (${weekday})`,
    ganji: `${STEMS_HANGUL[stem]}${BRANCHES_HANGUL[branch]}일`,
    god,
    score: Math.max(70, Math.min(98, base)),
    title: e.title,
    line: [
      e.line,
      rel === "harmony"
        ? "게다가 네 일지와 합이 드는 날이라 운이 붙는다냥."
        : rel === "clash"
          ? "다만 네 일지와 충이 드는 날이다냥. 전날 일찍 자고, 집에서 20분 일찍 나서라냥."
          : null,
    ]
      .filter(Boolean)
      .join(" "),
    tip: e.tip,
    color,
    item: `${color} 손수건이나 필통`,
    time: EXAM_TIME[c.yongsin],
    food: L.food,
  };
}
