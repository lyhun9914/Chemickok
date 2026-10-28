import "server-only";
import { BLOOD_CHART } from "@/lib/blood";
import type { ElementKey, FortuneBeat, FortuneTeaser, FullReport, QuestionnaireInput } from "@/models/types";
import { branchRelation } from "../saju";
import { type Chart, type TenGod, type TenGroup, GROUP_OF, dominantGroups, elementLabel, groupElement, thisYear, yearlyLuck } from "./chart";
import {
  GOD_SHORT,
  yearText,
  GROUP_STRONG,
  GROUP_WEAK,
  LUCK,
  ORGANS,
  SINSAL_TEXT,
  STEM,
  animalOfBranch,
  basisCard,
  gwiinAnimals,
  daNyang,
  josa,
  lines,
  locked,
  scoreWord,
  sec,
  sinsalList,
} from "./common";

// ───────────── 타고난 사주 팔자 ─────────────

const level = (n: number) => (n >= 2.5 ? "high" : n <= 0.5 ? "low" : "mid");

const SIBLING: Record<string, Record<"high" | "mid" | "low", string>> = {
  first: {
    high: "맏이에 사주까지 '나'가 강하다냥. 집안 기둥 노릇, 시켜서 한 게 아니라 팔자다냥.",
    mid: "맏이 노릇은 다 하는데, 속으론 누가 좀 챙겨 줬으면 하지?",
    low: "맏이인데 사주엔 네 편이 없다냥. 다 혼자 짊어졌지? 기댈 데가 없어서 단단해진 거다냥.",
  },
  middle: {
    high: "가운데 끼어서도 안 묻히는 팔자다냥. 형제 중에 고집은 네가 제일 세다냥.",
    mid: "눈치로 자란 사람이다냥. 방 분위기를 제일 먼저 읽는다냥.",
    low: "가운데서 늘 양보했지? 사주도 네 몫을 잘 안 챙긴다냥. 이제 네 몫부터 챙겨라냥.",
  },
  last: {
    high: "막내인데 맏이처럼 살았지? 사주에 '나'가 강해서, 집안 일은 결국 네가 정리한다냥.",
    mid: "막내지만 철은 일찍 들었다냥. 귀여움 받으면서도 속은 어른이다냥.",
    low: "막내 팔자 그대로다냥. 사랑받는 법을 안다냥. 대신 결정은 남한테 미룬다냥.",
  },
  only: {
    high: "외동에 '나'까지 강하다냥. 혼자가 제일 편하고, 혼자 다 해낸다냥.",
    mid: "혼자 컸는데 사람을 잘 챙긴다냥. 외로움을 아니까다냥.",
    low: "외동인데 사주도 외롭다냥. 친구 하나를 형제처럼 붙잡고 산다냥.",
  },
  complex: {
    high: "형제 자리가 복잡한 사주다냥. 말 못 할 사연에서 생긴 독립심이 네 무기다냥.",
    mid: "형제 자리가 복잡한 사주다냥. 집안 얘기는 아무한테나 안 하지?",
    low: "형제 자리가 복잡한 사주다냥. 그래서 일찍 혼자 서는 법을 배웠다냥.",
  },
};

/** 형제 answer skipped: read the 비겁 (형제·동료 자리) alone. */
const SIBLING_UNKNOWN: Record<"high" | "mid" | "low", string> = {
  high: "형제·친구 같은 '내 편' 기운이 강하다냥. 대신 그 사람들 일로 돈과 시간이 샌다냥.",
  mid: "형제 자리는 무난하다냥. 큰 덕도 큰 짐도 없이 각자 산다냥.",
  low: "형제 덕보다 네 힘으로 서는 팔자다냥. 일찍 혼자 서는 법을 배웠다냥.",
};

