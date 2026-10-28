import "server-only";
import type { ElementKey, FortuneBeat, FortuneTeaser, FullReport, QuestionnaireInput } from "@/models/types";
import { ANIMALS, SOLAR_TERMS, branchRelation, dayCycleIndex, stemRelation } from "../saju";
import { type Chart, BRANCHES_HANGUL, STEMS_HANGUL, buildChart, elementLabel, monthlyPillars, samhapWith, thisYear } from "./chart";
import { STEM, basisCard, daNyang, josa, lines, locked, sec } from "./common";

// ───────────── 재회운 ─────────────

type Factor = { v: number; good?: string; bad?: string };

/** Each answer moves the odds; the sentence explains why (shown as 유리/불리 요인). */
const FACTORS: Record<string, Record<string, Factor>> = {
  rq1: {
    me: { v: 10, good: "끝낸 게 너라서, 문을 다시 여는 열쇠도 너한테 있다냥." },
    them: {
      v: -8,
      bad: "{p:이/가} 놓은 이별이라, {p} 마음이 먼저 움직여야 한다냥.",
    },
    both: {
      v: 4,
      good: "합의한 이별은 미움이 적다냥. 다시 말 걸 명분이 남아 있다냥.",
    },
    fade: {
      v: 6,
      good: "흐지부지 끝난 인연은 끝맺음이 없어서, 둘 다 마음 한쪽이 열려 있다냥.",
    },
    ghost: {
      v: -2,
      bad: "잠수는 피하는 사람의 이별이다냥. 다시 와도 또 숨을 수 있다냥.",
    },
  },
  rq2: {
    w1: {
      v: 2,
      bad: "아직 감정이 뜨거워서 지금 움직이면 싸움이 다시 붙는다냥.",
    },
    m1: { v: 6, good: "한 달 안쪽은 서로 제일 흔들리는 때다냥." },
    m3: {
      v: 10,
      good: "석 달 안쪽은 나쁜 기억이 흐려지고 좋은 기억만 남는 때다냥. 재회가 제일 많이 일어난다냥.",
    },
    y1: { v: -2, bad: "시간이 꽤 흘러서 각자의 생활이 굳기 시작했다냥." },
    long: {
      v: -10,
      bad: "1년이 넘으면 둘 다 다른 사람이 됐다냥. 재회가 아니라 새로 시작하는 거다냥.",
    },
  },
  rq3: {
    fight: { v: 4, good: "반복된 싸움은 방식의 문제라 고칠 수 있다냥." },
    cool: { v: -8, bad: "식은 마음은 다시 데우기가 제일 어렵다냥." },
    third: {
      v: -14,
      bad: "제3자가 낀 이별은 그 사람이 정리되기 전엔 안 움직인다냥.",
    },
    real: {
      v: 6,
      good: "마음이 아니라 상황이 막은 이별이다냥. 상황이 바뀌면 마음은 그대로 있다냥.",
    },
    talk: { v: 8, good: "말이 안 통한 이별은 한 사람만 바뀌어도 풀린다냥." },
    nowhy: {
      v: -2,
      bad: "이유를 안 준 이별은 그 사람 안에서도 정리가 안 됐다는 뜻이다냥.",
    },
  },
  rq4: {
    none: { v: 0 },
    noreply: {
      v: -8,
      bad: "답이 없는 연락은 지금은 거절이다냥. 같은 방법을 또 쓰면 멀어진다냥.",
    },
    some: { v: 10, good: "안부가 오간다는 건 줄을 놓기 싫다는 거다냥." },
    they: {
      v: 16,
      good: "{p:이/가} 먼저 연락했다냥. 이게 제일 강한 신호다냥.",
    },
    blocked: { v: -14, bad: "차단은 지금 당장은 문을 닫았다는 뜻이다냥." },
  },
  rq5: {
    watch: { v: 12, good: "네 스토리를 본다냥. 끊을 사람은 안 본다냥." },
    erase: {
      v: 2,
      good: "지웠다는 건 아직 감정이 있다는 거다냥. 무덤덤한 사람은 안 지운다냥.",
    },
    new: { v: -14, bad: "새 사람 흔적이 있다냥." },
    quiet: { v: 2 },
    dunno: { v: 0 },
  },
  rq6: {
    short: {
      v: -6,
      bad: "짧게 만난 인연은 정이 들기 전에 끝나서 붙잡을 끈이 약하다냥.",
    },
    year: { v: 0 },
    mid: { v: 6, good: "1~3년의 정은 쉽게 안 끊긴다냥." },
    long: { v: 10, good: "3년 넘게 쌓인 정은 몸이 기억한다냥." },
    again: {
      v: 12,
      good: "헤어졌다 돌아온 적이 있다냥. 원래 돌아오는 인연이다냥.",
    },
  },
  rq7: {
    me: { v: 6, good: "네가 바뀔 수 있다면 같은 이유로는 안 헤어진다냥." },
    them: {
      v: -4,
      bad: "{p:이/가} 바뀌어야 한다면, 그건 네가 정할 수 없는 일이다냥.",
    },
    both: {
      v: 8,
      good: "둘 다 노력하면 된다는 건, 원인을 정확히 안다는 뜻이다냥.",
    },
    same: { v: -10, bad: "똑같을 것 같다면 다시 만나도 같은 데서 끝난다냥." },
  },
  rq8: {
    must: { v: 0 },
    torn: { v: 0 },
    close: { v: -4 },
    wait: { v: 2 },
    curious: { v: 0 },
  },
};

