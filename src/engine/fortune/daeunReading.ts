import "server-only";
import type { FortuneBeat, FortuneTeaser, FullReport, QuestionnaireInput } from "@/models/types";
import { branchRelation } from "../saju";
import { type Chart, type Daeun, type TenGod, GROUP_OF, aheadYear, elementLabel, gwiinOf, yearlyLuck } from "./chart";
import { GOD_SHORT, LUCK, STEM, basisCard, daNyang, gwiinAnimals, josa, lines, locked, mbtiLuck, scoreWord, sec, yearText } from "./common";

// ───────────── 인생 대운 흐름 ─────────────

/** 대운 천간의 십성: 그 10년의 주제. */
const GOD_DAEUN: Record<
  TenGod,
  {
    theme: string;
    /** the theme when the 대운 is heavy for this chart (score < 52) */
    lowTheme: string;
    /** what to do when it is heavy */
    lowDo: string;
    body: string;
    up: string;
    down: string;
    do: string;
    dont: string;
  }
> = {
  비견: {
    lowDo: "내 몫 지키기",
    lowTheme: "경쟁에 치이는 10년",
    theme: "독립의 10년",
    body: "내 이름으로 서는 시기다냥. 대신 경쟁자도 같이 큰다냥.",
    up: "내 이름으로 서는 10년이다냥. 독립·창업이 통한다냥.",
    down: "경쟁자가 내 몫을 나눠 간다냥. 사람 문제로 돈이 샌다냥.",
    do: "내 판을 만들어라냥",
    dont: "동업·보증",
  },
  겁재: {
    lowDo: "지갑 닫고 버티기",
    lowTheme: "돈이 새는 10년",
    theme: "승부의 10년",
    body: "크게 걸고 크게 움직인다냥. 들어온 만큼 나간다냥.",
    up: "크게 걸어서 크게 먹는 10년이다냥. 배짱이 돈이 된다냥.",
    down: "들어온 만큼 나간다냥. 보증·동업으로 크게 잃는 10년이다냥.",
    do: "승부는 한 번만 크게",
    dont: "돈 빌려주기·남 따라 투자",
  },
  식신: {
    lowDo: "몸을 움직이기",
    lowTheme: "늘어지기 쉬운 10년",
    theme: "먹을 복의 10년",
    body: "먹고사는 걱정이 줄어든다냥. 재주가 밥이 되고 몸과 마음이 편해진다냥.",
    up: "재주가 밥이 되는 10년이다냥. 먹고살 걱정이 사라진다냥.",
    down: "편해서 주저앉기 쉬운 10년이다냥. 몸이 불고 의지가 준다냥.",
    do: "하고 싶던 걸 업으로",
    dont: "편해서 주저앉기",
  },
  상관: {
    lowDo: "말 줄이고 실력 보이기",
    lowTheme: "부딪치는 10년",
    theme: "판을 깨는 10년",
    body: "재능은 터지는데 윗사람·제도와 부딪친다냥. 이직·이별·창업이 몰린다냥.",
    up: "재능이 터지는 10년이다냥. 내 걸 세상에 꺼내면 이름이 난다냥.",
    down: "윗사람·제도와 부딪친다냥. 말 한마디로 자리를 잃는 10년이다냥.",
    do: "재주를 세상에 꺼내기",
    dont: "홧김에 사표·말실수",
  },
  편재: {
    lowDo: "새는 돈부터 막기",
    lowTheme: "욕심을 다스릴 10년",
    theme: "큰돈의 10년",
    body: "큰돈이 오가고 많이 움직인다냥. 잡으면 크게, 놓치면 크게 잃는다냥.",
    up: "큰돈이 들어오는 10년이다냥. 움직이는 만큼 번다냥.",
    down: "큰돈이 오가는데 남는 게 없다냥. 욕심이 화를 부른다냥.",
    do: "사업·이동·기회 잡기",
    dont: "욕심으로 판 키우기",
  },
  정재: {
    lowDo: "고정비 줄이기",
    lowTheme: "돈에 묶이는 10년",
    theme: "쌓는 10년",
    body: "월급·저축·집, 안정이 들어온다냥. 화려하진 않아도 남는다냥.",
    up: "차곡차곡 쌓이는 10년이다냥. 집·저축이 이때 생긴다냥.",
    down: "벌어도 묶이는 10년이다냥. 돈 때문에 하고 싶은 걸 미룬다냥.",
    do: "모으고 굴리기",
    dont: "한 방 노리기",
  },
  편관: {
    lowDo: "몸 챙기며 버티기",
    lowTheme: "압박이 겹치는 10년",
    theme: "시험의 10년",
    body: "압박과 고생이 많다냥. 여기서 버틴 사람이 다음 대운에 크게 된다냥.",
    up: "압박이 와도 이겨 내는 10년이다냥. 버틴 만큼 권한이 생긴다냥.",
    down: "압박과 고생이 겹치는 10년이다냥. 몸과 관재(官災)를 조심해라냥.",
    do: "버티고 실력 쌓기",
    dont: "무리해서 몸 상하기",
  },
  정관: {
    lowDo: "맡은 것만 확실히",
    lowTheme: "책임에 눌리는 10년",
    theme: "자리의 10년",
    body: "승진·명예·결혼, 세상이 너를 인정한다냥.",
    up: "승진·명예·결혼, 세상이 너를 인정하는 10년이다냥.",
    down: "자리는 있는데 무겁다냥. 책임에 눌리는 10년이다냥.",
    do: "조직 안에서 이름 걸기",
    dont: "규칙 깨기",
  },
  편인: {
    lowDo: "한 분야만 깊게",
    lowTheme: "외로운 전환의 10년",
    theme: "전환의 10년",
    body: "방향이 바뀐다냥. 공부·전문 분야로 깊어지고, 사람은 줄고 생각은 깊어진다냥.",
    up: "전문 분야로 깊어지는 10년이다냥. 남들이 못 하는 걸 하게 된다냥.",
    down: "생각만 많고 실행이 막힌다냥. 사람이 줄고 외로워지는 10년이다냥.",
    do: "새 분야 배우기",
    dont: "혼자 고립되기",
  },
  정인: {
    lowDo: "스스로 서는 연습",
    lowTheme: "기대다 멈추는 10년",
    theme: "도움의 10년",
    body: "공부·자격·문서 운이 좋다냥. 윗사람이 끌어 준다냥.",
    up: "윗사람이 끌어 주고 문서 운이 트이는 10년이다냥.",
    down: "기대기만 하다 기회를 놓친다냥. 게을러지기 쉬운 10년이다냥.",
    do: "자격·계약 챙기기",
    dont: "기대기만 하기",
  },
};

/** The 10-year theme read against the chart: the same 십성 helps one chart and hurts another. */
/** 대운 that start at 60 or later read as 몸 · 식구 · 재산 정리, not career and marriage. */
const SENIOR: Record<TenGod, { theme: string; lowTheme: string; body: string; do: string; dont: string }> = {
  비견: { theme: "벗의 10년", lowTheme: "고집을 내려놓을 10년", body: "친구·형제와 어울리며 기운을 얻는 10년이다냥. 고집만 줄이면 편하다냥.", do: "옛 친구 다시 만나기", dont: "고집 부리기" },
  겁재: { theme: "지갑을 지킬 10년", lowTheme: "지갑을 지킬 10년", body: "주변 사람 일로 돈이 나가기 쉬운 10년이다냥.", do: "재산은 미리 정리해 두기", dont: "보증·돈 빌려주기" },
  식신: { theme: "편안한 10년", lowTheme: "몸이 늘어지는 10년", body: "먹을 복과 마음 편한 복이 드는 10년이다냥. 손주와 취미가 낙이 된다냥.", do: "취미·텃밭·봉사", dont: "과식·과음" },
  상관: { theme: "말을 아낄 10년", lowTheme: "말을 아낄 10년", body: "말이 많아지고 서운함이 커지는 10년이다냥. 자식과 부딪치기 쉽다냥.", do: "말은 줄이고 마음은 글로 남기기", dont: "자식 일에 훈수" },
  편재: { theme: "재산을 정리할 10년", lowTheme: "재산이 새기 쉬운 10년", body: "목돈이 크게 오가는 10년이다냥. 상속·정리 얘기가 나온다냥.", do: "재산 정리를 미리", dont: "늦은 나이의 큰 투자" },
  정재: { theme: "든든한 10년", lowTheme: "살림을 지킬 10년", body: "살림이 안정되고 노후가 든든해지는 10년이다냥.", do: "연금·저축 챙기기", dont: "한 방 노리기" },
  편관: { theme: "몸을 지킬 10년", lowTheme: "몸을 지킬 10년", body: "몸에 무리가 오기 쉬운 10년이다냥. 정기 검진이 곧 운이다냥.", do: "건강검진·규칙적인 생활", dont: "무리한 일·산행" },
  정관: { theme: "어른 대접의 10년", lowTheme: "체면이 무거운 10년", body: "집안의 중심이 되고 어른 대접을 받는 10년이다냥.", do: "집안 어른 노릇", dont: "체면 때문에 무리하기" },
  편인: { theme: "마음 공부의 10년", lowTheme: "외로움을 조심할 10년", body: "생각이 깊어지고 혼자 있는 시간이 느는 10년이다냥. 외로움을 조심해라냥.", do: "배움·종교·모임", dont: "혼자 고립되기" },
  정인: { theme: "덕을 보는 10년", lowTheme: "기대지 말아야 할 10년", body: "자식과 주변 덕을 보는 10년이다냥. 마음이 편해진다냥.", do: "도움은 고맙게 받기", dont: "기대기만 하기" },
};

