import "server-only";
import type { FortuneBeat, FortuneTeaser, FullReport, QuestionnaireInput } from "@/models/types";
import { branchRelation } from "../saju";
import { type Chart, type Daeun, type TenGod, GROUP_OF, elementLabel, yearlyLuck } from "./chart";
import { GOD_SHORT, LUCK, STEM, basisCard, daNyang, josa, lines, locked, scoreWord, sec, yearText } from "./common";

// ───────────── 인생 대운 흐름 ─────────────

/** 대운 천간의 십성: 그 10년의 주제. */
const GOD_DAEUN: Record<
  TenGod,
  {
    theme: string;
    body: string;
    up: string;
    down: string;
    do: string;
    dont: string;
  }
> = {
  비견: {
    theme: "독립의 10년",
    body: "내 이름으로 서는 시기다냥. 대신 경쟁자도 같이 큰다냥.",
    up: "내 이름으로 서는 10년이다냥. 독립·창업이 통한다냥.",
    down: "경쟁자가 내 몫을 나눠 간다냥. 사람 문제로 돈이 샌다냥.",
    do: "내 판을 만들어라냥",
    dont: "동업·보증",
  },
  겁재: {
    theme: "승부의 10년",
    body: "크게 걸고 크게 움직인다냥. 들어온 만큼 나간다냥.",
    up: "크게 걸어서 크게 먹는 10년이다냥. 배짱이 돈이 된다냥.",
    down: "들어온 만큼 나간다냥. 보증·동업으로 크게 잃는 10년이다냥.",
    do: "승부는 한 번만 크게",
    dont: "돈 빌려주기·남 따라 투자",
  },
  식신: {
    theme: "먹을 복의 10년",
    body: "먹고사는 걱정이 줄어든다냥. 재주가 밥이 되고 몸과 마음이 편해진다냥.",
    up: "재주가 밥이 되는 10년이다냥. 먹고살 걱정이 사라진다냥.",
    down: "편해서 주저앉기 쉬운 10년이다냥. 몸이 불고 의지가 준다냥.",
    do: "하고 싶던 걸 업으로",
    dont: "편해서 주저앉기",
  },
  상관: {
    theme: "판을 깨는 10년",
    body: "재능은 터지는데 윗사람·제도와 부딪친다냥. 이직·이별·창업이 몰린다냥.",
    up: "재능이 터지는 10년이다냥. 내 걸 세상에 꺼내면 이름이 난다냥.",
    down: "윗사람·제도와 부딪친다냥. 말 한마디로 자리를 잃는 10년이다냥.",
    do: "재주를 세상에 꺼내기",
    dont: "홧김에 사표·말실수",
  },
  편재: {
    theme: "큰돈의 10년",
    body: "큰돈이 오가고 많이 움직인다냥. 잡으면 크게, 놓치면 크게 잃는다냥.",
    up: "큰돈이 들어오는 10년이다냥. 움직이는 만큼 번다냥.",
    down: "큰돈이 오가는데 남는 게 없다냥. 욕심이 화를 부른다냥.",
    do: "사업·이동·기회 잡기",
    dont: "욕심으로 판 키우기",
  },
  정재: {
    theme: "쌓는 10년",
    body: "월급·저축·집, 안정이 들어온다냥. 화려하진 않아도 남는다냥.",
    up: "차곡차곡 쌓이는 10년이다냥. 집·저축이 이때 생긴다냥.",
    down: "벌어도 묶이는 10년이다냥. 돈 때문에 하고 싶은 걸 미룬다냥.",
    do: "모으고 굴리기",
    dont: "한 방 노리기",
  },
  편관: {
    theme: "시험의 10년",
    body: "압박과 고생이 많다냥. 여기서 버틴 사람이 다음 대운에 크게 된다냥.",
    up: "압박이 와도 이겨 내는 10년이다냥. 버틴 만큼 권한이 생긴다냥.",
    down: "압박과 고생이 겹치는 10년이다냥. 몸과 관재(官災)를 조심해라냥.",
    do: "버티고 실력 쌓기",
    dont: "무리해서 몸 상하기",
  },
  정관: {
    theme: "자리의 10년",
    body: "승진·명예·결혼, 세상이 너를 인정한다냥.",
    up: "승진·명예·결혼, 세상이 너를 인정하는 10년이다냥.",
    down: "자리는 있는데 무겁다냥. 책임에 눌리는 10년이다냥.",
    do: "조직 안에서 이름 걸기",
    dont: "규칙 깨기",
  },
  편인: {
    theme: "전환의 10년",
    body: "방향이 바뀐다냥. 공부·전문 분야로 깊어지고, 사람은 줄고 생각은 깊어진다냥.",
    up: "전문 분야로 깊어지는 10년이다냥. 남들이 못 하는 걸 하게 된다냥.",
    down: "생각만 많고 실행이 막힌다냥. 사람이 줄고 외로워지는 10년이다냥.",
    do: "새 분야 배우기",
    dont: "혼자 고립되기",
  },
  정인: {
    theme: "도움의 10년",
    body: "공부·자격·문서 운이 좋다냥. 윗사람이 끌어 준다냥.",
    up: "윗사람이 끌어 주고 문서 운이 트이는 10년이다냥.",
    down: "기대기만 하다 기회를 놓친다냥. 게을러지기 쉬운 10년이다냥.",
    do: "자격·계약 챙기기",
    dont: "기대기만 하기",
  },
};