const BAND = (n: number) =>
  n >= 75
    ? "다시 이어질 기운이 강하다냥 🔥"
    : n >= 58
      ? "문이 반쯤 열려 있다냥"
      : n >= 42
        ? "쉽진 않지만 길은 있다냥"
        : n >= 28
          ? "지금은 문이 닫혀 있다냥"
          : "놓아야 할 때가 가까워졌다냥";

/** 그 사람 마음 온도 (0..100) and the line that explains it. */
function mindOf(a: (id: string) => string | undefined): {
  temp: number;
  line: string;
} {
  let t = 50;
  const c4 = a("rq4");
  const c5 = a("rq5");
  t += { they: 30, some: 15, none: -2, noreply: -15, blocked: -25 }[c4 ?? ""] ?? 0;
  t += { watch: 18, erase: 6, new: -22, quiet: 0, dunno: 0 }[c5 ?? ""] ?? 0;
  t += { me: 8, them: -6, both: 2, fade: 4, ghost: -10 }[a("rq1") ?? ""] ?? 0;
  t += { w1: 6, m1: 6, m3: 4, y1: -6, long: -14 }[a("rq2") ?? ""] ?? 0;
  const temp = Math.round(Math.max(8, Math.min(95, t)));
  const line =
    c4 === "they"
      ? "{p:은/는} 지금 확인하고 싶은 거다냥. 네가 아직 자기를 생각하는지."
      : c5 === "watch"
        ? "스토리를 본다는 건, 끊을 마음이 없다는 거다냥. 끊을 사람은 안 본다냥."
        : c4 === "blocked"
          ? "차단은 미움이 아니라, 흔들리지 않으려고 친 벽이다냥."
          : c5 === "erase"
            ? "지웠다는 건 아직 감정이 있다는 거다냥. 지금은 너를 보는 게 아픈 거다냥."
            : c4 === "noreply"
              ? "답이 없는 건 읽고 한참 생각했다는 거다냥. 답하면 다시 흔들릴까 봐 못 하는 거다냥."
              : c4 === "some"
                ? "안부를 주고받는 건, 줄을 놓기 싫다는 거다냥."
                : c5 === "new"
                  ? "새 사람이 있다냥. 근데 그 자리, 아직 네 그림자가 남아 있다냥."
                  : "서로 먼저 연락하면 지는 줄 알고 버티는 중이다냥.";
  return { temp, line };
}