/** 대운 that start before 19: school and home, not 사업 · 승진. */
const YOUTH_T: Record<TenGod, { theme: string; lowTheme: string; do: string; dont: string }> = {
  비견: { theme: "고집이 자라는 10년", lowTheme: "친구와 부딪치는 10년", do: "내 편 친구 만들기", dont: "고집으로 싸우기" },
  겁재: { theme: "지기 싫은 마음이 크는 10년", lowTheme: "경쟁에 지치는 10년", do: "선의의 경쟁", dont: "지기 싫어 무리하기" },
  식신: { theme: "잘 먹고 잘 크는 10년", lowTheme: "늘어지기 쉬운 10년", do: "좋아하는 것 깊게 파기", dont: "게으름 굳히기" },
  상관: { theme: "재주가 싹트는 10년", lowTheme: "반항기의 10년", do: "재주를 키워 줄 사람 찾기", dont: "어른과 말싸움" },
  편재: { theme: "세상 구경이 넓은 10년", lowTheme: "형편이 출렁이는 10년", do: "돈 감각 익히기", dont: "용돈 낭비" },
  정재: { theme: "성실하게 크는 10년", lowTheme: "어깨가 무거운 10년", do: "규칙적인 생활", dont: "몰아치기" },
  편관: { theme: "단단해지는 10년", lowTheme: "엄하게 크는 10년", do: "체력·인내 기르기", dont: "혼자 참기만 하기" },
  정관: { theme: "모범생의 10년", lowTheme: "칭찬에 매이는 10년", do: "작은 자리라도 맡아 보기", dont: "칭찬에 매달리기" },
  편인: { theme: "남다른 눈이 트는 10년", lowTheme: "생각에 갇히는 10년", do: "특기 찾기", dont: "혼자 고립되기" },
  정인: { theme: "보호받는 10년", lowTheme: "기대기 쉬운 10년", do: "공부·자격 쌓기", dont: "기대기만 하기" },
};

/**
 * The 10-year theme for that age and weight: a 대운 that is heavy for this chart never wears a bright label
 * ("큰돈의 10년" at 20점 contradicts the bar right next to it).
 */
const T = (d: { god: TenGod; age: number; score?: number }): { theme: string; do: string; dont: string } => {
  const base = d.age >= 60 ? SENIOR[d.god] : d.age < 19 ? YOUTH_T[d.god] : GOD_DAEUN[d.god];
  const heavy = (d.score ?? 60) < 52;
  return { theme: heavy ? base.lowTheme : base.theme, do: (heavy && (base as { lowDo?: string }).lowDo) || base.do, dont: base.dont };
};

/** How each 십성 group wins: what worked then, and what will work in another 대운. */
const WAY: Record<string, string> = {
  비겁: "내 힘으로 밀어붙이는 길",
  식상: "재주와 말로 푸는 길",
  재성: "돈과 기회를 쫓는 길",
  관성: "조직과 자리에 기대는 길",
  인성: "배우고 도움받는 길",
};

/** 대운 that start before 19 read as growing up: school, family, temperament. */
const YOUTH: Record<TenGod, string> = {
  비견: "친구·형제와 부딪치며 자기 고집이 생기는 10년이다냥.",
  겁재: "경쟁 속에서 크는 10년이다냥. 지기 싫은 마음이 이때 생긴다냥.",
  식신: "잘 먹고 잘 놀며 크는 10년이다냥. 재주가 이때 싹튼다냥.",
  상관: "말이 많고 반항기도 있는 10년이다냥. 어른들과 자주 부딪친다냥.",
  편재: "집안 형편이 크게 오르내리는 10년이다냥. 돈 감각이 일찍 생긴다냥.",
  정재: "규칙적이고 성실하게 크는 10년이다냥.",
  편관: "엄한 환경에서 버티며 크는 10년이다냥. 참는 법을 일찍 배운다냥.",
  정관: "모범생 소리 듣는 10년이다냥. 칭찬받으려 애쓴다냥.",
  편인: "혼자 생각이 많은 10년이다냥. 남들과 다른 데 관심이 간다냥.",
  정인: "보호받으며 공부 운이 좋은 10년이다냥.",
};

const godText = (d: Daeun) =>
  d.age < 19
    ? YOUTH[d.god]
    : d.age >= 60
      ? SENIOR[d.god].body +
        (d.score >= 70
          ? [" 기운이 반갑게 받쳐 준다냥.", " 운이 편을 들어 주는 10년이다냥.", " 하늘이 등을 밀어 주는 때다냥."][Math.floor(d.age / 10) % 3]
          : d.score < 52
            ? [" 기운이 무거우니 몸부터 챙겨라냥.", " 운이 무거우니 무리는 금물이다냥.", " 속도를 늦출수록 오래 가는 10년이다냥."][Math.floor(d.age / 10) % 3]
            : "")
      : d.score >= 70
        ? GOD_DAEUN[d.god].up
        : d.score < 52
          ? GOD_DAEUN[d.god].down
          : GOD_DAEUN[d.god].body;

/** What a 대운 is about at that age; past tense once it has been lived. */
function stage(d: Daeun, nowAge: number): string {
  const v = (past: string, now: string) => (d.age + 9 < nowAge ? past : now);
  if (d.age < 10) return `어린 시절 대운이라, 집안 분위기와 부모 운으로 ${v("나타났다냥", "나타난다냥")}.`;
  if (d.age < 20) return `학창 시절 대운이라, 공부와 친구 관계로 ${v("나타났다냥", "나타난다냥")}.`;
  if (d.age < 30) return `사회 첫발 대운이라, 진로와 연애로 ${v("나타났다냥", "나타난다냥")}.`;
  if (d.age < 40) return `자리 잡는 대운이라, 일·돈·결혼이 이 기운을 ${v("따라갔다냥", "따라간다냥")}.`;
  if (d.age < 50) return `판을 키우거나 지키는 대운이라, 재물과 가정이 이 기운을 ${v("따라갔다냥", "따라간다냥")}.`;
  if (d.age < 60) return `거두는 대운이라, 쌓은 것의 결과가 이 기운으로 ${v("나왔다냥", "나온다냥")}.`;
  if (d.age < 70) return "물려주고 정리하는 대운이라, 자식·건강·재산 정리가 주제다냥.";
  return "건강과 마무리의 대운이라, 몸과 마음의 평안이 주제다냥.";
}

function branchNote(c: Chart, d: Daeun): string | null {
  const rel = branchRelation(c.dayBranch, d.branch);
  if (rel === "clash") return "일지와 충(沖)이 들어 집·배우자·몸에 변동이 크다냥.";
  if (rel === "harmony") return "일지와 합(合)이 들어 사람과 자리가 붙는다냥.";
  return null;
}

const SPANS: Record<string, [number, number, string]> = {
  child: [1, 9, "어린 시절"],
  teen: [10, 19, "10대"],
  early20: [20, 24, "20대 초반"],
  late20: [25, 29, "20대 후반"],
  "20s": [20, 29, "20대"],
  "30s": [30, 39, "30대"],
  "40s": [40, 49, "40대"],
  "50s": [50, 59, "50대"],
  "60s": [60, 79, "60대 이후"],
};

/** The 대운 covering most of an age span. */
function daeunIn(c: Chart, from: number, to: number): Daeun | null {
  let best: Daeun | null = null;
  let overlap = 0;
  for (const d of c.daeun) {
    const o = Math.min(to, d.age + 9) - Math.max(from, d.age) + 1;
    if (o > overlap) {
      overlap = o;
      best = d;
    }
  }
  return overlap > 0 ? best : null;
}

const range = (d: Daeun) => `${d.age}~${d.age + 9}세`;

function pastCheck(c: Chart, ans: string | undefined, kind: "hard" | "best"): string | null {
  if (!ans || ans === "?") return null;
  const lived = c.daeun.filter((d) => d.age <= c.age);
  const future = c.daeun.filter((d) => d.age > c.age && d.age <= Math.max(70, c.age + 20));
  if (ans === "none")
    return `크게 힘든 적이 없다고 했지. 지나온 대운이 고르게 받쳐 줬다냥. 대신 ${(() => {
      const low = [...future].sort((x, y) => x.score - y.score)[0];
      return low ? `${range(low)} ${low.ganji} 대운은 단단히 준비해라냥.` : "앞으로도 크게 꺾이진 않는다냥.";
    })()}`;
  if (ans === "yet") {
    const peak = [...future].sort((x, y) => y.score - x.score)[0];
    const cur = c.daeun[c.currentDaeun];
    if (cur && (!peak || cur.score >= peak.score))
      return `제일 좋은 때가 아직이라고 했지. 냥신 눈엔 지금 ${range(cur)} 대운이 남은 길에서 제일 낫다냥. 아직이라 느끼는 건 거둘 걸 아직 안 심어서다냥.`;
    return peak ? `제일 좋은 때가 아직이라고 했지. 맞다냥. 네 황금기는 아직 안 왔다냥. 언제인지는 감정서에 적었다냥.` : null;
  }
  const span = SPANS[ans];
  if (!span || span[0] > c.age) return null;
  const d = daeunIn(c, span[0], Math.min(span[1], c.age));
  if (!d) return null;
  const sorted = [...lived].sort((x, y) => x.score - y.score);
  const rank = sorted.findIndex((x) => x.age === d.age);
  // The span they named may be the 대운 they're living through right now.
  const current = c.age <= d.age + 9;
  const next = c.daeun.find((x) => x.age > d.age);
  const said = `${josa(span[2], "이라고/라고")} 했지.`;
  if (kind === "hard") {
    return rank <= 1 && d.score < 62
      ? current
        ? `${said} 맞다냥. 지금 지나는 ${range(d)} ${d.ganji} 대운이 지나온 대운 중 제일 무겁다냥. ${GOD_SHORT[d.god]}의 기운이 너한테는 짐으로 오는 10년이다냥.${next ? ` 대신 ${next.age}세부터 물줄기가 바뀐다냥.` : ""}`
        : `${said} 맞다냥. 그때가 ${range(d)} ${d.ganji} 대운, 지나온 대운 중 바닥이었다냥. ${GOD_SHORT[d.god]}의 기운이 너한테는 짐으로 왔다냥.`
      : ans === "child"
        ? `어린 시절이라고 했지. 대운으로 보면 그때(${d.ganji})는 바닥이 아니었다냥. 그 시절 짐은 네 운보다 집안 사정이 더 컸던 거다냥. 아이였던 네 몫이 아니었다냥.`
        : `${said} 대운으로 보면 그때(${d.ganji})는 바닥이 아니었다냥. 운이 받쳐 주는데도 힘들었다면, 그 짐은 운보다 그때 상황과 곁의 사람이 컸던 거다냥. 그걸 버텨 낸 게 지금의 너다냥.`;
  }
  const top = [...lived].sort((x, y) => y.score - x.score);
  const trank = top.findIndex((x) => x.age === d.age);
  return trank <= 1 && d.score >= 60
    ? current
      ? `${said} 맞다냥. 지금 지나는 ${range(d)} ${d.ganji} 대운이 지나온 대운 중 운이 제일 잘 받쳐 주는 10년이다냥. 지금을 아껴 써라냥.`
      : `${said} 맞다냥. ${range(d)} ${d.ganji} 대운, 지나온 대운 중 ${trank === 0 ? "운이 제일 잘 받쳐 준" : "손꼽히게 운이 받쳐 준"} 10년이다냥.`
    : ans === "child"
      ? `어린 시절이라고 했지. 그때는 네 운보다 집안과 부모님 덕이 컸던 때다냥. 이제 네 대운으로 피울 차례다냥.`
      : `${said} 대운보다 네 노력이 더 컸던 때다냥. 진짜 대운의 꽃은 따로 있다냥.`;
}