const PEOPLE_SAY: Record<string, [string, string]> = {
  // [신강, 신약]
  stubborn: ["고집 맞다냥. 사주가 신강이라 꺾이질 않는다냥.", "고집이 아니라 버팀이다냥. 신약 사주는 무너질까 봐 더 세게 버틴다냥."],
  kind: ["착하다는 말 뒤에 칼이 있다냥. 선 넘으면 끝이지?", "착한 게 아니라 거절을 못 하는 거다냥. 사주가 약해서 남 기운에 휩쓸린다냥."],
  sharp: ["똑 부러지는 거 맞다냥. 대신 너 자신한테 제일 엄격하다냥.", "똑 부러져 보이려고 애쓰는 거다냥. 집에 가면 녹초지?"],
  bright: ["밝은 거 진짜다냥. 근데 혼자 있을 땐 불이 꺼진다냥.", "밝은 건 버릇이다냥. 혼자 있을 때 제일 조용한 사람이다냥."],
  mystery: ["속을 안 보이는 건 자신 있어서다냥. 필요한 사람한테만 연다냥.", "속을 안 보이는 건 상처받기 싫어서다냥."],
  solid: ["든든한 거 맞다냥. 다들 너한테 기대는데, 너는 기댈 데가 없다냥.", "든든해 보이려고 버티는 거다냥. 사실 너도 기대고 싶다냥."],
};

const FIELD: Record<TenGroup, string> = {
  비겁: "독립·자영업·영업·운동",
  식상: "말·글·기술·창작·가르치는 일",
  재성: "사업·금융·유통·관리",
  관성: "조직·공직·대기업·법",
  인성: "연구·교육·자격증·전문직",
};

const JOB_FIT: Record<string, TenGroup[]> = {
  office: ["관성", "인성", "재성"],
  biz: ["비겁", "재성", "식상"],
  free: ["식상", "인성", "비겁"],
};

/** Which 세운 십성 explain each kind of year the person reported. */
const EVENT_GODS: Record<string, TenGod[]> = {
  move: ["상관", "편관", "편인", "겁재"],
  job: ["상관", "편관", "겁재", "편재", "편인"],
  breakup: ["상관", "겁재", "편관"],
  meet: ["정재", "편재", "정관", "편관", "식신"],
  sick: ["편관", "상관", "겁재"],
  loss: ["겁재", "편재", "비견", "상관"],
  family: ["편관", "편인", "겁재", "상관"],
  calm: ["비견", "정인", "식신", "정재"],
};
const EVENT_LABEL: Record<string, string> = {
  move: "이사했다",
  job: "일이 바뀌었다",
  breakup: "사람과 끝났다",
  meet: "좋은 인연을 만났다",
  sick: "아팠다",
  loss: "큰돈이 나갔다",
  family: "집안에 큰일이 있었다",
  calm: "별일 없었다",
};

const SEASON: Record<string, { warm: boolean; label: string }> = {
  spring: { warm: true, label: "봄" },
  summer: { warm: true, label: "한여름" },
  autumn: { warm: false, label: "가을" },
  winter: { warm: false, label: "한겨울" },
  between: { warm: false, label: "환절기" },
};

const FOCUS_LABEL: Record<string, string> = {
  money: "재물운",
  work: "일과 적성",
  love: "연애·결혼운",
  people: "사람과 귀인",
  health: "건강",
  life: "인생 전체",
};
const FOCUS_SECTION: Record<string, string> = {
  money: "money",
  work: "work",
  love: "love",
  people: "people",
  health: "health",
  life: "nature",
};

function spouseGroup(c: Chart): TenGroup | null {
  if (c.gender === "male") return "재성";
  if (c.gender === "female") return "관성";
  return null;
}

function maxElement(c: Chart): ElementKey {
  const e = c.saju.summary.elements;
  return (Object.keys(e) as ElementKey[]).reduce((a, b) => (e[b] > e[a] ? b : a));
}

function healthLines(c: Chart, ans: string | undefined): string[] {
  const weak = c.saju.summary.lacking;
  const over = maxElement(c);
  const out: string[] = [];
  if (ans && ans !== "none" && ans !== "?") {
    const el = ans as ElementKey;
    if (el === weak) out.push(`역시다냥. 사주에서 ${josa(elementLabel(weak), "이/가")} 제일 약하다냥. ${josa(ORGANS[weak], "이/가")} 네 약한 고리다냥.`);
    else if (el === over)
      out.push(`${elementLabel(over)} 기운이 넘쳐서 그렇다냥. 넘치는 기운은 몸에서 열과 뭉침으로 나온다냥. 그리고 사주가 따로 경고하는 자리는 ${daNyang(ORGANS[weak])}.`);
    else out.push(`지금은 거기가 신경 쓰인다고 했지. 근데 사주가 경고하는 자리는 따로 있다냥. ${daNyang(ORGANS[weak])}.`);
  } else {
    out.push(`사주가 미리 짚어 두는 자리는 ${daNyang(ORGANS[weak])}. 지금 멀쩡해도 무리하면 거기부터 온다냥.`);
  }
  if (over !== weak && ans !== over) out.push(`${josa(elementLabel(over), "이/가")} 넘쳐서 ${ORGANS[over]}도 무리하기 쉽다냥.`);
  return out;
}