/** What 냥신 says back to "지금 네 마음은?" (정리하고 싶다 is answered in 놓아야 할 때). */
const HEART: Record<string, string> = {
  must: "무조건 다시 만나고 싶다고 했지. 그 간절함이 오히려 상대를 밀어낸다냥. 힘을 빼야 붙는다냥.",
  torn: "붙잡을지 고민 중이라고 했지. 고민하는 사이에 날짜가 지나간다냥. 아래 날짜 안에 정해라냥.",
  wait: "오면 받아 준다고 했지. 둘 다 기다리면 아무도 안 온다냥. 작은 신호 하나는 네가 줘라냥.",
  curious: "그쪽 마음이 궁금할 뿐이라고 했지. 그 궁금함이 이미 미련이다냥.",
};

const tempWord = (t: number) => (t >= 70 ? "아직 뜨겁다냥" : t >= 50 ? "미지근하게 남아 있다냥" : t >= 30 ? "식었지만 불씨는 남아 있다냥" : "지금은 차갑게 닫혀 있다냥");

const NEW_PERSON: Record<string, string> = {
  w1: "헤어지고 바로 생긴 사람은 빈자리를 메우는 사람이다냥. 오래 못 간다냥.",
  m1: "한 달 안에 생긴 사람은 대부분 빈자리를 메우는 사람이다냥. 석 달을 넘기기 어렵다냥.",
  m3: "석 달 안에 생긴 사람은 비교 대상이다냥. 비교가 끝나면 둘 중 하나는 정리된다냥.",
  y1: "시간이 꽤 지나 생긴 사람이라, 자리 잡은 인연일 수 있다냥.",
  long: "오래 지나 생긴 사람은 새 인연이다냥. 그 자리를 흔들면 너만 다친다냥.",
};

const FIRST_LINE: Record<string, string> = {
  fight: '"그때 내가 너무 날카로웠던 거 미안해. 잘 지내?"',
  cool: '"문득 생각나서. 잘 지내지?" — 감정은 싣지 마라냥.',
  third: '연락보다 기다림이다냥. 굳이 한다면 "잘 지내? 갑자기 생각났어."',
  real: '"요즘은 상황 좀 괜찮아?" — 이별 이유였던 그 현실부터 물어라냥.',
  talk: '"그때 내가 말을 너무 안 했던 것 같아." — 네가 먼저 인정하는 게 열쇠다냥.',
  nowhy: '"이유라도 알고 싶어서. 부담 갖지 말고 답해 줘."',
};
const SECOND_LINE: Record<string, string> = {
  they: '"연락 줘서 고마워. 나도 가끔 생각났어." — 받아 줄 때 확실히 받아 줘라냥.',
  some: '안부 다음 한 걸음: "다음에 밥 한번 먹자. 부담 없이."',
  noreply: "같은 방법은 안 된다냥. 한 달 쉬고, 짧게 딱 한 줄만.",
  none: '"이거 보니까 네 생각나더라." — 둘만 아는 걸 하나 보내라냥.',
  blocked: "지금은 연락 말고 기다려라냥. 문은 {p:이/가} 다시 연다냥.",
};
const AFTER: Record<string, string> = {
  fight: "같은 싸움이 또 돌면 끝이다냥. 싸움 규칙 하나만 정해라냥: 그날 안에 푼다, 단 '헤어져'는 금지.",
  cool: "식는 건 무관심에서 온다냥. 일주일에 한 번, 처음처럼 데이트해라냥.",
  third: "믿음이 깨진 자리는 시간이 메운다냥. 확인하고 싶은 걸 참는 게 아니라, 말로 물어라냥.",
  real: "현실 문제는 마음으로 못 이긴다냥. 다시 만나기 전에 그 문제의 답부터 같이 정해라냥.",
  talk: "표현이 문제였다냥. 서운한 건 그날 말하기, 좋은 것도 그날 말하기.",
  nowhy: "다시 만나면 그때 왜 떠났는지부터 꼭 들어라냥. 그걸 모르면 같은 데서 또 끝난다냥.",
};