/** 인생이 확 바뀐 때 (du7) against the 교운기 — the ages one 대운 hands over to the next — or a 충 year. */
function turnRead(c: Chart, ans: string | undefined): { line: string; hit: boolean; age?: number; detail: string | null } | null {
  if (!ans || ans === "?") return null;
  if (ans === "none") {
    const nx = c.daeun.find((d) => d.age > c.age);
    const lived = c.daeun.some((d) => d.age > 1 && d.age <= c.age);
    return nx
      ? {
          hit: false,
          detail: null,
          line: `아직 크게 바뀐 적이 없다고 했지. ${lived ? `지나온 교운기를 조용히 넘긴 거다냥. 그만큼 뿌리가 단단하다냥. 다음 판갈이는 ${nx.age - 1}~${nx.age}세에 온다냥.` : `첫 큰 판갈이는 ${nx.age - 1}~${nx.age}세 교운기에 온다냥.`}`,
        }
      : null;
  }
  const span = SPANS[ans];
  if (!span || span[0] > c.age) return null;
  const to = Math.min(span[1], c.age);
  const i = c.daeun.findIndex((d) => d.age - 1 <= to && d.age >= span[0]);
  if (i >= 0) {
    const d = c.daeun[i];
    const prev = c.daeun[i - 1];
    return {
      hit: true,
      age: d.age,
      line: `${josa(span[2], "이라고/라고")} 했지. 맞다냥. ${d.age - 1}~${d.age}세가 대운이 갈아탄 교운기(交運期)였다냥. ${prev ? `${prev.ganji} 대운에서 ${d.ganji} 대운으로` : `${d.ganji} 대운으로`} 물줄기가 바뀐 때다냥.`,
      // The 감정서 goes past the 맛보기: what changed in the person's life, not the date again.
      detail: prev
        ? prev.god === d.god
          ? `${span[2]}의 판갈이는 같은 ${GOD_SHORT[d.god]}의 기운 안에서 땅(지지)만 바뀐 거다냥. 하던 일은 그대로인데 사는 곳·곁의 사람이 바뀌었을 거다냥.`
          : `${span[2]}에 삶의 주제가 '${GOD_SHORT[prev.god]}'에서 ${josa(`'${GOD_SHORT[d.god]}'`, "으로/로")} 옮겨 갔다냥. ${d.score > prev.score + 6 ? "그때부터 숨통이 트였을 거다냥." : d.score < prev.score - 6 ? "그때부터 어깨가 무거워졌을 거다냥." : "무게는 비슷한데 방향이 바뀌었다냥."}`
        : `${span[2]}에 첫 대운이 들며 네 운이 처음 움직이기 시작했다냥.`,
    };
  }
  const years = yearlyLuck(c, to - span[0] + 1, c.birthYear + span[0] - 1);
  const shake = years.find((y) => branchRelation(c.dayBranch, y.branch) === "clash");
  if (shake)
    return {
      hit: true,
      age: shake.year - c.birthYear + 1,
      line: `${josa(span[2], "이라고/라고")} 했지. 대운은 그대로였는데, ${shake.year}년(${shake.ganji})이 네 일지와 충(沖)이 든 해였다냥. 그 해가 판을 흔든 거다냥.`,
      detail: `${shake.year}년처럼 일지와 충이 드는 해엔 집·몸·곁의 사람이 흔들린다냥. 네 사주는 대운보다 이런 해에 판이 바뀌는 팔자다냥.`,
    };
  return {
    hit: false,
    line: `${josa(span[2], "이라고/라고")} 했지. 그때는 운보다 네 선택이 판을 바꾼 거다냥. 그만큼 네 힘이 셌다냥.`,
    detail: null,
  };
}

/** 어린 시절 (du9) against the first 대운 and the 부모 자리 (년주 · 월주). */
function childRead(c: Chart, ans: string | undefined): string | null {
  const d = c.daeun[0];
  const low = d.score < 58;
  switch (ans) {
    case "warm":
      return low
        ? `넉넉했다면 그건 부모님 운 덕이다냥. 네 첫 대운(${d.ganji})은 가볍지 않았다냥. 그래서 일찍 철든 구석이 있다냥.`
        : `맞다냥. 첫 대운(${d.ganji})이 ${d.score}점이다냥. 부모 덕이 든든한 출발이었다냥.`;
    case "plain":
      return `평범했다고 했지. 첫 대운(${d.ganji})도 ${scoreWord(d.score)}, 넘치지도 모자라지도 않은 출발이다냥.`;
    case "hard":
      return low
        ? `첫 대운(${d.ganji})이 무거웠다냥. 어린 나이에 철이 든 이유가 여기 있다냥. 그 단단함이 지금 네 밑천이다냥.`
        : `첫 대운은 괜찮았는데 형편이 어려웠다면, 네 운이 아니라 집안 운의 굴곡이다냥. 너는 그 안에서도 크게 다치지 않고 컸다냥.`;
    case "tense":
      return branchRelation(c.branches[0], c.branches[1]) === "clash"
        ? "사주에 년주와 월주가 충(沖)이다냥. 부모 자리가 부딪치는 사주라 그 시끄러움을 고스란히 봤다냥."
        : "어른들 일로 눈치 보며 컸지. 그래서 방 분위기를 제일 먼저 읽는 사람이 됐다냥.";
    case "alone":
      return c.groups.인성 <= 0.5 ? "인성(보호의 별)이 약한 사주다냥. 일찍 혼자 서는 팔자 그대로다냥." : "인성이 있는데도 혼자 컸다면, 보호받기보다 지키는 쪽을 택한 거다냥.";
    default:
      return null;
  }
}

/** 지금 제일 무거운 짐 (du8): which 십성 lightens it, and what the current 대운 says about it. */
const BURDEN: Record<string, { label: string; gods: TenGod[]; good: string; bad: string }> = {
  money: {
    label: "돈",
    gods: ["정재", "편재", "식신"],
    good: "지금 대운이 돈 길을 열어 주는 때다냥. 짐이 곧 기회다냥. 들어오는 만큼 묶어 둬라냥.",
    bad: "지금 대운이 돈을 쥐여 주는 때는 아니다냥. 늘리기보다 새는 구멍부터 막아라냥.",
  },
  work: {
    label: "일·진로",
    gods: ["정관", "편관", "식신", "정인"],
    good: "대운이 일을 밀어 주는 중이다냥. 지금 자리에서 이름을 걸면 오른다냥.",
    bad: "대운이 일을 막는 때다냥. 큰 이동보다 실력 쌓기가 답이다냥.",
  },
  people: {
    label: "사람·관계",
    gods: ["정인", "식신", "정관"],
    good: "사람 운이 들어오는 대운이다냥. 지친 관계는 정리되고 새 사람이 온다냥.",
    bad: "사람에 치이는 대운이다냥. 다 붙잡지 말고 꼭 필요한 세 사람만 남겨라냥.",
  },
  health: {
    label: "건강",
    gods: ["정인", "식신", "비견"],
    good: "몸이 회복되는 흐름이다냥. 지금 만든 습관이 10년 간다냥.",
    bad: "몸이 신호를 보내는 대운이다냥. 검진을 미루지 마라냥.",
  },
  family: {
    label: "가족",
    gods: ["정인", "정관", "정재"],
    good: "집안이 안정되는 흐름이다냥. 네가 버틴 만큼 식구가 편해진다냥.",
    bad: "식구 일이 네 어깨에 몰리는 대운이다냥. 혼자 다 지지 말고 나눠라냥.",
  },
  mind: {
    label: "마음",
    gods: ["식신", "정인", "편인"],
    good: "마음이 가벼워지는 흐름이다냥. 불안은 지나가는 구름이다냥.",
    bad: "생각이 많아지는 대운이다냥. 불안의 절반은 몸이 지쳐서다냥. 잠부터 지켜라냥.",
  },
};