function moneyLine(c: Chart, ans: string | undefined): string {
  const jae = level(c.groups.재성);
  const bi = level(c.groups.비겁);
  switch (ans) {
    case "self":
      return jae === "low"
        ? "자기한테 쓰는 거, 근데 재성이 약해서 쓰는 만큼 안 들어온다냥. 들어온 날 바로 떼어 놔라냥."
        : "자기한테 쓰는 거 괜찮다냥. 버는 그릇이 커서 써도 들어온다냥.";
    case "others":
      return bi === "high" ? "사주에 비겁이 강해서 형제·친구가 네 돈을 가져가는 구조다냥. 빌려주고 못 받은 돈, 있지?" : "정 때문에 나가는 돈이다냥. 거절을 못 해서 새는 거다냥.";
    case "invest":
      return c.groups.식상 + c.groups.재성 >= 3
        ? "굴리는 팔자 맞다냥. 대신 혼자 말고, 숫자 보는 사람을 옆에 둬라냥."
        : "네 사주는 굴리는 돈보다 쌓는 돈이다냥. 한 방은 한 방에 간다냥.";
    case "save":
      return c.groups.인성 >= 2.5
        ? "모아도 안심이 안 되지? 생각이 많은 사주라 그렇다냥. 통장 숫자보다 마음이 문제다냥."
        : "모으는 건 잘한다냥. 근데 아끼다 놓친 기회가 한 번 있었다냥.";
    case "debt": {
      const ease = yearlyLuck(c, 10).find((y) => GROUP_OF[y.god] === "재성" || y.score >= 72);
      return `빚 갚는 데 다 나간다고 했지. ${jae === "low" ? "재성이 약해서 돈이 머물 자리가 좁다냥. 이자 큰 것부터 끊어라냥." : "버는 힘은 있다냥. 순서만 잡으면 줄어든다냥."} ${ease ? `${ease.year}년부터 숨통이 트인다냥.` : "한 번에 말고 쪼개서 갚아라냥."}`;
    }
    case "leak":
      return c.gods.includes("겁재") ? "겁재가 있어서 남 따라 쓰는 돈이 크다냥. 같이 노는 사람이 바뀌면 돈이 남는다냥." : "구독·배달·충동구매다냥. 작은 게 모여 큰 구멍이 된다냥.";
    default:
      return jae === "high" ? "재성이 강하다냥. 돈 냄새를 맡는 코가 있다냥." : "재성이 약하다냥. 돈은 쫓으면 도망가고, 실력을 쌓으면 따라온다냥.";
  }
}

function jobLine(c: Chart, ans: string | undefined): string {
  const { top } = dominantGroups(c);
  const field = FIELD[top];
  const fit = JOB_FIT[ans ?? ""];
  if (fit) {
    if (fit.includes(top)) {
      return ans === "office"
        ? "조직이 맞는 팔자 맞다냥. 버티면 자리가 따라 올라온다냥."
        : ans === "biz"
          ? "장사 체질 맞다냥. 남 밑에 있었으면 진작 터졌다냥."
          : "자기 재주로 먹고사는 팔자 맞다냥. 이름이 곧 간판이다냥.";
    }
    return ans === "office"
      ? `회사가 답답하지? 사주는 ${field} 쪽이다냥. 회사에 있어도 네 이름 걸린 일을 맡아라냥.`
      : ans === "biz"
        ? `사업보다 ${field} 쪽 그릇이다냥. 동업 말고 계약으로 가라냥.`
        : `혼자 하는 게 편하지만, 사주는 ${field} 쪽에서 더 크게 핀다냥.`;
  }
  if (ans === "study") return `지금 고르는 길이 평생 간다냥. 사주는 ${field} 쪽이다냥.`;
  if (ans === "home") return `집을 지키는 지금도 네 그릇은 ${daNyang(field)}. 작게라도 네 이름으로 하는 일을 시작해라냥.`;
  if (ans === "rest") return `갈림길이구냥. 다음 자리는 ${field} 쪽이다냥.`;
  if (ans === "retired") return `은퇴했다고 했지. 그래도 네 그릇은 ${daNyang(field)}. 작게라도 손을 놓지 않는 게 노후 보약이다냥.`;
  return `사주에 맞는 일은 ${daNyang(field)}.`;
}