const EL_HINT: Record<ElementKey, string> = {
  wood: "추진력과 앞날을 그리는 힘",
  fire: "따뜻함과 표현",
  earth: "편안함과 안정",
  metal: "결단과 기준",
  water: "깊이와 이해심",
};

const WEEK = "일월화수목금토";

/** Good days to reach out in the next ~45 days: 천간합 or 육합 with my day pillar (and theirs, if known). */
function contactDays(me: Chart, them: Chart | null): string[] {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const out: { label: string; rank: number; t: number }[] = [];
  for (let k = 3; k < 48; k++) {
    const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + k));
    const idx = dayCycleIndex(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    const s = idx % 10;
    const b = idx % 12;
    let rank = 0;
    if (Math.abs(s - me.dayStem) === 5) rank += 2;
    if (branchRelation(me.dayBranch, b) === "harmony") rank += 2;
    if (samhapWith(me.dayBranch, b)) rank += 1;
    if (branchRelation(me.dayBranch, b) === "clash") rank -= 3;
    if (them) {
      if (branchRelation(them.dayBranch, b) === "harmony") rank += 1;
      if (branchRelation(them.dayBranch, b) === "clash") rank -= 2;
    }
    if (rank >= 2)
      out.push({
        rank,
        t: d.getTime(),
        label: `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEK[d.getUTCDay()]}) ${STEMS_HANGUL[s]}${BRANCHES_HANGUL[b]}일`,
      });
  }
  return out
    .sort((x, y) => y.rank - x.rank || x.t - y.t)
    .slice(0, 3)
    .sort((x, y) => x.t - y.t)
    .map((x) => x.label);
}

/** The best 월운 among this solar month and the next three, as "이번 달(무술월)" / "11월 7일부터(기해월)". */
function bestMonth(me: Chart): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const y = thisYear();
  const months = [...monthlyPillars(y - 1), ...monthlyPillars(y), ...monthlyPillars(y + 1)]
    .map((x) => {
      const [, td] = SOLAR_TERMS.find(([, , br]) => br === x.branch)!;
      return { ...x, start: Date.UTC(x.year, x.month - 1, td), day: td };
    })
    .sort((p, q) => p.start - q.start);
  const curIdx = months.findIndex((x, i) => x.start <= today && (months[i + 1]?.start ?? Infinity) > today);
  const scored = months.slice(curIdx, curIdx + 4).map((x, i) => ({
    ...x,
    current: i === 0,
    s:
      (branchRelation(me.dayBranch, x.branch) === "harmony" ? 3 : 0) +
      (samhapWith(me.dayBranch, x.branch) ? 2 : 0) +
      (Math.abs(x.stem - me.dayStem) === 5 ? 2 : 0) -
      (branchRelation(me.dayBranch, x.branch) === "clash" ? 3 : 0),
  }));
  const best = scored.sort((p, q) => q.s - p.s || p.start - q.start)[0];
  if (!best) return "다음 달";
  const gz = `${STEMS_HANGUL[best.stem]}${BRANCHES_HANGUL[best.branch]}월`;
  return best.current ? `이번 달(${gz})` : `${best.month}월 ${best.day}일부터(${gz})`;
}