/** 끌어 준 사람 (du10) against the chart's 인성 · 관성 · 비겁 · 배우자 별. */
function helperRead(c: Chart, ans: string | undefined): string | null {
  const g = c.groups;
  switch (ans) {
    case "parent":
      return g.인성 >= 1.5
        ? "인성(부모·보호의 별)이 받쳐 주는 사주다냥. 부모 덕은 팔자에 있던 거다냥."
        : "사주엔 인성이 약한데 부모 덕을 봤다면, 부모님이 운보다 더 애쓰신 거다냥.";
    case "mentor":
      return g.관성 + g.인성 >= 3
        ? "관성·인성이 받쳐 주는 사주라 윗사람 복이 있다냥. 앞으로도 윗사람 줄을 놓지 마라냥."
        : "윗사람 복이 크게 타고난 사주는 아닌데 만났다면, 그 인연은 귀하다냥. 꼭 붙잡아라냥.";
    case "partner":
      return "짝 덕을 봤다고 했지. 배우자 자리가 너를 지키는 사주다냥. 그 사람한테 고맙다는 말, 자주 해라냥.";
    case "friend":
      return g.비겁 >= 2 ? "비겁(친구·동료의 별)이 강한 사주다냥. 옆 사람이 곧 재산이다냥." : "친구 덕을 봤다면 네가 먼저 잘해 준 덕이다냥. 그 인연은 오래 간다냥.";
    case "none":
      return "다 혼자 했다고 했지. 그래서 지금의 네가 단단한 거다냥. 그래도 귀인 자리는 비어 있지 않다냥.";
    default:
      return null;
  }
}

/** What the last three years mean next to the current 대운 (good = 66점 이상). */
function recentRead(ans: string, good: boolean): string {
  if (ans === "up") return good ? "대운이 밀어 주는 중이다냥. 흐름을 믿어라냥." : "대운은 아직 무거운데 오르고 있다면, 그건 네 힘이다냥. 무리만 하지 마라냥.";
  if (ans === "down")
    return good ? "대운은 좋은데 꼬였다면, 사람이 막고 있는 거다냥. 곁에 있는 사람부터 다시 봐라냥." : "대운이 무거워서 그렇다냥. 네 탓이 아니다냥. 지금은 다지는 때다냥.";
  if (ans === "flat")
    return good ? "대운은 좋은데 제자리라면, 문을 안 두드린 거다냥. 하나만 먼저 시작해라냥." : "대운이 쉬어 가라는 때라 제자리인 거다냥. 이때 실력을 쌓아 둬라냥.";
  return good ? "대운이 받쳐 주는 흔들림이다냥. 바뀐 쪽이 맞는 길이다냥." : "대운이 무거운 때라 흔들린 거다냥. 지금은 크게 벌이기보다 다지는 때다냥.";
}

const RECENT: Record<string, string> = {
  up: "최근 3년이 오르는 중이라고 했지.",
  down: "최근 3년이 꼬였다고 했지.",
  wave: "최근 3년이 오르락내리락했다고 했지.",
  flat: "최근 3년이 제자리라고 했지.",
  turn: "최근 3년 사이 인생이 통째로 바뀌었다고 했지.",
};

/** Which year (of the next three) suits the decision on the table. */
const DECISION: Record<string, { label: string; gods: TenGod[] }> = {
  job: { label: "취업·이직·창업", gods: ["식신", "편재", "정관", "상관"] },
  home: { label: "이사·집", gods: ["정인", "편재", "정재", "편인"] },
  love: { label: "결혼·관계 정리", gods: ["정관", "정재", "식신", "편관"] },
  money: { label: "투자·큰돈", gods: ["정재", "편재", "식신"] },
  study: { label: "진학·공부·자격증", gods: ["정인", "편인", "정관"] },
  family: { label: "가족 일", gods: ["정인", "식신", "정관", "정재"] },
  retire: { label: "은퇴·노후 준비", gods: ["정인", "정재", "식신", "비견"] },
};

const WANT: Record<string, { label: string; gods: TenGod[] }> = {
  money: { label: "돈", gods: ["편재", "정재", "식신"] },
  honor: { label: "인정·명예", gods: ["정관", "편관", "정인"] },
  family: { label: "가정·안정", gods: ["정재", "정관", "정인"] },
  free: { label: "자유", gods: ["상관", "편재", "비견", "식신"] },
  health: { label: "건강", gods: ["식신", "정인", "비견"] },
  love: { label: "사랑", gods: ["정관", "정재", "식신"] },
};

/** The lived 대운 an age-span answer (du1 · du2) points at. */
function spanDaeun(c: Chart, ans: string | undefined): { d: Daeun; label: string } | null {
  const span = ans ? SPANS[ans] : undefined;
  if (!span || span[0] > c.age) return null;
  const d = daeunIn(c, span[0], Math.min(span[1], c.age));
  return d ? { d, label: span[2] } : null;
}

/** 운 나쁠 때 (du6) against the heavy 대운 (or year) ahead: does their usual way fit those years? */
function copeHard(ans: string | undefined, d: { god: TenGod; score: number; age: number }, now: boolean): string | null {
  const g = GROUP_OF[d.god];
  switch (ans) {
    case "endure":
      return g === "관성" || g === "인성"
        ? "이 악물고 버틴다고 했지. 이때는 버티는 게 맞다냥. 대신 쉬는 날을 달력에 먼저 박아 둬라냥."
        : "이 악물고 버틴다고 했지. 이때는 버티기만 하면 손해다냥. 방향을 살짝 틀어야 지나간다냥.";
    case "change":
      return g === "식상" || g === "인성"
        ? "판을 아예 바꾼다고 했지. 이때는 그 촉이 통한다냥. 단, 엎기 전에 1년은 준비해라냥."
        : "판을 아예 바꾼다고 했지. 이때 판을 엎으면 크게 다친다냥. 바꾸지 말고 줄여라냥.";
    case "lean":
      return g === "비겁"
        ? "사람한테 기댄다고 했지. 이때는 사람이 오히려 짐이 된다냥. 기댈 사람을 한 명으로 줄여라냥."
        : "사람한테 기댄다고 했지. 이때는 기댈 사람이 있어야 넘긴다냥. 지금부터 그 사람을 챙겨 둬라냥.";
    case "fortune":
      return now
        ? "점 보러 간다고 했지 😼 지금이 그 한가운데라, 해가 바뀔 때마다 흐름을 다시 짚어 봐라냥."
        : `점 보러 간다고 했지 😼 그때가 오기 한 해 전, ${Math.max(d.age - 1, 1)}세 무렵에 흐름을 한 번 더 짚어 봐라냥.`;
    case "hide":
      return d.score < 45
        ? "숨어서 쉰다고 했지. 이때는 그게 정답이다냥. 크게 안 움직이는 게 이기는 때다냥."
        : "숨어서 쉰다고 했지. 이때 숨기만 하면 기회까지 놓친다냥. 쉬되 문은 열어 둬라냥.";
    default:
      return null;
  }
}

/** The same habit (du6) in the good years: the 대운 활용법 side. */
const COPE_USE: Record<string, (peakAge: number) => string> = {
  endure: () => "버티는 힘은 무거운 대운에 쓰는 거다냥. 좋은 대운까지 버티듯 보내지 말고 그때는 밀어붙여라냥.",
  change: (age) => `판 바꾸는 촉은 좋은 대운이 드는 ${age}세 전후에 써야 크게 남는다냥.`,
  lean: () => "좋은 대운엔 네가 누군가의 기댈 언덕이 돼 줘라냥. 그때 베푼 게 무거운 대운에 돌아온다냥.",
  fortune: () => "운의 흐름을 아는 사람이 덜 다친다냥. 교운기마다 이 감정서를 다시 펴 봐라냥.",
  hide: () => "동굴은 무거운 대운에만 들어가라냥. 좋은 대운에 숨으면 그 10년이 그냥 지나간다냥.",
};

/** 어린 시절 (du9): the habit that childhood left. */
const CHILD_HABIT: Record<string, string> = {
  warm: "사람을 쉽게 믿는 버릇은 이때 생긴 거다냥. 그게 복이기도 하고 약점이기도 하다냥.",
  plain: "웬만한 일엔 크게 안 흔들리는 무던함이 이때 생긴 거다냥.",
  hard: "돈을 허투루 못 쓰고 늘 비상금을 챙기는 버릇이 이때 생긴 거다냥.",
  tense: "큰소리가 나면 먼저 몸이 굳는 버릇도 이때 생긴 거다냥.",
  alone: "힘들어도 도와 달라는 말이 늦게 나오는 버릇이 이때 생긴 거다냥.",
};

/** 최근 3년 (du3) → what the first of the next three years does with it. */
const RECENT_AFTER: Record<string, { label: string; good: string; bad: string }> = {
  up: { label: "오르던 3년", good: "그 오름세가 이어지는 해다냥.", bad: "한 번 숨 고르는 해다냥. 오르던 속도를 줄여라냥." },
  down: { label: "꼬였던 3년", good: "꼬인 매듭이 풀리기 시작하는 해다냥.", bad: "아직 매듭이 남은 해다냥." },
  wave: { label: "출렁이던 3년", good: "파도가 잦아드는 해다냥.", bad: "한 번 더 출렁이는 해다냥." },
  flat: { label: "제자리였던 3년", good: "드디어 발이 떨어지는 해다냥.", bad: "제자리 같아도 뿌리가 자라는 해다냥." },
  turn: { label: "판이 바뀐 3년", good: "바뀐 판에 뿌리내리는 해다냥.", bad: "바뀐 판이 아직 낯선 해다냥. 서두르지 마라냥." },
};