/** The 10-year theme read against the chart: the same 십성 helps one chart and hurts another. */
const godText = (d: Daeun) => (d.score >= 70 ? GOD_DAEUN[d.god].up : d.score < 52 ? GOD_DAEUN[d.god].down : GOD_DAEUN[d.god].body);

function stage(age: number): string {
  if (age < 10) return "어린 시절 대운이라, 집안 분위기와 부모 운으로 나타났다냥.";
  if (age < 20) return "학창 시절 대운이라, 공부와 친구 관계로 나타났다냥.";
  if (age < 30) return "사회 첫발 대운이라, 진로와 연애로 나타난다냥.";
  if (age < 40) return "자리 잡는 대운이라, 일·돈·결혼이 이 기운을 따라간다냥.";
  if (age < 50) return "판을 키우거나 지키는 대운이라, 재물과 가정이 이 기운을 따라간다냥.";
  if (age < 60) return "거두는 대운이라, 쌓은 것의 결과가 이 기운으로 나온다냥.";
  return "건강과 마무리의 대운이라, 몸과 마음의 평안이 주제다냥.";
}

function branchNote(c: Chart, d: Daeun): string | null {
  const rel = branchRelation(c.dayBranch, d.branch);
  if (rel === "clash") return "일지와 충(沖)이 들어 집·배우자·몸에 변동이 크다냥.";
  if (rel === "harmony") return "일지와 합(合)이 들어 사람과 자리가 붙는다냥.";
  return null;
}