export function reunionReading(input: QuestionnaireInput, c: Chart): { teaser: FortuneTeaser; report: FullReport } {
  const name = input.me.name;
  const pName = input.partner.name || "그 사람";
  const P = (s: string) => s.replace(/\{p:(이\/가|은\/는|을\/를|과\/와|이랑\/랑)\}/g, (_, pair) => josa(pName, pair)).replaceAll("{p}", pName);
  const a = (id: string) => (input.self[id] && input.self[id] !== "?" ? input.self[id] : undefined);
  const them = input.partner.birthdate ? buildChart(input.partner.birthdate, "", input.partner.gender) : null;

  // ── 점수 ──
  let score = 50;
  const good: string[] = [];
  const bad: string[] = [];
  for (const q of Object.keys(FACTORS)) {
    const f = FACTORS[q][a(q) ?? ""];
    if (!f) continue;
    score += f.v;
    if (f.good) good.push(P(f.good));
    if (f.bad) bad.push(P(f.bad));
  }
  let sajuLine: string | null = null;
  let missing: string | null = null;
  if (them) {
    const rel = stemRelation(c.saju.dm, them.saju.dm);
    const br = branchRelation(c.dayBranch, them.dayBranch);
    score +=
      {
        combine: 10,
        theyGenerate: 5,
        iGenerate: 5,
        same: 3,
        iControl: -4,
        theyControl: -4,
      }[rel] + (br === "harmony" ? 6 : br === "clash" ? -6 : 0);
    sajuLine = {
      combine: "두 일간이 천간합(天干合)이다냥. 끌림으로 묶인 인연이라, 떨어져도 자꾸 생각난다냥.",
      theyGenerate: `${josa(pName, "이/가")} 너를 살려 주는 상생(相生)이다냥. 그래서 그 사람 없는 자리가 유난히 허전한 거다냥.`,
      iGenerate: `네가 ${josa(pName, "을/를")} 살려 주는 상생이다냥. 주기만 하다 지쳐서 끝났을 거다냥.`,
      same: "같은 기운의 일간이다냥. 친구처럼 편한데, 고집도 똑같아서 부딪친다냥.",
      iControl: `네가 ${josa(pName, "을/를")} 누르는 상극(相剋)이다냥. 네 말 한마디가 그 사람한텐 두 배로 아팠다냥.`,
      theyControl: `${josa(pName, "이/가")} 너를 누르는 상극이다냥. 그 사람 앞에선 늘 작아졌지?`,
    }[rel];
    if (br === "harmony") sajuLine += " 일지까지 육합이라 몸이 먼저 기억하는 인연이다냥.";
    if (br === "clash") sajuLine += " 일지가 충이라 붙으면 부딪치고, 떨어지면 그립다냥.";
    const myWeak = c.saju.summary.lacking;
    const theirs = them.saju.summary.elements;
    if (theirs[myWeak] >= 2)
      missing = `네 사주에 제일 부족한 ${josa(elementLabel(myWeak), "이/가")} ${pName}한테 넘친다냥. ${EL_HINT[myWeak]}, 그걸 그 사람한테서 채웠던 거다냥. 그래서 못 잊는 거다냥.`;
  }
  score = Math.round(Math.max(12, Math.min(93, score)));
  const mind = mindOf(a);
  const mindLine = P(mind.line);

  // ── 유료 감정서 ──
  const mindSec = sec(
    `${pName}의 지금 속마음`,
    `마음 온도 ${mind.temp}도다냥`,
    lines(
      mindLine,
      a("rq5") === "new" && a("rq2") ? NEW_PERSON[a("rq2")!] : null,
      a("rq1") === "me" ? P("{p:은/는} 버림받았다고 생각한다냥. 그래서 먼저 오진 않는다냥. 자존심이 허락하는 문을 네가 열어 줘야 한다냥.") : null,
      a("rq1") === "them" ? P("떠난 쪽도 아프다냥. {p:은/는} 지금 '내가 잘한 걸까'를 몇 번이고 되묻는 중이다냥.") : null,
      a("rq3") === "cool" ? P("식은 게 정말 마음인지, 지친 건지 {p}도 헷갈려 한다냥.") : null,
      a("rq3") === "real" ? P("{p:은/는} 너를 싫어서가 아니라 상황 때문에 놓았다냥. 그 상황이 아직 그대로인지가 관건이다냥.") : null,
    ),
    [`🌡️ 마음 온도 ${mind.temp}도 · ${tempWord(mind.temp)}`],
  );

  const chanceSec = sec(
    "재회 가능성 상세",
    `${score}점, ${BAND(score)}`,
    lines(
      them ? "네 답 여덟 개와 두 사람 사주를 겹쳐 본 결과다냥." : P("네 답 여덟 개와 네 사주로 본 결과다냥. {p} 생일을 알면 더 또렷해진다냥."),
      good.length ? `유리한 게 ${good.length}개, 불리한 게 ${bad.length}개다냥.` : "지금은 불리한 게 더 많다냥. 그래도 아래를 봐라냥.",
      P(HEART[a("rq8") ?? ""] ?? ""),
    ),
    [...good.map((g) => `✅ ${g}`), ...bad.map((b) => `⚠️ ${b}`)],
  );

  const days = contactDays(c, them);
  const waitRule =
    a("rq2") === "w1"
      ? "아직 일주일도 안 됐다냥. 최소 3주는 참아라냥. 지금 연락하면 같은 싸움이 붙는다냥."
      : a("rq4") === "blocked"
        ? "차단 상태에선 네가 움직이지 마라냥. 다른 계정·지인 통한 연락은 문을 아예 잠근다냥."
        : a("rq5") === "new"
          ? "새 사람이 있는 동안은 기다림이 답이다냥. 정리되는 신호(사진 삭제·프로필 변화)가 먼저다냥."
          : a("rq4") === "noreply"
            ? "답이 없었으니 최소 한 달은 쉬어라냥. 같은 방법을 두 번 쓰면 멀어진다냥."
            : "연락할 거면 아래 날짜에 해라냥. 네 기운이 열리는 날이다냥.";
  const timingSec = sec(
    "연락 타이밍",
    days.length ? `${days[0]}이 첫 번째 문이다냥` : "다음 달이 문이다냥",
    lines(
      waitRule,
      days.length && !waitRule.startsWith("연락할 거면") ? "아래 날짜는 그 신호가 온 다음에 써라냥." : null,
      `달로 보면 ${josa(bestMonth(c), "이/가")} 기운이 맞다냥.`,
      "시간은 저녁 8~10시. 퇴근하고 마음이 풀린 시간이다냥.",
    ),
    days.length ? days.map((d) => `📅 ${d}`) : ["📅 이번 달은 네 기운이 닫혀 있다냥. 다음 달 초를 노려라냥."],
  );

  // They already reached out: the first line is a reply, not an opener.
  const replied = a("rq4") === "they";
  const firstSec = sec(
    "첫 연락 문장",
    replied ? "답장 한 줄이 재회를 정한다냥" : "첫 문장에 재회를 꺼내면 끝이다냥",
    lines(
      replied
        ? P("{p:이/가} 먼저 문을 두드렸다냥. 이제 네 답장이 첫 문장이다냥. 재회는 세 번째 대화쯤에 나온다냥.")
        : "첫 문장의 목적은 '대화를 다시 여는 것' 하나다냥. 재회는 세 번째 대화쯤에 나온다냥.",
    ),
    [
      ...(replied ? [] : [`💬 ${P(FIRST_LINE[a("rq3") ?? ""] ?? '"잘 지내? 문득 생각나서."')}`]),
      ...(a("rq4") && SECOND_LINE[a("rq4")!] ? [`💬 ${P(SECOND_LINE[a("rq4")!])}`] : []),
      '🚫 보내면 안 되는 문장: "우리 다시 만나면 안 돼?" · "나 아직 너 못 잊었어"',
    ],
  );

  const donts = [
    "🍺 술 마시고 연락하기 — 다음 날 후회만 남는다냥",
    a("rq8") === "must" ? "📜 장문의 고백·사과문 — 무게에 눌려 도망간다냥" : "🙊 친구 통해 떠보기 — 다 들어간다, 그리고 싫어한다냥",
    a("rq5") === "watch" ? "📸 스토리로 신호 보내기·저격글 — 다 보이고, 다 읽힌다냥" : "🔍 SNS 염탐하다 좋아요 누르기 — 한 번이면 끝이다냥",
    a("rq4") === "blocked" ? "👤 다른 계정으로 연락 — 영영 잠긴다냥" : "⏰ 답 늦다고 연달아 보내기 — 기다리는 것도 대화다냥",
  ];
  const dontSec = sec("절대 하면 안 되는 행동", "이것만 안 해도 반은 간다냥", lines("재회는 하는 것보다 안 하는 게 더 중요하다냥."), donts);

  const matchSec = them
    ? sec(
        "두 사람 사주 궁합",
        `${STEM[c.dayStem].name} × ${STEM[them.dayStem].name}`,
        lines(sajuLine, missing, `${pName}의 일간은 ${daNyang(`'${STEM[them.dayStem].image}'`)}. ${STEM[them.dayStem].love}`),
        (() => {
          const rel = stemRelation(c.saju.dm, them.saju.dm);
          const br = branchRelation(c.dayBranch, them.dayBranch);
          const relLabel = {
            combine: "천간합(天干合) · 끌림",
            theyGenerate: "상생 · 그 사람이 너를 살림",
            iGenerate: "상생 · 네가 그 사람을 살림",
            same: "비화(比和) · 같은 기운",
            iControl: "상극 · 네가 누름",
            theyControl: "상극 · 그 사람이 누름",
          }[rel];
          const brLabel = br === "harmony" ? "육합(六合)" : br === "clash" ? "충(沖)" : samhapWith(c.dayBranch, them.dayBranch) ? "삼합(三合)" : "무난";
          return [
            `☯️ 일간: ${relLabel}`,
            `🐾 일지: ${ANIMALS[c.dayBranch]} × ${ANIMALS[them.dayBranch]} · ${brLabel}`,
            ...(missing ? [`🎁 ${josa(pName, "이/가")} 채워 주는 기운: ${elementLabel(c.saju.summary.lacking)}`] : []),
          ];
        })(),
      )
    : sec(
        "네 쪽에서 본 인연 자리",
        `${pName} 생일을 몰라도 네 사주엔 보인다냥`,
        lines(
          `네 일간은 ${daNyang(`'${STEM[c.dayStem].image}'`)}. ${STEM[c.dayStem].love}`,
          c.sinsal.dohwa ? "도화살이 있어서 끝난 인연도 다시 끌려오는 팔자다냥." : "도화살은 없어서, 한번 끝난 인연은 네가 움직여야 돌아온다냥.",
          `${pName} 생일을 알게 되면 둘의 일간 궁합까지 볼 수 있다냥.`,
        ),
        [],
      );

  const afterSec = sec(
    "다시 만나면, 같은 이유로 안 헤어지려면",
    "재회보다 어려운 게 재회 후다냥",
    lines(
      AFTER[a("rq3") ?? ""] ?? "다시 만나기 전에, 그때 왜 끝났는지 한 문장으로 말할 수 있어야 한다냥.",
      a("rq7") === "same" ? "똑같을 것 같다고 했지. 그럼 다시 만나기 전에 바뀔 하나를 정해라냥. 그게 없으면 재회는 연장전일 뿐이다냥." : null,
      a("rq6") === "again" ? "헤어졌다 다시 만난 적이 있다고 했지. 이번이 세 번째 기회가 아니라 마지막 기회라고 생각해라냥." : null,
    ),
    [],
  );

  const letgo = [
    a("rq5") === "new" && (a("rq2") === "y1" || a("rq2") === "long") ? "새 사람과 반년 넘게 이어지고 있다면" : "새 사람과 공개적으로 사진을 올리기 시작하면",
    "네가 보낸 연락에 두 번 연속 답이 없으면",
    "같이 아는 사람들한테 너 얘기를 아예 안 하면",
  ];
  const letgoSec = sec(
    "놓아야 할 때의 신호",
    score < 35 ? "냉정하게 말하겠다냥. 지금은 놓는 게 너를 살린다냥" : "이 신호가 보이면 그땐 놓아라냥",
    lines(
      score < 35
        ? "지금 기운으론 붙잡을수록 멀어진다냥. 놓는 게 지는 게 아니다냥. 놓아야 다음 인연이 들어온다냥."
        : "가능성은 있다냥. 그래도 아래 신호가 오면 그땐 네 마음부터 지켜라냥.",
      a("rq8") === "close" ? "정리하고 싶다고 했지. 그 마음이 들었다면, 이미 반은 정리된 거다냥." : null,
    ),
    letgo.map((l) => `🍂 ${l}`),
  );

  const sections = [
    { id: "mind", icon: "💭", section: mindSec },
    { id: "chance", icon: "🔁", section: chanceSec },
    { id: "timing", icon: "📅", section: timingSec },
    { id: "first", icon: "💬", section: firstSec },
    { id: "dont", icon: "🚫", section: dontSec },
    { id: "match", icon: "☯️", section: matchSec },
    { id: "after", icon: "🔒", section: afterSec },
    { id: "letgo", icon: "🍂", section: letgoSec },
  ];
  const report: FullReport = { subScores: [], sections, luck: null };

  // ── 무료 맛보기 ──
  const hook =
    missing ??
    (a("rq6") === "again"
      ? P("헤어졌다 다시 만난 적 있다고 했지. 이 인연은 원래 돌아오는 인연이다냥. 문제는 돌아온 다음이다냥.")
      : a("rq1") === "fade"
        ? P("흐지부지 끝났다고 했지. 끝맺지 못한 인연은 둘 다 마음 한쪽을 열어 둔다냥. {p}도 그렇다냥.")
        : (sajuLine ?? P(`네 일간은 ${daNyang(`'${STEM[c.dayStem].image}'`)}. ${STEM[c.dayStem].love}`)));
  const beats: FortuneBeat[] = [
    {
      say: P(`${name}… {p} 생각에 잠을 설쳤구냥. 원국부터 펼친다냥.`),
      mood: "wow",
      card: { kind: "chart" },
      next: "감정 근거는?",
    },
    {
      say: "감정 근거다냥. 네 쪽 기운부터 본다냥.",
      mood: "talk",
      card: basisCard(c, them ? [["상대 일간", STEM[them.dayStem].name]] : []),
      next: "다시 만날 수 있어?",
    },
    {
      say: "재회 가능성부터 말하겠다냥.",
      mood: "smug",
      card: {
        kind: "score",
        label: "재회 가능성",
        score,
        headline: BAND(score),
        body: (good[0] ?? bad[0]) || undefined,
      },
      next: P("{p} 마음은?"),
    },
    {
      say: P(`${josa(pName, "이/가")} 지금 어떤 마음인지 보인다냥.`),
      mood: "wow",
      card: {
        kind: "score",
        label: P("{p}의 마음 온도"),
        score: mind.temp,
        headline: tempWord(mind.temp),
        body: mindLine,
      },
      next: "소름…",
    },
    {
      say: "그리고 하나 더.",
      mood: "smug",
      card: {
        kind: "text",
        icon: "🔗",
        title: "냥신이 본 이 인연",
        body: hook,
      },
      next: "그래서 어떻게 해?",
    },
  ];
  const teaser: FortuneTeaser = {
    mode: "reunion",
    title: P(`${name} → {p} 재회 감정서`),
    saju: c.saju.summary,
    beats,
    paywall: P("…여기서부터가 진짜다냥. {p}의 속마음 전부, 연락해도 되는 날짜, 보내야 할 첫 문장과 절대 보내면 안 되는 문장까지 다 적어 뒀다냥. 듣고 갈래? 😼"),
    locked: sections.map((s) => locked(s.id, s.icon, s.section)),
  };
  return { teaser, report };
}