export function daeunReading(input: QuestionnaireInput, c: Chart): { teaser: FortuneTeaser; report: FullReport } {
  const name = input.me.name;
  const a = (id: string) => input.self[id];
  const stem = STEM[c.dayStem];
  const cur = c.daeun[c.currentDaeun] ?? null; // null before the first 대운
  const next = c.daeun[c.currentDaeun + 1] ?? null; // null past the last one worked out
  // 황금기 · 조심할 때 look at the 대운 still ahead: up to 70, or the next 20 years for older people.
  const future = c.daeun.filter((d) => d.age > c.age && d.age <= Math.max(70, c.age + 20));
  const bestAhead = [...future].sort((x, y) => y.score - x.score)[0] ?? null;
  const nowIsPeak = Boolean(cur && (!bestAhead || cur.score >= bestAhead.score));
  const peak = (nowIsPeak ? cur : bestAhead) ?? c.daeun[0];
  const lowAhead = future.filter((d) => d !== peak).sort((x, y) => x.score - y.score)[0] ?? null;
  const trough = cur && cur !== peak && cur.score < 55 && (!lowAhead || cur.score < lowAhead.score) ? cur : lowAhead;
  const seun = yearlyLuck(c, 3, aheadYear());
  // The graph and the overview show 8 of the 9 대운, always including the current one.
  const shownDaeun = c.currentDaeun >= 8 ? c.daeun.slice(1, 9) : c.daeun.slice(0, 8);
  const ageYear = (age: number) => c.birthYear + age - 1;

  // What the interview said, resolved against the chart once.
  const hardAt = spanDaeun(c, a("du1"));
  const bestAt = spanDaeun(c, a("du2"));
  const turn = turnRead(c, a("du7"));
  const dec = DECISION[a("du4") ?? ""];
  const want = WANT[a("du5") ?? ""];
  // A 대운 gives what is wanted only if it is that kind *and* not heavy for this chart.
  const wantHit = want ? [cur, ...future].find((d) => d && want.gods.includes(d.god) && d.score >= 58) : null;
  const burden = BURDEN[a("du8") ?? ""];
  const recent = RECENT_AFTER[a("du3") ?? ""];

  // Each stage / 일지 line is said once across the 감정서; later sections keep only what's new.
  const said = new Set<string>();
  const head = (d: Daeun) => {
    said.add(godText(d));
    return `${range(d)} ${d.ganji}(${d.hanja}) 대운 — ${T(d).theme}. ${godText(d)}`;
  };
  const once = (l: string | null) => (l && !said.has(l) ? (said.add(l), l) : null);
  const note = (d: Daeun) => {
    const n = branchNote(c, d);
    if (!n || !said.has(n)) return once(n);
    return n.includes("충") ? "이 대운도 일지와 충(沖)이 든다냥." : "이 대운도 일지와 합(合)이 든다냥.";
  };
  const describe = (d: Daeun) => lines(head(d), once(stage(d, c.age)), note(d));

  // ── 유료 감정서 ──
  const yearIn = cur ? c.age - cur.age + 1 : 0;
  const nowSec = cur
    ? sec(
        "지금 대운 상세",
        `${range(cur)} ${cur.ganji} 대운, ${daNyang(scoreWord(cur.score))}`,
        lines(
          describe(cur),
          a("du3") && RECENT[a("du3")] ? `${RECENT[a("du3")]} ${recentRead(a("du3")!, cur.score >= 66)}` : null,
          burden
            ? burden.gods.includes(cur.god)
              ? cur.score >= 55
                ? `${josa(burden.label, "이/가")} 제일 무겁다고 했지. 이 대운이 마침 ${burden.label} 쪽 기운이라, 짐과 답이 같은 데 있다냥.`
                : `${josa(burden.label, "이/가")} 제일 무겁다고 했지. 이 대운이 ${burden.label} 쪽 기운인데 너한텐 무겁게 들어온다냥. 그래서 ${josa(burden.label, "이/가")} 짐이 된 거다냥.`
              : `${josa(burden.label, "이/가")} 제일 무겁다고 했지. 이 대운의 주제는 ${GOD_SHORT[cur.god]} 쪽이라, ${josa(burden.label, "은/는")} 대운보다 해운을 보고 풀어야 한다냥.`
            : null,
          `이 대운은 ${cur.age + 9}세까지, 올해 포함 ${Math.max(1, cur.age + 10 - c.age)}년 남았다냥.`,
        ),
        [`✅ 할 것: ${T(cur).do}`, `🚫 하지 말 것: ${T(cur).dont}`, `📊 대운 점수 ${cur.score}점 · ${scoreWord(cur.score)}`],
      )
    : sec(
        "첫 대운 전",
        `${c.daeun[0].age}세에 첫 대운이 든다냥`,
        lines(
          "아직 첫 대운이 오기 전이다냥. 그 전까진 부모 운과 태어난 달(월주)의 기운으로 산다냥.",
          `${c.daeun[0].age}세부터 ${c.daeun[0].ganji} 대운, ${T(c.daeun[0]).theme}이 열린다냥.`,
        ),
        [`📊 첫 대운 점수 ${c.daeun[0].score}점 · ${scoreWord(c.daeun[0].score)}`],
      );

  // 큰 결정 (du4) against the 교운기: before it, after it, or by the year.
  const decTurn =
    dec && next && cur
      ? next.age - c.age <= 2
        ? `${josa(dec.label, "을/를")} 앞뒀다고 했지. 마침 교운기 문턱에 걸렸다냥. ${dec.gods.includes(next.god) && next.score >= 55 ? "새 대운이 그 일을 밀어 주니, 서두르지 말고 새 대운에 들어서서 해라냥." : "새 대운은 그 일과 결이 다르다냥. 넘어가기 전에 매듭지어라냥."}`
        : dec.gods.includes(cur.god) && cur.score >= 55
          ? `${josa(dec.label, "을/를")} 앞뒀다고 했지. 지금 대운이 밀어 주는 일이다냥. ${next.age - 1}세 교운기 전에 끝내라냥.`
          : dec.gods.includes(next.god) && next.score >= 55
            ? `${josa(dec.label, "을/를")} 앞뒀다고 했지. 지금 대운보다 다음 대운이 그 일을 더 밀어 준다냥. 급하지 않다면 ${next.age}세 이후가 낫다냥.`
            : `${josa(dec.label, "을/를")} 앞뒀다고 했지. 그 일은 대운보다 해운이 정한다냥. 아래 '앞으로 3년'에서 짚은 해를 봐라냥.`
      : a("du4") === "none" && next
        ? `큰 결정이 없다는 지금이 오히려 준비할 때다냥. 결정은 ${next.age - 1}~${next.age}세 교운기에 몰려온다냥.`
        : null;
  const nextSec =
    next && next.age <= 100
      ? sec(
          "다음 대운과 교운기",
          `${next.age}세, 운이 갈아탄다냥`,
          lines(
            describe(next),
            `대운이 바뀌기 전후 1~2년(${next.age - 1}~${next.age}세)은 교운기(交運期)다냥. ${next.age >= 60 ? "몸과 집안에 변화가 이때 몰린다냥." : next.age <= 20 ? "이사·전학·진로 변화가 이때 몰린다냥." : "이사·이직·이별이 이때 몰린다냥."}`,
            !cur
              ? null
              : next.score > cur.score + 8
                ? "다음 대운이 지금보다 확 좋다냥. 지금 버티는 게 다 이유가 있다냥."
                : next.score < cur.score - 8
                  ? "다음 대운은 지금보다 무겁다냥. 지금 좋은 운에 벌어 둔 게 다음 10년을 지킨다냥."
                  : "다음 대운도 지금과 비슷한 무게다냥. 방향만 바뀐다냥.",
            decTurn,
          ),
          [`🔄 교운기: ${next.age - 1}~${next.age}세 (${ageYear(next.age - 1)}~${ageYear(next.age)}년)`, `✅ 다음 10년에 할 것: ${T(next).do}`],
        )
      : sec(
          "다음 대운과 교운기",
          "지금 대운이 길게 이어진다냥",
          lines("지금 대운이 네 남은 길의 큰 물줄기다냥.", "이제는 대운보다 해마다 들어오는 운이 더 중요하다냥. 아래 '앞으로 3년'을 꼭 봐라냥.", decTurn),
          [`✅ 이 시기에 할 것: ${T(cur ?? c.daeun[0]).do}`],
        );

  // 제일 잘 풀린 때 (du2) and 원하는 것 (du5) read against the 황금기.
  const peakAnswer = bestAt
    ? bestAt.d === peak
      ? `제일 잘 풀렸다던 ${bestAt.label}, 그 대운이 바로 이 꽃자리다냥.`
      : GROUP_OF[bestAt.d.god] === GROUP_OF[peak.god]
        ? `제일 잘 풀렸다던 ${josa(bestAt.label, "은/는")} ${bestAt.d.ganji} 대운, ${GOD_SHORT[bestAt.d.god]}의 기운이었다냥. 황금기에 같은 결의 기운이 돌아온다냥. 그때 통한 방식이 또 통한다냥.`
        : `제일 잘 풀렸다던 ${josa(bestAt.label, "은/는")} ${GOD_SHORT[bestAt.d.god]}의 기운으로 풀렸다냥. 황금기는 ${GOD_SHORT[peak.god]}의 기운으로 핀다냥. 그때는 ${josa(WAY[GROUP_OF[bestAt.d.god]], "이/가")} 통했고, 이번엔 ${josa(WAY[GROUP_OF[peak.god]], "이/가")} 통한다냥.`
    : a("du2") === "yet"
      ? peak === cur
        ? `아직이라던 그 꽃, 지금 대운 안에 있다냥. ${cur!.age + 9}세까지 남은 ${Math.max(1, cur!.age + 10 - c.age)}년이 피울 시간이다냥.`
        : `아직이라던 그때는 ${peak.age}세, ${ageYear(peak.age)}년부터다냥. ${peak.age - c.age}년 남았다냥.`
      : null;
  const peakWant = want
    ? want.gods.includes(peak.god)
      ? `네가 원한 ${josa(want.label, "이/가")} 이 황금기에 같이 들어온다냥. 꿈과 운이 같은 방향이다냥.`
      : `네가 원한 건 ${want.label}인데, 황금기가 주는 건 ${daNyang(GOD_SHORT[peak.god])}. 그 힘을 ${want.label} 쪽으로 돌려 쓰는 게 요령이다냥.`
    : null;
  const peakMbti = mbtiLuck(input.me.mbti, false);
  const runnerUp = future.filter((d) => d !== peak).sort((x, y) => y.score - x.score)[0];
  // The best 대운 already lived, and a late bloom after 70 (outside the 황금기 pool).
  const bestPast = c.daeun.filter((d) => d.age + 9 < c.age).sort((x, y) => y.score - x.score)[0];
  const lateBloom = c.age < 60 ? c.daeun.find((d) => d.age > 70 && d.age <= 80 && d.score >= 70) : undefined;
  const lateLine = lateBloom ? `말년 ${range(lateBloom)} ${lateBloom.ganji} 대운에 한 번 더 핀다냥. 늦복이 있는 팔자다냥.` : null;
  // 65 넘어서 지나온 대운이 더 셌다면, 황금기는 돌아보며 말한다.
  const lookBack = c.age >= 65 && bestPast && bestPast.score >= Math.max(peak.score, 66);
  const peakSec = lookBack
    ? sec(
        "인생 황금기",
        `${range(bestPast!)}가 네 인생의 꽃이었다냥`,
        lines(
          `${range(bestPast!)} ${bestPast!.ganji} 대운, ${T(bestPast!).theme}이었다냥. 그때 쌓은 게 지금 네 이름이고 네 식구다냥.`,
          bestAt && bestAt.d !== bestPast ? `네가 꼽은 ${bestAt.label}보다 대운은 ${range(bestPast!)}를 더 높이 친다냥. 그때 심은 게 늦게 열매를 맺은 거다냥.` : peakAnswer,
          peak !== cur && peak.score >= 62
            ? `남은 길에선 ${range(peak)} ${peak.ganji} 대운이 한 번 더 숨통을 틔워 준다냥.`
            : "남은 길은 크게 피기보다 잔잔하게 이어진다냥. 지키는 게 이기는 때다냥.",
          peakWant,
        ),
        [`📊 그 대운 점수 ${bestPast!.score}점 · ${scoreWord(bestPast!.score)}`, `🎯 지금 잡을 것: ${T(cur ?? peak).do}`],
      )
    : nowIsPeak && cur
      ? sec(
          "인생 황금기",
          bestPast && bestPast.score > cur.score + 5 && c.age >= 60
            ? `${range(bestPast)}가 네 인생의 꽃이었다냥`
            : cur.score >= 70
              ? "바로 지금이 황금기다냥"
              : "남은 대운 중엔 지금이 제일 낫다냥",
          lines(
            cur.score >= 70 ? `${name}, 지금 ${range(cur)} 대운이 앞으로 남은 대운 중 제일 세다냥.` : `${name}, 지금 ${range(cur)} 대운이 앞으로 남은 대운 중 제일 낫다냥.`,
            bestPast && bestPast.score > cur.score + 5 ? `큰 파도는 ${range(bestPast)} ${bestPast.ganji} 대운에 한 번 지나갔다냥. 그때 잡은 게 지금의 밑천이다냥.` : null,
            peakAnswer,
            cur.score >= 70 ? "이 10년에 거둔 게 평생 간다냥. 망설이면 지나간다냥." : "큰 한 방보다 꾸준히 쌓는 팔자다냥. 지금 쌓은 게 뒷날을 지킨다냥.",
            peakWant,
            peakMbti,
            lateLine,
          ),
          [
            `📊 지금 대운 ${cur.score}점 · ${scoreWord(cur.score)}`,
            `🎯 지금 잡을 것: ${T(cur).do}`,
            ...(runnerUp ? [`${runnerUp.score >= 65 ? "🌸 두 번째 꽃" : "➡️ 그다음"}: ${range(runnerUp)} ${runnerUp.ganji} (${runnerUp.score}점)`] : []),
          ],
        )
      : peak.score < 62
        ? sec(
            "인생 황금기",
            `${range(peak)}에 숨통이 트인다냥`,
            lines(
              "앞으로 크게 피는 대운보다 잔잔한 대운이 이어진다냥. 큰 한 방보다 지키는 게 이기는 팔자다냥.",
              `그중 ${range(peak)} ${peak.ganji} 대운이 제일 낫다냥. ${T(peak).theme}이다냥.`,
              bestPast && bestPast.score >= 66 ? `큰 꽃은 ${range(bestPast)} ${bestPast.ganji} 대운에 한 번 피었다냥. 그때 쌓은 게 지금의 밑천이다냥.` : null,
              peakAnswer,
              peakWant,
              peakMbti,
            ),
            [`📊 그 대운 점수 ${peak.score}점 · ${scoreWord(peak.score)}`, `🎯 그때 잡을 것: ${T(peak).do}`],
          )
        : sec(
            "인생 황금기",
            `${range(peak)}, 네 인생 꽃이 핀다냥`,
            lines(
              peak === next ? `바로 다음 대운이다냥. ${peak.age}세부터 열린다냥. 교운기만 잘 넘기면 꽃이 핀다냥.` : describe(peak),
              peakAnswer,
              `${peak.age}세가 오기 전에 씨를 뿌려 둬라냥. 그 대운에 거둔다냥.`,
              peakWant,
              peakMbti,
              lateLine,
            ),
            [`📊 황금기 점수 ${peak.score}점 · ${scoreWord(peak.score)}`, `🎯 그때 잡을 것: ${T(peak).do}`],
          );

  // 제일 힘들었던 때 (du1) and 운 나쁠 때의 버릇 (du6) read against what is coming.
  const hardYear = [...yearlyLuck(c, 6, aheadYear())].sort((x, y) => x.score - y.score)[0];
  const troughAnswer = (heavy: { score: number } | null) =>
    hardAt
      ? !heavy
        ? `네가 제일 힘들었다던 ${hardAt.label}만큼 꺾이는 대운은 남은 길에 없다냥.`
        : hardAt.d === heavy
          ? `제일 힘들었다던 ${hardAt.label}, 바로 이 대운 안이다냥. 지금 그 한가운데를 지나는 거다냥.`
          : heavy.score < hardAt.d.score - 5
            ? `네가 제일 힘들었다던 ${hardAt.label}(${hardAt.d.ganji} 대운, ${hardAt.d.score}점)보다 이 대운이 더 무겁다냥. 그때 버틴 방식만 믿으면 안 된다냥.`
            : heavy.score > hardAt.d.score + 5
              ? `네가 제일 힘들었다던 ${hardAt.label}(${hardAt.d.ganji} 대운, ${hardAt.d.score}점)보다는 가볍다냥. 그때를 버틴 너라면 넘긴다냥.`
              : `네가 제일 힘들었다던 ${hardAt.label}(${hardAt.d.ganji} 대운)과 비슷한 무게다냥. 그때 뭐가 너를 버티게 했는지 떠올려 둬라냥. 그게 이번에도 열쇠다냥.`
      : a("du1") === "none"
        ? heavy
          ? "크게 힘든 적이 없었던 너한텐 이 대운이 처음 만나는 큰 파도일 수 있다냥. 미리 알면 덜 다친다냥."
          : "크게 힘든 적이 없었다고 했지. 남은 길도 크게 꺾이진 않는다냥. 그 복을 믿고 방심만 하지 마라냥."
        : null;
  const troughSec = trough
    ? sec(
        "조심해야 할 대운",
        trough.score >= 62 ? "크게 꺾이는 대운은 없다냥" : `${range(trough)}는 몸을 낮춰라냥`,
        lines(
          trough.score >= 62 ? `앞으로 크게 꺾이는 대운은 없다냥. 그나마 힘을 아낄 때는 ${daNyang(range(trough))}.` : null,
          trough === cur
            ? `지금 ${range(trough)} 대운이 남은 길에서 제일 무거운 10년이다냥. ${T(trough).theme}이다냥.`
            : trough === next
              ? `바로 다음 대운이다냥. ${trough.age}세부터다냥. ${T(trough).theme}이라 미리 준비해야 한다냥.`
              : describe(trough),
          troughAnswer(trough.score >= 62 ? null : trough),
          copeHard(a("du6"), trough, trough === cur),
          mbtiLuck(input.me.mbti, true),
          trough === cur
            ? `크게 벌이지 말고 지키면 지나간다냥. ${cur.age + 9}세까지만 버텨라냥.`
            : trough.age >= 60
              ? "이 대운이 오기 전에 건강검진과 재산 정리를 해 둬라냥."
              : c.age < 20
                ? "이 대운이 오기 전에 실력과 체력을 쌓아 둬라냥. 그게 제일 좋은 보험이다냥."
                : "이 대운이 오기 전에 빚·보증·무리한 계약을 정리해 둬라냥.",
        ),
        [`🚫 그때 피할 것: ${T(trough).dont}`, `🧿 버티는 법: ${LUCK[c.yongsin].act}`],
      )
    : sec(
        "조심해야 할 때",
        `${hardYear.year}년(${hardYear.ganji})을 조심해라냥`,
        lines(
          "남은 길에 크게 꺾이는 대운은 없다냥. 대신 해마다 오는 고비가 있다냥.",
          `${hardYear.year}년은 너한테 '${hardYear.god}'의 해다냥. ${hardYear.score < 52 ? `${GOD_SHORT[hardYear.god]}의 기운이 무겁게 들어온다냥. 그해엔 몸부터 챙겨라냥.` : "남은 해 중 그나마 기운이 약한 해다냥. 무리한 계획만 피하면 된다냥."}`,
          troughAnswer(null),
          copeHard(a("du6"), { god: hardYear.god, score: hardYear.score, age: c.age + (hardYear.year - aheadYear()) }, false),
          mbtiLuck(input.me.mbti, true),
        ),
        [`🚫 그해 피할 것: ${T({ god: hardYear.god, age: c.age, score: hardYear.score }).dont}`, `🧿 버티는 법: ${LUCK[c.yongsin].act}`],
      );

  // The overview marks the 대운 the interview pointed at.
  const marks = (d: Daeun) =>
    [
      hardAt?.d === d && "⛈️ 네가 꼽은 힘든 때",
      bestAt?.d === d && "🌸 네가 꼽은 좋은 때",
      turn?.hit && turn.age && d.age <= turn.age && turn.age <= d.age + 9 && "🔀 판이 바뀐 때",
      wantHit === d && `🎯 ${want!.label}`,
    ]
      .filter(Boolean)
      .join(" ");
  const markedAny = shownDaeun.some((d) => marks(d));
  // How many of the times the reader named does the 대운표 confirm? (same test as the 맛보기's 맞다냥)
  const lived = c.daeun.filter((d) => d.age <= c.age);
  const memories = [
    hardAt ? [...lived].sort((x, y) => x.score - y.score).indexOf(hardAt.d) <= 1 && hardAt.d.score < 62 : null,
    bestAt ? [...lived].sort((x, y) => y.score - x.score).indexOf(bestAt.d) <= 1 && bestAt.d.score >= 60 : null,
    turn && a("du7") !== "none" ? turn.hit : null,
  ].filter((x): x is boolean => x !== null);
  const confirmed = memories.filter(Boolean).length;
  const allSec = sec(
    "대운 전체 흐름",
    memories.length === 0
      ? "10년마다 바뀌는 네 인생 물줄기다냥"
      : confirmed === 0
        ? `네가 꼽은 때 ${memories.length}곳, 대운보다 네 힘이 셌다냥`
        : `네가 꼽은 때 ${memories.length}곳 중 ${confirmed}곳이 대운표와 맞는다냥`,
    lines(
      `대운수 ${c.daeunSu}, ${c.forward ? "순행" : "역행"}이다냥. ${c.daeunSu}세부터 10년마다 운의 옷이 바뀐다냥.`,
      `용신은 ${daNyang(elementLabel(c.yongsin))}. 이 기운이 들어오는 대운이 네 전성기다냥.`,
      markedAny ? "면담에서 네가 꼽은 때를 표에 같이 찍어 뒀다냥. 네 기억과 대운이 어디서 겹치는지 봐라냥." : null,
      want
        ? wantHit && shownDaeun.includes(wantHit)
          ? `네가 원한 ${josa(want.label, "을/를")} 주는 대운은 🎯로 표시했다냥.`
          : `네가 원한 ${josa(want.label, "을/를")} 대놓고 주는 대운은 이 표 안엔 없다냥. 해마다 오는 기회를 잡는 쪽이 답이다냥.`
        : null,
      hardAt && bestAt && hardAt.d !== bestAt.d
        ? hardAt.d.score > bestAt.d.score
          ? `재밌는 건, 대운 점수로는 힘들었다던 ${josa(hardAt.label, "이/가")} 좋았다던 ${bestAt.label}보다 높다냥. 운이 좋을 때 오히려 크게 부딪친 거다냥. 그게 네 팔자의 버릇이다냥.`
          : `힘들었다던 ${josa(hardAt.label, "과/와")} 좋았다던 ${bestAt.label}, 대운 점수도 그 순서 그대로다냥. 네 몸이 운을 정확히 느끼는 편이다냥.`
        : null,
    ),
    shownDaeun.map((d) => {
      const m = marks(d);
      return `${d === cur ? "▶" : "·"} ${range(d)} ${d.ganji} · ${d.god} · ${d.score}점 · ${T(d).theme}${m ? ` ${m}` : ""}`;
    }),
  );

  const fit = (y: { god: TenGod; score: number }) => (dec && dec.gods.includes(y.god) && y.score >= 52 ? 20 : 0) + y.score;
  const decYear = dec ? [...seun].sort((x, y) => fit(y) - fit(x))[0] : null;
  const bestSeun = [...seun].sort((x, y) => y.score - x.score)[0];
  const seunSec = sec(
    `앞으로 3년 (${seun[0].year}~${seun[2].year})`,
    dec && decYear ? `${josa(dec.label, "은/는")} ${decYear.year}년이다냥` : `${seun[1].year}년이 갈림길이다냥`,
    lines(
      ...seun.map((y, i) => `${y.year} ${y.ganji}년 (${y.god}): ${yearText(y, i, c.age)}`),
      recent
        ? `${recent.label} 다음, ${seun[0].year}년은 ${seun[0].score >= 62 ? recent.good : `${recent.bad}${bestSeun !== seun[0] && bestSeun.score >= 58 ? ` 숨통은 ${bestSeun.year}년에 트인다냥.` : bestSeun.score < 58 ? " 세 해 내내 다지는 때라 생각해라냥." : ""}`}`
        : null,
      dec && decYear
        ? decYear.score >= 58
          ? `앞에 놓인 ${dec.label}, ${decYear.year}년에 하면 운이 받쳐 준다냥.`
          : `앞에 놓인 ${dec.label}, 세 해 다 운이 넉넉하진 않다냥. 그나마 ${decYear.year}년이 덜 무거우니, 준비를 단단히 해서 그때 해라냥.`
        : a("du4") === "none"
          ? `지금은 큰 결정이 없어도 ${bestSeun.year}년엔 생긴다냥. 그때 이 표를 다시 봐라냥.`
          : null,
    ),
    seun.map((y) => `📊 ${y.year}년 ${y.score}점 · ${scoreWord(y.score)}`),
  );

  const livedTurns = c.daeun.filter((d) => d.age <= c.age && d.age > 1).slice(-2);
  const nextTurns = c.daeun.filter((d) => d.age > c.age && d.age <= Math.max(80, c.age + 20)).slice(0, 2);
  // Each 교운기 carries what the reader said about that time (past) or what is waiting at it (future).
  const decAt = (d: Daeun): string | null => {
    if (!dec || !cur || d !== nextTurns[0]) return null;
    if (d.age - c.age <= 2) return dec.gods.includes(d.god) && d.score >= 55 ? `${josa(dec.label, "은/는")} 넘어가서` : `${josa(dec.label, "은/는")} 넘어가기 전에`;
    if (dec.gods.includes(cur.god) && cur.score >= 55) return `${josa(dec.label, "은/는")} 이 전에 끝내기`;
    if (dec.gods.includes(d.god) && d.score >= 55) return `${josa(dec.label, "은/는")} 이 뒤에`;
    return null;
  };
  const turnNote = (d: Daeun, past: boolean): string => {
    const n = past
      ? [
          turn?.hit && turn.age === d.age && "판이 바뀌었다던 그때",
          hardAt?.d === d && `힘들었다던 ${hardAt.label}의 시작`,
          bestAt?.d === d && `잘 풀렸다던 ${bestAt.label}의 시작`,
          a("du3") === "turn" && c.age - d.age <= 3 && "최근 판갈이의 정체",
        ]
      : [decAt(d), wantHit === d && want && `${josa(want.label, "이/가")} 들어오는 문`, d === peak && "황금기의 입구", d === trough && "몸을 낮출 10년의 입구"];
    const shown = n.filter(Boolean);
    return shown.length ? ` ← ${shown.join(" · ")}` : "";
  };
  const turnSec = sec(
    "인생의 전환점 · 교운기",
    turn?.hit ? "판이 바뀐 해, 대운표에 그대로 있다냥" : "다음 판갈이를 미리 알아 둬라냥",
    lines(
      // The 맛보기 already said when; the 감정서 says what turned.
      turn?.hit ? turn.detail : turn?.line,
      nextTurns[0]
        ? `다음 교운기까지 ${Math.max(0, nextTurns[0].age - 1 - c.age)}년 남았다냥. 그 전후로 내린 결정이 다음 10년을 정하니, 큰 계약·이사는 한 번 더 따져 보고 잡아라냥.`
        : "남은 길에 큰 판갈이는 없다냥. 이제는 해마다의 흐름이 판을 바꾼다냥.",
    ),
    [
      ...livedTurns.map((d) => `✔️ 지나온 교운기: ${d.age - 1}~${d.age}세 (${ageYear(d.age - 1)}~${ageYear(d.age)}년)${turnNote(d, true)}`),
      ...nextTurns.map((d) => `🔄 다가올 교운기: ${d.age - 1}~${d.age}세 (${ageYear(d.age - 1)}~${ageYear(d.age)}년)${turnNote(d, false)}`),
      // a 충 year the reader named, not on a 교운기
      ...(turn?.hit && turn.age && !c.daeun.some((d) => d.age === turn.age) ? [`🔀 네가 꼽은 전환점: ${turn.age}세 (${ageYear(turn.age)}년) · 일지 충이 든 해`] : []),
    ],
  );

  const d0 = c.daeun[0];
  const childSec = sec(
    "어린 시절과 첫 대운",
    `첫 대운 ${d0.ganji}, ${T(d0).theme}이었다냥`,
    lines(
      childRead(c, a("du9")),
      said.has(godText(d0))
        ? `첫 대운은 ${range(d0)} ${d0.ganji}(${d0.hanja}) 대운, 앞에서 짚은 그 10년이다냥.`
        : `첫 대운은 ${range(d0)} ${d0.ganji}(${d0.hanja}) 대운이다냥. ${godText(d0)}`,
      CHILD_HABIT[a("du9") ?? ""] ?? "어릴 때의 운은 성격의 바탕이 된다냥. 지금 네 버릇 중 몇 개는 이때 생긴 거다냥.",
    ),
    [
      `🏡 첫 대운: ${range(d0)} ${d0.ganji} · ${d0.score}점 · ${scoreWord(d0.score)}`,
      `👪 부모 자리(년·월주): ${c.saju.summary.pillars[0].hanja} · ${c.saju.summary.pillars[1].hanja}`,
    ],
  );

  const burdenGood = Boolean(cur && (cur.score >= 62 || (burden?.gods.includes(cur.god) && cur.score >= 55)));
  const relief = burden ? yearlyLuck(c, 6, aheadYear()).find((y) => burden.gods.includes(y.god) && y.score >= 62) : undefined;
  const burdenSec = burden
    ? sec(
        "지금의 짐 · 풀리는 해",
        relief ? `${relief.year}년, ${burden.label} 짐이 가벼워진다냥` : `${burden.label} 짐, 조금씩 덜어 내는 흐름이다냥`,
        lines(
          !cur ? `${josa(burden.label, "이/가")} 제일 무겁다고 했지.` : null,
          burdenGood ? burden.good : burden.bad,
          relief
            ? `${relief.year}년(${relief.ganji})은 너한테 '${relief.god}'의 해다냥. 그해부터 숨통이 트인다냥.`
            : "6년 안엔 큰 반전보다 조금씩 덜어 내는 흐름이다냥. 한 번에 내려놓으려 하지 마라냥.",
        ),
        [...(cur ? [`🎒 지금 대운: ${cur.ganji} · ${T(cur).theme}`] : []), ...(relief ? [`🌤️ 숨통 트이는 해: ${relief.year}년(${relief.ganji})`] : [])],
      )
    : null;

  const helperDaeun = c.daeun.find(
    (d) => d.age > c.age && d.age <= Math.max(80, c.age + 20) && (["정인", "편인", "정관"].includes(d.god) || gwiinOf(c.dayStem).includes(d.branch)),
  );
  const helperSec = sec(
    "귀인의 흐름",
    helperDaeun ? `${range(helperDaeun)}, 귀인이 들어온다냥` : c.sinsal.gwiin ? "막판에 꼭 누가 돕는 팔자다냥" : "네 실력이 곧 귀인인 팔자다냥",
    lines(
      helperRead(c, a("du10")),
      c.sinsal.gwiin ? "원국에 천을귀인이 있다냥. 죽으란 법은 없는 팔자다냥." : null,
      helperDaeun
        ? `앞으로 ${range(helperDaeun)} ${helperDaeun.ganji} 대운에 너를 끌어 줄 사람이 온다냥. 그때 들어온 제안은 가볍게 넘기지 마라냥.`
        : "앞으로 대운에서 크게 끌어 주는 귀인보다, 네가 쌓은 실력이 길을 연다냥.",
    ),
    [`🤝 귀인 띠: ${gwiinAnimals(c).join("띠 · ")}띠`, ...(helperDaeun ? [`🌟 귀인 대운: ${range(helperDaeun)} ${helperDaeun.ganji}`] : [])],
  );

  const useSec = sec(
    "대운 활용법",
    `${josa(stem.name, "은/는")} ${josa(elementLabel(c.yongsin), "을/를")} 타야 산다냥`,
    lines(
      want
        ? !wantHit
          ? `앞으로 10년, ${josa(want.label, "을/를")} 원한다고 했지. 대운이 대놓고 주는 운은 아니다냥. 그래서 네가 먼저 움직여야 한다냥.`
          : wantHit === cur
            ? `앞으로 10년, ${josa(want.label, "을/를")} 원한다고 했지. 지금 ${range(wantHit)} ${wantHit.ganji} 대운이 바로 그걸 주는 대운이다냥. 지금 안 잡으면 언제 잡냥.`
            : wantHit.age <= c.age + 10
              ? `앞으로 10년, ${josa(want.label, "을/를")} 원한다고 했지. ${wantHit.age}세부터 시작되는 ${wantHit.ganji} 대운이 그걸 준다냥. 그 전까지 그릇을 키워 둬라냥.`
              : `앞으로 10년, ${josa(want.label, "을/를")} 원한다고 했지. 이번 10년 안엔 대운이 대놓고 주진 않는다냥. 진짜 큰 판은 ${range(wantHit)} ${wantHit.ganji} 대운이다냥. 그때 거둘 걸 지금 심어 둬라냥.`
        : null,
      COPE_USE[a("du6") ?? ""]?.(peak.age) ?? null,
      `${elementLabel(c.yongsin)} 기운을 곁에 두는 게 대운을 타는 제일 쉬운 길이다냥. 아래 셋 중 하나만 오늘부터 해라냥.`,
    ),
    [`🎨 색: ${LUCK[c.yongsin].color}`, `🧭 방향: ${LUCK[c.yongsin].direction}`, `✅ 습관: ${LUCK[c.yongsin].act}`],
  );

  const sections = [
    { id: "now", icon: "▶️", section: nowSec },
    { id: "next", icon: "🔄", section: nextSec },
    { id: "turn", icon: "🔀", section: turnSec },
    { id: "peak", icon: "🌸", section: peakSec },
    { id: "trough", icon: "⛈️", section: troughSec },
    ...(burdenSec ? [{ id: "burden", icon: "🎒", section: burdenSec }] : []),
    { id: "child", icon: "🏡", section: childSec },
    { id: "helper", icon: "🤝", section: helperSec },
    { id: "all", icon: "🌊", section: allSec },
    { id: "seun", icon: "🗓️", section: seunSec },
    { id: "use", icon: "🧿", section: useSec },
  ];
  const report: FullReport = {
    // The 대운 graph already shows every 10-year score, so no separate score bars here.
    subScores: [],
    sections,
    luck: null,
  };

  // ── 무료 맛보기 ──
  // The graph carries the reader's own past (the future stays in the 감정서).
  const graphMarks = (d: Daeun) =>
    [hardAt?.d === d && "⛈️", bestAt?.d === d && "🌸", turn?.hit && turn.age && d.age <= turn.age && turn.age <= d.age + 9 && "🔀"].filter(Boolean) as string[];
  const graphLegend = [
    shownDaeun.some((d) => hardAt?.d === d) && "⛈️ 힘들었다던 때",
    shownDaeun.some((d) => bestAt?.d === d) && "🌸 잘 풀렸다던 때",
    shownDaeun.some((d) => graphMarks(d).includes("🔀")) && "🔀 판이 바뀌었다던 때",
  ].filter(Boolean) as string[];
  const hard = pastCheck(c, a("du1"), "hard");
  const best = pastCheck(c, a("du2"), "best");
  const beats: FortuneBeat[] = [
    {
      say: `${name}… 원국부터 깔고 대운을 세운다냥.`,
      mood: "smug",
      card: { kind: "chart" },
      next: "감정 근거는?",
    },
    {
      say: `${c.forward ? "순행" : "역행"} 대운이다냥. ${c.daeunSu}세부터 10년마다 운이 갈아탄다냥.`,
      mood: "talk",
      card: basisCard(c),
      next: "내 인생 그래프는?",
    },
    {
      say: cur
        ? `${name}의 인생 그래프다냥. 막대가 높을수록 운이 센 10년이고, 올해 ${c.age}세는 ${range(cur)} 칸에 서 있다냥.${graphLegend.length ? " 네가 꼽은 때도 찍어 뒀다냥." : ""}`
        : `${name}의 인생 그래프다냥. 막대가 높을수록 운이 센 10년이다냥. 첫 칸은 ${c.daeun[0].age}세에 열린다냥.`,
      mood: "wow",
      card: {
        kind: "timeline",
        title: `${name}의 대운`,
        items: shownDaeun.map((d) => ({
          age: range(d),
          ganji: d.ganji,
          hanja: d.hanja,
          score: d.score,
          current: d === cur,
          god: d.god,
          marks: graphMarks(d),
        })),
        legend: graphLegend,
      },
      next: "지나온 건 맞아?",
    },
  ];
  if (hard)
    beats.push({
      say: "지나온 길부터 맞춰 보자냥.",
      mood: "smug",
      card: { kind: "text", icon: "⛈️", title: "제일 힘들었던 때", body: hard },
      next: "잘 풀렸던 때는?",
    });
  if (best)
    beats.push({
      say: "좋았던 때도 보자냥.",
      mood: "happy",
      card: {
        kind: "text",
        icon: "🌸",
        title: "제일 잘 풀렸던 때",
        body: best,
      },
      next: turn?.hit ? "또 있어?" : "지금은?",
    });
  if (turn?.hit)
    beats.push({
      say: turn.age ? `인생이 바뀌었다는 ${turn.age}세 언저리, 대운표에 그대로 찍혀 있다냥.` : "인생이 바뀌었다는 그때, 대운표에 그대로 찍혀 있다냥.",
      mood: "wow",
      card: { kind: "text", icon: "🔀", title: "인생의 전환점", body: turn.line },
      next: "소름… 지금은?",
    });
  if (cur) {
    beats.push({
      say: `지금 너는 ${range(cur)} ${cur.ganji} 대운 안에 있다냥.`,
      mood: "wow",
      card: {
        kind: "score",
        label: "지금 대운",
        score: cur.score,
        headline: `${T(cur).theme} · ${scoreWord(cur.score)}`,
        // The 감정서 opens with the full reading of this 대운; the 맛보기 only places the reader in it.
        body: `${GOD_SHORT[cur.god]}의 기운이 ${cur.score >= 66 ? "등을 밀어 주는" : cur.score < 52 ? "짐으로 얹히는" : "오가는"} 10년이다냥. 올해가 그 ${yearIn}년째, ${yearIn <= 3 ? "아직 초입" : yearIn >= 8 ? "끝자락" : "한복판"}이다냥.`,
      },
      next: "앞으로는?",
    });
  }
  const wants = want ? `네가 원한 ${josa(want.label, "을/를")} 언제 잡는지` : "네 인생 황금기";
  const teaser: FortuneTeaser = {
    mode: "daeun",
    title: `${name}의 대운 감정서`,
    saju: c.saju.summary,
    beats,
    paywall:
      next && next.age <= 100
        ? `…여기서부터가 진짜다냥. ${wants}, 조심할 때, ${next.age}세 교운기에 할 일, ${burden ? `${burden.label} 짐이 가벼워지는 해` : "짐이 가벼워지는 해"}, 귀인이 오는 대운까지 다 적어 뒀다냥. 듣고 갈래? 😼`
        : `…여기서부터가 진짜다냥. ${wants}, 앞으로 조심할 해와 잡을 해가 언제인지 다 적어 뒀다냥. 듣고 갈래? 😼`,
    locked: sections.map((s) => locked(s.id, s.icon, s.section)),
    story: {
      kind: "fortune",
      label: `${name}의 대운 감정서`,
      emoji: "🌊",
      headline: cur ? `${range(cur)} ${cur.ganji} 대운` : `${c.daeun[0].age}세 첫 대운 전`,
      sub: cur ? T(cur).theme : T(c.daeun[0]).theme,
      meta: c.saju.summary.pillars.map((pl) => pl.hanja).join(" "),
      slipLabel: "지금 대운 점수",
      slipValue: `${(cur ?? c.daeun[0]).score}점`,
      slipText: `${scoreWord((cur ?? c.daeun[0]).score)} · ${c.forward ? "순행" : "역행"} · 대운수 ${c.daeunSu}`,
    },
  };
  return { teaser, report };
}

export const GOD_GROUP = GROUP_OF;