const SPANS: Record<string, [number, number, string]> = {
  teen: [10, 19, "10대"],
  early20: [20, 24, "20대 초반"],
  late20: [25, 29, "20대 후반"],
  "30s": [30, 39, "30대"],
  "40s": [40, 59, "40대 이후"],
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
  const future = c.daeun.filter((d) => d.age > c.age);
  if (ans === "none")
    return `크게 힘든 적이 없다고 했지. 지나온 대운이 고르게 받쳐 줬다냥. 대신 ${(() => {
      const low = [...future].sort((x, y) => x.score - y.score)[0];
      return low ? `${range(low)} ${low.ganji} 대운은 단단히 준비해라냥.` : "앞으로도 크게 꺾이진 않는다냥.";
    })()}`;
  if (ans === "yet") {
    const peak = [...future].sort((x, y) => y.score - x.score)[0];
    return peak ? `제일 좋은 때가 아직이라고 했지. 맞다냥. 네 황금기는 아직 안 왔다냥. 언제인지는 감정서에 적었다냥.` : null;
  }
  const span = SPANS[ans];
  if (!span) return null;
  const d = daeunIn(c, span[0], span[1]);
  if (!d) return null;
  const sorted = [...lived].sort((x, y) => x.score - y.score);
  const rank = sorted.findIndex((x) => x.age === d.age);
  if (kind === "hard") {
    return rank <= 1 && d.score < 62
      ? `${josa(span[2], "이라고/라고")} 했지. 맞다냥. 그때가 ${range(d)} ${d.ganji} 대운, 지나온 대운 중 바닥이었다냥. ${GOD_SHORT[d.god]}의 기운이 너를 시험했다냥.`
      : `${josa(span[2], "이라고/라고")} 했지. 대운으로 보면 그때(${d.ganji})는 바닥이 아니었다냥. 그때 힘든 건 운이 아니라 사람 때문이었다냥. 맞지?`;
  }
  const top = [...lived].sort((x, y) => y.score - x.score);
  const trank = top.findIndex((x) => x.age === d.age);
  return trank <= 1 && d.score >= 60
    ? `${josa(span[2], "이라고/라고")} 했지. 맞다냥. ${range(d)} ${d.ganji} 대운, ${GOD_SHORT[d.god]}의 기운이 제대로 받쳐 준 때다냥.`
    : `${josa(span[2], "이라고/라고")} 했지. 대운보다 네 노력이 더 컸던 때다냥. 진짜 대운의 꽃은 따로 있다냥.`;
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
  job: { label: "이직·창업", gods: ["식신", "편재", "정관", "상관"] },
  home: { label: "이사·집", gods: ["정인", "편재", "정재", "편인"] },
  love: { label: "결혼·관계 정리", gods: ["정관", "정재", "식신", "편관"] },
  money: { label: "투자·큰돈", gods: ["정재", "편재", "식신"] },
  study: { label: "공부·자격·유학", gods: ["정인", "편인", "정관"] },
};

const WANT: Record<string, { label: string; gods: TenGod[] }> = {
  money: { label: "돈", gods: ["편재", "정재", "식신"] },
  honor: { label: "인정·명예", gods: ["정관", "편관", "정인"] },
  family: { label: "가정·안정", gods: ["정재", "정관", "정인"] },
  free: { label: "자유", gods: ["상관", "편재", "비견", "식신"] },
  health: { label: "건강", gods: ["식신", "정인", "비견"] },
  love: { label: "사랑", gods: ["정관", "정재", "식신"] },
};

const COPE: Record<string, string> = {
  endure: "운 나쁠 때 버티는 사람이라고 했지. 버티는 건 좋은데, 시험의 대운엔 쉬는 것도 실력이다냥.",
  change: "판을 바꾸는 사람이라고 했지. 그 촉은 전환의 대운에 맞춰 쓰면 대박, 엉뚱한 때 쓰면 손해다냥.",
  lean: "사람한테 기댄다고 했지. 도움의 대운엔 그게 정답이다냥. 대신 기댈 사람은 골라라냥.",
  fortune: "점 보러 간다고 했지 😼 운의 흐름을 아는 사람이 덜 다친다냥. 이 감정서가 그 지도다냥.",
  hide: "숨어서 쉰다고 했지. 대운이 낮을 땐 그게 오히려 지혜다냥. 대신 기회의 대운엔 숨지 마라냥.",
};