function yearEventLine(c: Chart, ans: string | undefined): string | null {
  if (!ans || ans === "?") return null;
  const [y] = yearlyLuck(c, 1);
  const clash = branchRelation(c.dayBranch, y.branch) === "clash";
  const hit = EVENT_GODS[ans]?.includes(y.god) || (clash && ans !== "calm" && ans !== "meet");
  // A new person in a year when the 배우자 별 itself came in: say so.
  const sp = spouseGroup(c);
  if (ans === "meet" && sp && GROUP_OF[y.god] === sp) return `올해 좋은 인연을 만났다고 했지. 올해 ${y.ganji}년은 너한테 배우자 별이 직접 들어온 해다냥. 우연이 아니다냥.`;
  if (ans === "calm" && !hit) {
    const left = 12 - (new Date(Date.now() + 9 * 3600 * 1000).getUTCMonth() + 1);
    return `별일 없었다고 했지. 근데 올해 ${y.ganji}년은 너한테 '${y.god}(${GOD_SHORT[y.god]})'의 해다냥. ${left >= 1 ? `남은 ${left}달 안에 그 기운이 한 번은 움직인다냥.` : "그 기운은 내년 초까지 이어진다냥."}`;
  }
  return hit
    ? `올해 ${EVENT_LABEL[ans]}고 했지. 올해 ${y.ganji}년은 너한테 '${y.god}'의 해다냥. ${GOD_SHORT[y.god]}의 기운이 그대로 들어맞은 거다냥.`
    : `올해 ${EVENT_LABEL[ans]}고 했지. 올해는 너한테 '${y.god}(${GOD_SHORT[y.god]})'의 해였다냥. 그 일도 결국 그 기운의 모양으로 온 거다냥.`;
}

function seasonLine(c: Chart, ans: string | undefined): string | null {
  const d = c.daeun[c.currentDaeun];
  if (!d || !ans || !SEASON[ans]) return null;
  const good = d.score >= 66;
  const next = c.daeun[c.currentDaeun + 1];
  const nextBetter = next && next.score > d.score + 4;
  switch (ans) {
    case "spring":
      return good
        ? `막 시작하는 느낌이라고 했지. 맞다냥. ${d.age}세부터 든 ${d.ganji} 대운이 좋다냥. 지금 뿌린 씨가 열매가 된다냥.`
        : "막 시작하는 느낌인데, 대운은 아직 준비하라는 때다냥. 서두르면 싹이 얼어붙는다냥. 뿌리부터 내려라냥.";
    case "summer":
      return good
        ? "한창이라고 했지. 맞다냥. 대운이 받쳐 주는 한여름이다냥. 지금 벌인 일은 열매가 된다냥."
        : "한창 바쁜데, 대운은 쉬어 가라는 때다냥. 지금 무리하면 몸이 먼저 탈 난다냥.";
    case "autumn":
      return good
        ? "거두는 중이라고 했지. 맞다냥. 대운도 받쳐 준다냥. 이제는 거둔 걸 지키는 게 일이다냥."
        : "거두는 중이라고 했지. 대운이 무거워 거둘 게 줄어드는 때다냥. 새로 벌이지 말고 지켜라냥.";
    case "winter":
      if (good) return "버티는 중이라고 했는데, 대운은 좋다냥. 운은 이미 왔는데 네가 아직 문을 안 연 거다냥.";
      return `버티는 중이라고 했지. 대운이 그대로 보여 준다냥. ${nextBetter ? `${next.age}세 ${next.ganji} 대운부터 풀린다냥.` : "지금은 몸과 마음을 지키는 게 답이다냥."}`;
    default:
      return good
        ? "다 바뀌는 중이라고 했지. 대운이 받쳐 주는 변화다냥. 바뀐 쪽이 맞는 길이다냥."
        : `다 바뀌는 중이라고 했지. 대운이 무거운 때의 변화라 흔들리는 거다냥. ${nextBetter ? `${next.age}세에 대운이 바뀌면 자리가 잡힌다냥.` : "중요한 결정은 반년만 미뤄라냥."}`;
  }
}