export function daeunReading(input: QuestionnaireInput, c: Chart): { teaser: FortuneTeaser; report: FullReport } {
  const name = input.me.name;
  const a = (id: string) => input.self[id];
  const stem = STEM[c.dayStem];
  const cur = c.daeun[c.currentDaeun] ?? null;
  const next = c.daeun[c.currentDaeun + 1] ?? c.daeun[0];
  // Only the 대운 still ahead within a working life count for 황금기 / 조심할 때.
  const future = c.daeun.filter((d) => d.age > c.age && d.age <= 70);
  const pool = future.length ? future : ([cur ?? c.daeun[0]] as Daeun[]);
  const bestAhead = [...pool].sort((x, y) => y.score - x.score)[0];
  const nowIsPeak = Boolean(cur && cur.score >= bestAhead.score);
  const peak = nowIsPeak ? cur! : bestAhead;
  const lowAhead = [...pool].filter((d) => d !== peak).sort((x, y) => x.score - y.score)[0] ?? pool[0];
  const trough = cur && cur.score < 55 && cur.score < lowAhead.score ? cur : lowAhead;
  const seun = yearlyLuck(c, 3);

  const describe = (d: Daeun) => lines(`${range(d)} ${d.ganji}(${d.hanja}) 대운 — ${GOD_DAEUN[d.god].theme}. ${godText(d)}`, stage(d.age), branchNote(c, d));

  // ── 유료 감정서 ──
  const nowSec = cur
    ? sec(
        "지금 대운 상세",
        `${range(cur)} ${cur.ganji} 대운, ${daNyang(scoreWord(cur.score))}`,
        lines(
          describe(cur),
          a("du3") && RECENT[a("du3")]
            ? `${RECENT[a("du3")]} ${cur.score >= 66 ? "대운은 밀어 주는 중이다냥. 흐름을 믿어라냥." : "대운이 아직 무겁다냥. 지금은 크게 벌이기보다 다지는 때다냥."}`
            : null,
          `이 대운은 ${cur.age + 9}세까지, 올해 포함 ${Math.max(1, cur.age + 10 - c.age)}년 남았다냥.`,
        ),
        [`✅ 할 것: ${GOD_DAEUN[cur.god].do}`, `🚫 하지 말 것: ${GOD_DAEUN[cur.god].dont}`, `📊 대운 점수 ${cur.score}점 · ${scoreWord(cur.score)}`],
      )
    : sec("첫 대운 전", "아직 첫 대운이 오기 전이다냥", `${c.daeun[0].age}세에 첫 대운이 든다냥.`, []);

  const nextSec = sec(
    "다음 대운과 교운기",
    `${next.age}세, 운이 갈아탄다냥`,
    lines(
      describe(next),
      `대운이 바뀌기 전후 1~2년(${next.age - 1}~${next.age}세)은 교운기(交運期)다냥. 이사·이직·이별이 이때 몰린다냥.`,
      cur && next.score > cur.score + 8
        ? "다음 대운이 지금보다 확 좋다냥. 지금 버티는 게 다 이유가 있다냥."
        : cur && next.score < cur.score - 8
          ? "다음 대운은 지금보다 무겁다냥. 지금 좋은 운에 벌어 둔 게 다음 10년을 지킨다냥."
          : "다음 대운도 지금과 비슷한 무게다냥. 방향만 바뀐다냥.",
    ),
    [`🔄 교운기: ${next.age - 1}~${next.age}세`, `✅ 다음 10년에 할 것: ${GOD_DAEUN[next.god].do}`],
  );

  const runnerUp = future.filter((d) => d !== peak).sort((x, y) => y.score - x.score)[0];
  // The best 대운 already lived, and a late bloom after 70 (outside the 황금기 pool).
  const bestPast = c.daeun.filter((d) => d.age + 9 < c.age).sort((x, y) => y.score - x.score)[0];
  const lateBloom = c.daeun.find((d) => d.age > 70 && d.age <= 80 && d.score >= 70);
  const lateLine = lateBloom ? `말년 ${range(lateBloom)} ${lateBloom.ganji} 대운에 한 번 더 핀다냥. 늦복이 있는 팔자다냥.` : null;
  const peakSec = nowIsPeak
    ? sec(
        "인생 황금기",
        cur!.score >= 70 ? "바로 지금이 황금기다냥" : "남은 대운 중엔 지금이 제일 낫다냥",
        lines(
          cur!.score >= 70 ? `지금 ${range(cur!)} 대운이 앞으로 남은 대운 중 제일 세다냥.` : `지금 ${range(cur!)} 대운이 앞으로 남은 대운 중 제일 낫다냥.`,
          bestPast && bestPast.score > cur!.score + 5 ? `큰 파도는 ${range(bestPast)} ${bestPast.ganji} 대운에 한 번 지나갔다냥. 그때 잡은 게 지금의 밑천이다냥.` : null,
          cur!.score >= 70 ? "이 10년에 거둔 게 평생 간다냥. 망설이면 지나간다냥." : "큰 한 방보다 꾸준히 쌓는 팔자다냥. 지금 쌓은 게 뒷날을 지킨다냥.",
          lateLine,
        ),
        [
          `📊 지금 대운 ${cur!.score}점 · ${scoreWord(cur!.score)}`,
          `🎯 지금 잡을 것: ${GOD_DAEUN[cur!.god].do}`,
          ...(runnerUp ? [`${runnerUp.score >= 65 ? "🌸 두 번째 꽃" : "➡️ 그다음"}: ${range(runnerUp)} ${runnerUp.ganji} (${runnerUp.score}점)`] : []),
        ],
      )
    : sec("인생 황금기", `${range(peak)}, 네 인생 꽃이 핀다냥`, lines(describe(peak), `${peak.age}세가 오기 전에 씨를 뿌려 둬라냥. 그 대운에 거둔다냥.`, lateLine), [
        `📊 황금기 점수 ${peak.score}점 · ${scoreWord(peak.score)}`,
        `🎯 그때 잡을 것: ${GOD_DAEUN[peak.god].do}`,
      ]);

  const mild = trough.score >= 62;
  const troughSec = sec(
    "조심해야 할 대운",
    mild ? "크게 꺾이는 대운은 없다냥" : `${range(trough)}는 몸을 낮춰라냥`,
    lines(
      mild ? `앞으로 크게 꺾이는 대운은 없다냥. 그나마 힘을 아낄 때는 ${range(trough)}다냥.` : null,
      describe(trough),
      trough === cur ? "지금이 그 시기다냥. 크게 벌이지 말고 지키면 지나간다냥." : "이 대운이 오기 전에 빚·보증·무리한 계약을 정리해 둬라냥.",
    ),
    [`🚫 그때 피할 것: ${GOD_DAEUN[trough.god].dont}`, `🧿 버티는 법: ${LUCK[c.yongsin].act}`],
  );

  const allSec = sec(
    "대운 전체 흐름",
    "10년마다 바뀌는 네 인생 물줄기다냥",
    lines(
      `대운수 ${c.daeunSu}, ${c.forward ? "순행" : "역행"}이다냥. ${c.daeunSu}세부터 10년마다 운의 옷이 바뀐다냥.`,
      `용신은 ${daNyang(elementLabel(c.yongsin))}. 이 기운이 들어오는 대운이 네 전성기다냥.`,
    ),
    c.daeun.slice(0, 8).map((d) => `${d === cur ? "▶" : "·"} ${range(d)} ${d.ganji} · ${d.god} · ${d.score}점 · ${GOD_DAEUN[d.god].theme}`),
  );

  const dec = DECISION[a("du4") ?? ""];
  const decYear = dec ? [...seun].sort((x, y) => (dec.gods.includes(y.god) ? 20 : 0) + y.score - ((dec.gods.includes(x.god) ? 20 : 0) + x.score))[0] : null;
  const seunSec = sec(
    `앞으로 3년 (${seun[0].year}~${seun[2].year})`,
    dec && decYear ? `${josa(dec.label, "은/는")} ${decYear.year}년이다냥` : `${seun[1].year}년이 갈림길이다냥`,
    lines(
      ...seun.map((y) => `${y.year} ${y.ganji}년 (${y.god}): ${yearText(y)}`),
      dec && decYear
        ? `앞에 놓인 ${dec.label}, ${decYear.year}년에 하면 운이 받쳐 준다냥.`
        : a("du4") === "none"
          ? "지금은 큰 결정이 없다고 했지. 곧 생긴다냥. 그때 이 표를 다시 봐라냥."
          : null,
    ),
    seun.map((y) => `📊 ${y.year}년 ${y.score}점 · ${scoreWord(y.score)}`),
  );

  const want = WANT[a("du5") ?? ""];
  const wantHit = want ? [cur, ...future].find((d) => want.gods.includes(d.god)) : null;
  const useSec = sec(
    "대운 활용법",
    `${josa(stem.name, "은/는")} ${josa(elementLabel(c.yongsin), "을/를")} 타야 산다냥`,
    lines(
      want
        ? wantHit
          ? `앞으로 ${josa(want.label, "을/를")} 원한다고 했지. ${range(wantHit)} ${wantHit.ganji} 대운이 그걸 준다냥.`
          : `앞으로 ${josa(want.label, "을/를")} 원한다고 했지. 대운이 대놓고 주는 운은 아니다냥. 그래서 네가 먼저 움직여야 한다냥.`
        : null,
      COPE[a("du6") ?? ""] ?? null,
    ),
    [`🎨 색: ${LUCK[c.yongsin].color}`, `🧭 방향: ${LUCK[c.yongsin].direction}`, `✅ 습관: ${LUCK[c.yongsin].act}`],
  );

  const sections = [
    { id: "now", icon: "▶️", section: nowSec },
    { id: "next", icon: "🔄", section: nextSec },
    { id: "peak", icon: "🌸", section: peakSec },
    { id: "trough", icon: "⛈️", section: troughSec },
    { id: "all", icon: "🌊", section: allSec },
    { id: "seun", icon: "📅", section: seunSec },
    { id: "use", icon: "🧿", section: useSec },
  ];
  const report: FullReport = {
    subScores: c.daeun.slice(0, 7).map((d) => ({ label: `${d.age}세 ${d.ganji}`, score: d.score })),
    sections,
    luck: null,
  };

  // ── 무료 맛보기 ──
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
      say: "네 인생 그래프다냥. 막대가 높을수록 운이 센 10년이다냥.",
      mood: "wow",
      card: {
        kind: "timeline",
        title: `${name}의 대운`,
        items: c.daeun.slice(0, 8).map((d) => ({
          age: range(d),
          ganji: d.ganji,
          hanja: d.hanja,
          score: d.score,
          current: d === cur,
          god: d.god,
        })),
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
      next: "지금은?",
    });
  if (cur) {
    beats.push({
      say: `지금 너는 ${range(cur)} ${cur.ganji} 대운 안에 있다냥.`,
      mood: "wow",
      card: {
        kind: "score",
        label: "지금 대운",
        score: cur.score,
        headline: `${GOD_DAEUN[cur.god].theme} · ${scoreWord(cur.score)}`,
        body: godText(cur),
      },
      next: "앞으로는?",
    });
  }
  const teaser: FortuneTeaser = {
    mode: "daeun",
    title: `${name}의 대운 감정서`,
    saju: c.saju.summary,
    beats,
    paywall: `…여기서부터가 진짜다냥. 네 인생 황금기가 몇 살인지, 조심할 10년이 언제인지, ${next.age}세 교운기에 뭘 해야 하는지 다 적어 뒀다냥. 듣고 갈래? 😼`,
    locked: sections.map((s) => locked(s.id, s.icon, s.section)),
  };
  return { teaser, report };
}

export const GOD_GROUP = GROUP_OF;