function subScores(c: Chart) {
  const clamp = (n: number) => Math.round(Math.max(38, Math.min(96, n)));
  const g = c.groups;
  const sp = spouseGroup(c);
  const e = c.saju.summary.elements;
  const vals = Object.values(e);
  return [
    {
      label: "재물운",
      score: clamp(52 + g.재성 * 7 + (c.yongsin === groupElement(c.dm, "재성") ? 8 : 0) + (c.sinsal.yeokma ? 4 : 0)),
    },
    {
      label: "일·명예운",
      score: clamp(52 + g.관성 * 6 + g.인성 * 3 + (c.sinsal.gwiin ? 6 : 0)),
    },
    {
      label: "연애·결혼운",
      score: clamp(55 + (sp ? Math.min(g[sp], 3) * 6 : 8) + (c.sinsal.dohwa ? 7 : 0) + (c.sinsal.hongyeom ? 6 : 0)),
    },
    {
      label: "건강운",
      score: clamp(90 - (Math.max(...vals) - Math.min(...vals)) * 6),
    },
    {
      label: "대인·귀인운",
      score: clamp(56 + (c.sinsal.gwiin ? 16 : 0) + g.비겁 * 3 + g.인성 * 3),
    },
  ];
}

export function sajuReading(input: QuestionnaireInput, c: Chart): { teaser: FortuneTeaser; report: FullReport } {
  const name = input.me.name;
  const a = (id: string) => input.self[id];
  const stem = STEM[c.dayStem];
  const { top, low } = dominantGroups(c);
  const sinsals = (Object.keys(SINSAL_TEXT) as (keyof typeof SINSAL_TEXT)[]).filter((k) => c.sinsal[k]);
  const years = yearlyLuck(c, 2);
  const now = c.daeun[c.currentDaeun];
  const sp = spouseGroup(c);
  const focus = a("sj1") && a("sj1") !== "?" ? a("sj1") : "life";
  const sib = a("sj3");
  const sibLine = sib && SIBLING[sib] ? SIBLING[sib][level(c.groups.비겁)] : SIBLING_UNKNOWN[level(c.groups.비겁)];
  const say = a("sj6") && PEOPLE_SAY[a("sj6")] ? PEOPLE_SAY[a("sj6")][c.strong ? 0 : 1] : null;

  // ── 유료 감정서 ──
  const nature = sec(
    "타고난 성격 · 겉과 속",
    `${stem.name}, ${stem.image}의 팔자다냥`,
    lines(
      stem.core,
      stem.gift,
      stem.shadow,
      c.age >= 60 ? GROUP_STRONG[top].replace("윗사람과 부딪친다냥", "가까운 사람과 말로 부딪친다냥") : GROUP_STRONG[top],
      GROUP_WEAK[low],
      say,
      c.blood ? BLOOD_CHART[c.blood][c.strong ? 0 : 1] : null,
    ),
    [
      `🔹 타고난 무기: ${stem.gift.split(". ")[0].replace(/이?다냥\.?$/, "")}`,
      `🔸 약한 고리: ${GROUP_WEAK[low].split(".")[0]}`,
      c.strong ? "⚖️ 신강 사주: 밀어붙이는 힘은 넘친다냥. 힘을 쓸 곳을 정해 줘야 산다냥." : "⚖️ 신약 사주: 혼자보다 판을 같이 짤 사람이 있을 때 강해진다냥.",
    ],
  );

  const jaeEl = groupElement(c.dm, "재성");
  const moneyYears = yearlyLuck(c, 10)
    // A 재성 year only counts as money when the chart welcomes it (otherwise it comes and goes).
    .filter((y) => (GROUP_OF[y.god] === "재성" && y.score >= 58) || (GROUP_OF[y.god] === "식상" && y.score >= 70))
    .slice(0, 3);
  const money = sec(
    "재물운 · 돈이 들어오고 새는 길",
    c.groups.재성 >= 2.5 ? "돈 냄새를 맡는 사주다냥 💰" : c.groups.재성 <= 0.5 ? "돈을 쫓으면 도망가는 사주다냥" : "버는 만큼 지키는 게 관건인 사주다냥",
    lines(
      stem.money,
      moneyLine(c, a("sj5")),
      `네 재물 기운은 ${daNyang(elementLabel(jaeEl))}. ${c.yongsin === jaeEl ? "용신이 곧 재물이라, 돈 쫓는 게 곧 운을 쫓는 거다냥." : "돈보다 실력과 이름을 먼저 키우면 돈이 따라온다냥."}`,
    ),
    [
      moneyYears.length
        ? `📈 돈이 붙는 해: ${moneyYears.map((y) => `${y.year}년(${y.ganji}·${y.god})`).join(", ")}`
        : "📈 돈이 붙는 해: 10년 안엔 큰 파도보다 잔잔한 흐름이다냥. 모으는 쪽이 이긴다냥.",
      c.age < 20
        ? "🚫 피할 것: 친구 따라 쓰는 돈·빌려주는 돈"
        : c.gods.includes("겁재") || c.groups.비겁 >= 2.5
          ? "🚫 피할 것: 보증·동업·돈 빌려주기"
          : "🚫 피할 것: 남 말 듣고 하는 투자",
      `🔑 돈 들어오는 방향: ${LUCK[jaeEl].direction} · 색: ${LUCK[jaeEl].color}`,
    ],
  );

  // What the weak group points away from, minus anything the 일간 or the strong group already points to.
  const unfit = FIELD[low].split("·").filter((f) => !stem.work.includes(f) && !FIELD[top].includes(f));
  const work = sec(
    "일과 적성 · 맞는 자리",
    `${FIELD[top]} 쪽 그릇이다냥`,
    lines(
      `일간으로 보면 ${stem.work}`,
      jobLine(c, a("sj2")),
      c.groups.관성 >= 2.5
        ? "관성이 강해서 이름과 자리를 원한다냥. 인정 못 받는 곳에선 시든다냥."
        : c.groups.관성 <= 0.5
          ? "관성이 약해서 위에서 누르는 곳은 못 버틴다냥. 자율이 곧 성과다냥."
          : null,
    ),
    [
      `✅ 맞는 일: ${FIELD[top]}`,
      ...(unfit.length ? [`⚠️ 안 맞는 일: ${unfit.join("·")}`] : []),
      now ? `🕰️ 지금 ${now.age}세 ${now.ganji} 대운: ${GOD_SHORT[now.god]}의 10년이다냥.` : "🕰️ 아직 첫 대운 전이다냥.",
    ],
  );

  const spCount = sp ? c.groups[sp] : 1;
  const loveYear = yearlyLuck(c, 10).find((y) => (sp && GROUP_OF[y.god] === sp) || branchRelation(c.dayBranch, y.branch) === "harmony");
  // From the mid-40s the same 자리 reads as the marriage itself, not when someone will show up.
  const settled = c.age >= 45;
  const love = sec(
    settled ? "부부·인연운" : "연애·결혼운",
    settled
      ? spCount === 0
        ? "따로 또 같이가 맞는 부부 자리다냥"
        : spCount >= 3
          ? "사람 일이 많은 부부 자리다냥"
          : "오래 가는 부부 자리다냥"
      : spCount === 0
        ? "늦게 오지만 확 오는 인연이다냥"
        : spCount >= 3
          ? "인연이 많아서 고르기 어려운 팔자다냥"
          : "때 되면 들어오는 인연이다냥",
    lines(
      stem.love,
      settled
        ? spCount === 0
          ? "배우자 별이 약한 사주다냥. 부부가 각자 할 일이 많을수록 사이가 좋다냥."
          : spCount >= 3
            ? "배우자 별이 많은 사주다냥. 말 한마디가 부부 사이를 지킨다냥."
            : "배우자 별이 제자리에 있다냥. 큰 탈 없이 오래 가는 자리다냥."
        : spCount === 0
          ? "배우자 별이 원국에 없다냥. 늦게 만나거나, 운에서 들어올 때 확 만난다냥."
          : spCount >= 3
            ? "배우자 별이 많다냥. 인연이 많은 만큼, 진짜는 한 번 놓쳤다 다시 보인다냥."
            : "배우자 별이 제자리에 있다냥. 억지로 찾지 않아도 들어온다냥.",
      c.sinsal.dohwa ? "도화살까지 있어서 가만있어도 눈길을 끈다냥." : null,
      c.sinsal.hongyeom ? "홍염살이 있어서 은근히 끌리는 매력이 있다냥." : null,
      `배우자 자리(일지)에 ${josa(animalOfBranch(c.dayBranch), "이/가")} 앉아 있다냥. ${settled ? "네 짝은" : "배우자는"} ${["눈치 빠르고 생활력 강한", "묵묵하고 성실한", "추진력 있고 자존심 센", "부드럽고 다정한", "그릇 크고 욕심 있는", "똑똑하고 속정 깊은", "밝고 활동적인", "온순하고 가정적인", "재주 많고 말솜씨 좋은", "깔끔하고 기준 높은", "의리 있고 책임감 강한", "마음 넓고 정 많은"][c.dayBranch]} 사람이다냥.`,
    ),
    [
      settled
        ? loveYear
          ? `💞 부부 사이가 깊어지는 해: ${loveYear.year}년(${loveYear.ganji})`
          : "💞 부부 사이는 해마다의 말 한마디가 지킨다냥"
        : loveYear
          ? `💍 인연 기운이 강한 해: ${loveYear.year}년(${loveYear.ganji})`
          : "💍 10년 안의 인연 해: 운에서 들어오는 해를 잡아라냥",
      settled ? "혼자라면, 이 해가 새 인연이 드는 해이기도 하다냥." : "자세한 배우자 얼굴·시기는 '미래 배우자운'에서 따로 본다냥.",
    ],
  );

  const health = sec(
    "건강 · 약한 고리",
    `${josa(ORGANS[c.saju.summary.lacking], "을/를")} 지켜라냥`,
    lines(...healthLines(c, a("sj4")), c.strong ? "신강 사주라 버티는 힘은 좋다냥. 그래서 아픈 걸 늦게 안다냥." : "신약 사주라 기운이 쉽게 빠진다냥. 잠이 곧 보약이다냥."),
    [`🍵 도움 되는 음식: ${LUCK[c.saju.summary.lacking].food}`, `🚶 도움 되는 습관: ${LUCK[c.saju.summary.lacking].act}`],
  );

  const clashAnimal = animalOfBranch((c.dayBranch + 6) % 12);
  const helpers = gwiinAnimals(c).filter((x) => x !== clashAnimal);
  const people = sec(
    "사람과 귀인",
    c.sinsal.gwiin ? "막판에 꼭 누가 돕는 팔자다냥" : "사람보다 실력이 지켜 주는 팔자다냥",
    lines(
      c.sinsal.gwiin ? SINSAL_TEXT.gwiin : "천을귀인은 없다냥. 대신 네가 쌓은 실력이 귀인 노릇을 한다냥.",
      sibLine,
      c.groups.비겁 >= 2.5
        ? "친구는 많은데 진짜는 손에 꼽는다냥. 돈 얽히면 사람도 잃는다냥."
        : c.groups.인성 >= 2.5
          ? "윗사람 덕이 있는 사주다냥. 선배·스승을 붙잡아라냥."
          : "사람을 오래 두고 보는 사주다냥. 첫인상에 속지 마라냥.",
    ),
    [`🤝 귀인 띠: ${helpers.join("띠 · ")}띠`, `⚡ 부딪치는 띠: ${clashAnimal}띠`],
  );

  const yearSec = sec(
    `${years[0].year}·${years[1].year}년 운세`,
    years[0].score < 52 && years[1].score < 52
      ? `${years[0].year}·${years[1].year}년은 몸을 낮출 2년이다냥`
      : years[0].score >= 70 && years[1].score >= 70
        ? `${years[0].year}·${years[1].year}년, 연달아 문이 열린다냥`
        : years[1].score > years[0].score + 3
          ? `${years[1].year}년에 확 풀린다냥`
          : years[1].score < years[0].score - 3
            ? `${years[0].year}년에 판을 짜 둬라냥`
            : `${years[0].year}·${years[1].year}년은 다지는 2년이다냥`,
    lines(
      yearEventLine(c, a("sj7")),
      `${years[0].year} ${years[0].ganji}년 (${years[0].god}): ${yearText(years[0], 0, c.age)}`,
      `${years[1].year} ${years[1].ganji}년 (${years[1].god}): ${yearText(years[1], 1, c.age)}`,
      seasonLine(c, a("sj8")),
    ),
    [`📊 ${years[0].year}년 ${years[0].score}점 · ${scoreWord(years[0].score)}`, `📊 ${years[1].year}년 ${years[1].score}점 · ${scoreWord(years[1].score)}`],
  );

  const L = LUCK[c.yongsin];
  const avoid = LUCK[c.gisin];
  const luck = sec(
    "개운법 · 운을 여는 법",
    `너한텐 ${josa(elementLabel(c.yongsin), "이/가")} 약이다냥`,
    lines(
      `네 용신은 ${daNyang(elementLabel(c.yongsin))}. 이 기운을 가까이 두면 막힌 게 풀린다냥.`,
      `반대로 ${josa(elementLabel(c.gisin), "은/는")} 기신이다냥. 넘치면 일이 꼬인다냥.`,
    ),
    [
      `🎨 색: ${L.color}`,
      `🧭 방향: ${L.direction}`,
      `🔢 숫자: ${L.numbers}`,
      `🍽️ 음식: ${L.food}`,
      `📍 장소: ${L.place}`,
      `🧿 물건: ${L.item}`,
      `✅ 행동: ${L.act}`,
      `🚫 줄일 것: ${avoid.color} 계열, ${avoid.place}`,
    ],
  );

  const all = [
    { id: "nature", icon: "🪞", section: nature },
    { id: "money", icon: "💰", section: money },
    { id: "work", icon: "💼", section: work },
    { id: "love", icon: "💞", section: love },
    { id: "health", icon: "🩺", section: health },
    { id: "people", icon: "🤝", section: people },
    { id: "years", icon: "📅", section: yearSec },
    { id: "luck", icon: "🧿", section: luck },
  ];
  const first = FOCUS_SECTION[focus] ?? "nature";
  const sections = [...all.filter((s) => s.id === first), ...all.filter((s) => s.id !== first)];
  const report: FullReport = { subScores: subScores(c), sections, luck: null };

  // ── 무료 맛보기 ──
  const healthFree = healthLines(c, a("sj4"))[0];
  const beats: FortuneBeat[] = [
    {
      say: `${name}… 원국부터 펼친다냥. 사주 여덟 글자에 다 적혀 있다냥.`,
      mood: "smug",
      card: { kind: "chart" },
      next: "감정 근거는?",
    },
    {
      say: "감정 근거다냥. 냥신은 숨기지 않는다냥. 이 글자들이 아래 모든 풀이의 뿌리다냥.",
      mood: "talk",
      card: basisCard(c),
      next: "그래서 나는?",
    },
    {
      say: `네 일간은 ${stem.name}, ${daNyang(`'${stem.image}'`)}.`,
      mood: "wow",
      card: {
        kind: "text",
        icon: "🪞",
        title: "타고난 그릇",
        body: lines(stem.core, stem.shadow),
      },
      next: "소름…",
    },
    {
      say: sib && SIBLING[sib] ? "형제 얘기, 괜히 물은 거 아니다냥." : "네 사주의 기둥을 보자냥.",
      mood: "smug",
      card: {
        kind: "text",
        icon: "👪",
        title: "형제 자리와 '나'의 기운",
        body: sibLine,
      },
      next: "어떻게 알았어",
    },
    {
      say: "몸 얘기 하겠다냥.",
      mood: "talk",
      card: { kind: "text", icon: "🩺", title: "약한 고리", body: healthFree },
      next: "그리고?",
    },
  ];
  if (sinsals.length) {
    beats.push({
      say: `그리고… 네 사주에 살(殺)이 ${sinsals.length}개 있다냥.`,
      mood: "wow",
      card: {
        kind: "text",
        icon: "🔥",
        title: sinsals.length > 1 ? `${sinsals.length}개 중 하나만 먼저` : "네 사주의 살",
        body: SINSAL_TEXT[sinsals[0]],
      },
      next: sinsals.length > 1 ? "나머지는?" : "돈은? 일은?",
    });
  }
  const teaser: FortuneTeaser = {
    mode: "saju",
    title: `${name}의 사주 감정서`,
    saju: c.saju.summary,
    beats,
    paywall: `…여기서부터가 감정서 본문이다냥. 네가 궁금해한 ${FOCUS_LABEL[focus]}부터, ${years[0].year}·${years[1].year}년 운과 개운법까지 다 적어 뒀다냥. 듣고 갈래? 😼`,
    locked: sections.map((s) => locked(s.id, s.icon, s.section)),
    story: {
      kind: "fortune",
      label: `${name}의 사주 감정서`,
      emoji: "📜",
      headline: stem.name,
      sub: `'${stem.image}'`,
      meta: c.saju.summary.pillars.map((pl) => pl.hanja).join(" "),
      slipLabel: "냥신이 짚은 용신",
      slipValue: elementLabel(c.yongsin),
      slipText: [c.strong ? "신강(身强)" : "신약(身弱)", `${top} 강`, sinsals.length ? sinsalList(c)[0] : null].filter(Boolean).join(" · "),
    },
  };
  return { teaser, report };
}

export const sajuNow = thisYear;
