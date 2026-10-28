import "server-only";
import type { ElementKey, FortuneBeat, FortuneTeaser, FullReport, QuestionnaireInput } from "@/models/types";
import { ANIMALS, SAMHAP, branchRelation } from "../saju";
import {
  type Chart,
  type TenGod,
  type TenGroup,
  GROUP_OF,
  branchTenGod,
  dohwaOf,
  elementLabel,
  groupElement,
  hongyeomOf,
  monthlyPillars,
  samhapWith,
  tenGod,
  thisYear,
  yearlyLuck,
} from "./chart";
import { LUCK, basisCard, daNyang, josa, lines, locked, sec } from "./common";

// ───────────── 미래 배우자운 ─────────────

/** 일지(배우자 자리) 12지: 배우자의 성품. */
const PALACE: { trait: string; keys: [string, string] }[] = [
  {
    trait: "영리하고 눈치 빠른 사람이다냥. 생활력이 강하고, 밤에 더 살아나는 사람이다냥.",
    keys: ["눈치 백단", "생활력"],
  },
  {
    trait: "묵묵하고 성실한 사람이다냥. 말은 적어도 약속은 지킨다냥.",
    keys: ["성실함", "한결같음"],
  },
  {
    trait: "추진력 있고 자존심 센 사람이다냥. 밖에서 인정받는 사람이다냥.",
    keys: ["추진력", "자존심"],
  },
  {
    trait: "부드럽고 다정한 사람이다냥. 감각이 좋고 꾸밀 줄 안다냥.",
    keys: ["다정함", "감각"],
  },
  {
    trait: "그릇이 크고 욕심 있는 사람이다냥. 야망은 큰데 속은 여리다냥.",
    keys: ["큰 그릇", "야망"],
  },
  {
    trait: "똑똑하고 계산 빠른 사람이다냥. 겉은 차분한데 속은 뜨겁다냥.",
    keys: ["두뇌", "속정"],
  },
  {
    trait: "밝고 활동적인 사람이다냥. 같이 있으면 심심할 틈이 없다냥.",
    keys: ["밝음", "활동력"],
  },
  {
    trait: "온순하고 가정적인 사람이다냥. 고집은 조용히 세다냥.",
    keys: ["가정적", "온순함"],
  },
  {
    trait: "재주 많고 말솜씨 좋은 사람이다냥. 변화를 즐긴다냥.",
    keys: ["재주꾼", "말솜씨"],
  },
  {
    trait: "깔끔하고 기준 높은 사람이다냥. 외모와 매너를 챙긴다냥.",
    keys: ["깔끔함", "매너"],
  },
  {
    trait: "의리 있고 책임감 강한 사람이다냥. 내 사람한텐 끝까지 간다냥.",
    keys: ["의리", "책임감"],
  },
  {
    trait: "마음 넓고 정 많은 사람이다냥. 자유로운데 은근히 낭만파다냥.",
    keys: ["넓은 마음", "낭만"],
  },
];

/** 배우자 별의 오행: 외모·분위기와 일. */
const LOOK: Record<ElementKey, { look: string; key: string; job: string }> = {
  wood: {
    look: "키가 크거나 늘씬하고 선이 곧다냥. 눈매가 맑다냥.",
    key: "늘씬한 선",
    job: "교육·기획·출판·의료·디자인",
  },
  fire: {
    look: "표정이 밝고 눈빛이 반짝인다냥. 첫인상이 화사하다냥.",
    key: "밝은 눈빛",
    job: "방송·미디어·영업·마케팅·IT",
  },
  earth: {
    look: "체격이 듬직하고 인상이 편안하다냥. 믿음이 가는 얼굴이다냥.",
    key: "편안한 인상",
    job: "공무원·금융·부동산·건설·관리직",
  },
  metal: {
    look: "피부가 희고 이목구비가 또렷하다냥. 단정하고 깔끔하다냥.",
    key: "또렷한 이목구비",
    job: "법·의료·금융·엔지니어·IT",
  },
  water: {
    look: "눈매가 깊고 분위기가 부드럽다냥. 은근한 매력이 있다냥.",
    key: "깊은 눈매",
    job: "무역·유통·연구·해외·서비스",
  },
};

/** 일지에 앉은 십성: 결혼 생활의 결. */
const MARRIED: Record<TenGod, string> = {
  비견: "배우자가 친구 같은 결혼이다냥. 편한 대신 주도권 다툼이 있다냥.",
  겁재: "서로 지기 싫어하는 결혼이다냥. 돈 관리는 한 사람이 맡아라냥.",
  식신: "같이 먹고 노는 게 행복인 결혼이다냥. 편하게 오래 간다냥.",
  상관: "말 한마디가 결혼을 좌우한다냥. 잔소리만 줄이면 재밌게 산다냥.",
  편재: "함께 일을 벌이면 돈이 되는 결혼이다냥. 배우자가 활동적이다냥.",
  정재: "알뜰살뜰 안정된 결혼이다냥. 살림이 차곡차곡 쌓인다냥.",
  편관: "강한 사람과 하는 결혼이다냥. 처음엔 끌리고, 살면서 부딪친다냥.",
  정관: "반듯한 사람과 하는 결혼이다냥. 남들이 부러워하는 결혼이다냥.",
  편인: "서로 혼자만의 시간이 필요한 결혼이다냥. 그걸 지켜 주면 오래 간다냥.",
  정인: "배우자가 너를 챙겨 주는 결혼이다냥. 기댈 수 있는 사람이다냥.",
};

const SEASON_OF = (branch: number) => (["겨울", "겨울", "봄", "봄", "봄", "여름", "여름", "여름", "가을", "가을", "가을", "겨울"] as const)[branch];

const ATTRACT: Record<string, { label: string; palaces: number[] }> = {
  flashy: { label: "화려한 사람", palaces: [2, 6, 9, 4] },
  warm: { label: "다정한 사람", palaces: [3, 7, 11, 1] },
  able: { label: "능력 있는 사람", palaces: [5, 0, 2, 9] },
  fun: { label: "재밌고 자유로운 사람", palaces: [6, 8, 11, 0] },
  steady: { label: "듬직한 사람", palaces: [1, 10, 4, 7] },
  mystic: { label: "속을 알 수 없는 사람", palaces: [5, 11, 0, 9] },
};

const PARENTS: Record<string, string> = {
  good: "좋은 결혼을 보고 자랐지. 그래서 기준이 높고, 그래서 늦어진다냥. 기준을 하나만 내려놓으면 빨라진다냥.",
  fight: "시끄러운 집을 보고 자랐지. 그래서 싸움 없는 사람을 고르는데, 그게 무심한 사람일 수 있다냥. 조용한 것과 차가운 건 다르다냥.",
  dry: "정 없는 결혼을 봤지. 너는 표현하는 사람을 만나야 산다냥. 무뚝뚝한 사람한테 끌려도 거기서 멈춰라냥.",
  apart: "그래서 결혼이 무섭지? 부모의 길을 그대로 가는 팔자는 아니다냥. 네 배우자 자리는 네 거다냥.",
  gone: "일찍 철이 들었지. 배우자한테 부모 같은 든든함을 찾는다냥. 기대는 건 괜찮다, 맡기지만 마라냥.",
};

const STATUS_LINE: Record<string, string> = {
  after: "이별 후라고 했지. 끝난 그 사람은 배우자 자리의 사람이 아니었다냥. 그래서 끝난 거다냥.",
  remarry: "한 번 다녀왔다고 했지. 배우자 자리는 아직 비어 있다냥. 두 번째 인연이 네 진짜 자리에 앉는다냥.",
  single: "지금 혼자라고 했지. 비어 있는 게 아니라, 자리를 비워 두고 기다리는 중이다냥.",
};

const PATTERN: Record<string, string> = {
  me: "늘 더 좋아했다고 했지. 배우자는 반대로 너를 더 좋아하는 사람이 온다냥. 그 사람을 '설렘이 없다'고 밀어내지 마라냥.",
  them: "받는 쪽이었다고 했지. 결혼은 받기만 하면 상대가 지친다냥. 받은 만큼 표현해라냥.",
  even: "비슷하게 좋아했다고 했지. 균형 감각이 있는 사람이다냥. 결혼도 그렇게 간다냥.",
  flip: "시작은 상대가, 끝엔 네가 더… 그 패턴은 배우자 앞에선 끊긴다냥. 네가 처음부터 마음을 열면.",
  few: "경험이 적다고 했지. 대신 첫 진짜 인연이 배우자가 될 확률이 높다냥.",
};

const CANT_STAND: Record<string, (c: Chart) => string> = {
  money: (c) =>
    c.gods.includes("겁재") || c.groups.비겁 >= 2.5
      ? "돈 문제를 못 참는다고 했지. 근데 네 사주에 겁재가 있어서, 돈 문제는 상대보다 네 쪽에서 먼저 생길 수 있다냥. 결혼 전 돈 얘기는 꼭 숫자로 해라냥."
      : "돈 문제를 못 참는다고 했지. 결혼 전에 서로의 빚·씀씀이를 숫자로 확인해라냥. 그게 정이다냥.",
  lie: () => "거짓말을 못 참는다고 했지. 한 번 데어 본 사람이다냥. 연애 초반 작은 거짓말 하나가 보이면, 그게 그 사람의 전부다냥.",
  family: () => "집안 간섭을 못 참는다고 했지. 상견례 전에 '우리 둘이 먼저 정한다'는 약속부터 받아라냥.",
  vice: () => "술·도박·게임을 못 참는다고 했지. 연애할 때 '가끔'은 결혼하면 '매일'이 된다냥. 세 번 보이면 그건 습관이다냥.",
  cold: () => "무심함을 못 참는다고 했지. 연애 때 표현이 적은 사람은 결혼하면 더 적어진다냥. 처음부터 표현하는 사람을 골라라냥.",
  obsess: () => "집착을 못 참는다고 했지. 연애 초반에 휴대폰 보자는 사람은, 결혼하면 통장도 본다냥.",
};

function spouseGroup(c: Chart): TenGroup {
  return c.gender === "male" ? "재성" : "관성";
}

/** 결혼 기운이 강한 해 (앞으로 12년). */
function marriageYears(c: Chart) {
  const sg = spouseGroup(c);
  const dohwa = [dohwaOf(c.dayBranch), dohwaOf(c.branches[0])];
  const hong = hongyeomOf(c.dayStem);
  return yearlyLuck(c, 12)
    .map((y) => {
      const age = y.year - c.birthYear + 1;
      const d = [...c.daeun].reverse().find((x) => age >= x.age);
      let s = 0;
      if (GROUP_OF[y.god] === sg) s += y.god === "정재" || y.god === "정관" ? 4 : 3;
      const br = branchRelation(c.dayBranch, y.branch);
      if (br === "harmony") s += 3;
      if (samhapWith(c.dayBranch, y.branch)) s += 2;
      if (br === "clash") s += 0.5;
      if (dohwa.includes(y.branch)) s += 1.5;
      if (y.branch === hong) s += 1;
      if (d && GROUP_OF[d.god] === sg) s += 1;
      // Sooner beats later when the pull is about the same.
      s -= (y.year - thisYear()) * 0.2;
      return { ...y, age, s };
    })
    .filter((y) => y.age >= 20 && y.age <= 85)
    .sort((a, b) => b.s - a.s || a.year - b.year);
}

/** The month of that year whose 월주 opens the 배우자 자리 most (합·삼합, 배우자 별 천간, 천간합). */
function seasonFor(c: Chart, year: number): string {
  const sg = spouseGroup(c);
  const scored = monthlyPillars(year)
    .filter((m) => m.year === year)
    .map((m) => ({
      ...m,
      s:
        (branchRelation(c.dayBranch, m.branch) === "harmony" ? 3 : 0) +
        (samhapWith(c.dayBranch, m.branch) ? 2 : 0) +
        (GROUP_OF[tenGod(c.dayStem, m.stem)] === sg ? 3 : 0) +
        (Math.abs(m.stem - c.dayStem) === 5 ? 2 : 0) -
        (branchRelation(c.dayBranch, m.branch) === "clash" ? 3 : 0),
    }));
  const pick = scored.sort((x, y) => y.s - x.s || x.month - y.month)[0];
  return `${SEASON_OF(pick.branch)}(${pick.month}월 무렵)`;
}

/** Where the chart says you meet. */
function meetPlace(c: Chart): { id: string; text: string } {
  const sg = spouseGroup(c);
  const monthHas = GROUP_OF[tenGod(c.dayStem, c.stems[1])] === sg || GROUP_OF[branchTenGod(c.dayStem, c.branches[1])] === sg;
  if (monthHas)
    return {
      id: "work",
      text: "배우자 별이 월주(사회 자리)에 있다냥. 일·직장에서 만난다냥.",
    };
  if (c.sinsal.yeokma)
    return {
      id: "chance",
      text: "역마살이 있다냥. 여행지·출장·이사 간 동네처럼 낯선 곳에서 만난다냥.",
    };
  if (c.sinsal.gwiin)
    return {
      id: "intro",
      text: "천을귀인이 있다냥. 믿는 사람이 데려오는 소개로 만난다냥.",
    };
  if (c.sinsal.dohwa)
    return {
      id: "hobby",
      text: "도화살이 있다냥. 모임·술자리·SNS처럼 사람이 모이는 데서 눈이 맞는다냥.",
    };
  if (c.groups.인성 >= 2.5)
    return {
      id: "school",
      text: "인성이 강하다냥. 배우는 곳 — 학원·스터디·학교에서 만난다냥.",
    };
  if (c.sinsal.hwagae)
    return {
      id: "hobby",
      text: "화개살이 있다냥. 취미·예술·종교 모임에서 만난다냥.",
    };
  return { id: "intro", text: "가까운 사람 소개가 제일 확실한 길이다냥." };
}

const PLACE_LABEL: Record<string, string> = {
  work: "일·직장",
  intro: "지인 소개",
  hobby: "취미·모임",
  app: "앱·SNS",
  chance: "여행지·우연",
  school: "학교·공부하는 곳",
};

/** Animals whose branch sits well with my 배우자 자리 (육합·삼합). */
function goodSpouseAnimals(c: Chart): string[] {
  const set = new Set<number>();
  for (let b = 0; b < 12; b++) if (b !== c.dayBranch && branchRelation(c.dayBranch, b) === "harmony") set.add(b);
  SAMHAP.find((g) => g.includes(c.dayBranch))?.forEach((b) => b !== c.dayBranch && set.add(b));
  return [...set].map((b) => ANIMALS[b]);
}

export function spouseReading(input: QuestionnaireInput, c: Chart): { teaser: FortuneTeaser; report: FullReport } {
  const name = input.me.name;
  const a = (id: string) => (input.self[id] && input.self[id] !== "?" ? input.self[id] : undefined);
  const sg = spouseGroup(c);
  const sEl = groupElement(c.dm, sg);
  const palace = PALACE[c.dayBranch];
  const look = LOOK[sEl];
  const count = c.gods.filter((g) => GROUP_OF[g] === sg).length;
  const palaceGod = branchTenGod(c.dayStem, c.dayBranch);
  const years = marriageYears(c).slice(0, 3);
  const top = years[0];
  const place = meetPlace(c);
  const starWord = c.gender === "male" ? "재성(財星)" : "관성(官星)";
  const now = thisYear();

  const attract = a("sp3") ? ATTRACT[a("sp3")!] : null;
  const attractLine = attract
    ? attract.palaces.includes(c.dayBranch)
      ? `${attract.label}한테 끌린다고 했지. 배우자 자리랑 맞다냥. 끌리는 사람이랑 결혼하는 팔자다냥.`
      : `끌리는 건 ${attract.label}인데, 결혼은 ${palace.keys[0]}·${palace.keys[1]} 있는 사람이랑 한다냥. 그래서 끌린 사람들과는 끝까지 못 갔던 거다냥.`
    : null;

  // ── 유료 감정서 ──
  const traitSec = sec(
    "배우자의 성격",
    `${josa(palace.keys[0], "과/와")} ${palace.keys[1]}의 사람이다냥`,
    lines(`배우자 자리(일지)에 ${josa(ANIMALS[c.dayBranch], "이/가")} 앉아 있다냥.`, palace.trait, attractLine, STATUS_LINE[a("sp1") ?? ""] ?? null),
    [`🔑 키워드: ${palace.keys.join(" · ")}`],
  );
  const lookSec = sec("외모와 분위기", `${look.key}의 사람이다냥`, lines(`배우자 별 ${starWord}의 기운이 ${daNyang(elementLabel(sEl))}.`, look.look), [
    `👀 첫눈에 보이는 것: ${look.key}`,
  ]);
  const jobSec = sec(
    "직업과 능력",
    `${look.job} 쪽 기운이다냥`,
    lines(
      `배우자 별의 기운으로 보면 ${look.job} 쪽 일을 하는 사람이다냥.`,
      count >= 3
        ? "능력 있는 사람이 여럿 다가오는 팔자다냥. 고르는 눈이 곧 복이다냥."
        : count === 0
          ? "원국에 배우자 별이 없어서, 늦게 만나도 운에서 들어올 때 확 만난다냥."
          : "배우자 별이 제자리에 있다냥. 억지로 찾지 않아도 들어온다냥.",
    ),
    [`💼 직업 기운: ${look.job}`],
  );

  const wantLine = (() => {
    if (!top) return null;
    const diff = top.year - now;
    switch (a("sp2")) {
      case "asap":
        return diff <= 1
          ? `빨리 하고 싶다고 했지. 운도 같은 말을 한다냥. ${top.year}년이다냥.`
          : `빨리 하고 싶다고 했지. 근데 운은 ${top.year}년을 가리킨다냥. 서두르면 다른 사람이랑 한다냥.`;
      case "soon":
        return diff <= 3 ? `2~3년 안이라고 했지. 맞다냥. ${top.year}년이 딱 그 안이다냥.` : `2~3년 안을 원하는데, 진짜 인연 기운은 ${top.year}년에 제일 세다냥.`;
      case "later":
        return diff >= 2
          ? `자리 잡고 나서라고 했지. 맞다냥. ${top.year}년(${top.age}세)이 그때다냥. 그 전에 네 자리부터 다져라냥.`
          : `천천히 하고 싶다고 했지. 근데 운은 ${top.year}년, 생각보다 빨리 온다냥. 준비는 지금부터다냥.`;
      case "flow":
        return `인연 오면 그때라고 했지. 그 인연, ${top.year}년에 온다냥.`;
      case "no":
        return `생각 없다고 했지. 그래도 ${top.year}년엔 생각이 바뀐다냥 😼`;
      default:
        return null;
    }
  })();
  const timingSec = sec(
    "만나는 시기",
    top ? `${top.year}년(${top.age}세)이 제일 세다냥` : "운에서 들어올 때를 잡아라냥",
    lines(
      wantLine,
      "결혼 기운은 배우자 별이 들어오는 해, 배우자 자리와 합이 드는 해에 세진다냥.",
      top
        ? `${top.year}년은 ${top.ganji}년이다냥. ${GROUP_OF[top.god] === sg ? "배우자 별이 직접 들어오는 해다냥." : "배우자 자리와 합이 드는 해다냥."} 계절로는 ${seasonFor(c, top.year)}이 문이 열린다냥.`
        : null,
    ),
    years.map((y, i) => `${["🥇", "🥈", "🥉"][i]} ${y.year}년(${y.age}세) ${y.ganji}${i === 0 ? ` · ${seasonFor(c, y.year)}` : ""}`),
  );

  const placeAns = a("sp7");
  const placeSec = sec(
    "만나는 곳",
    `${PLACE_LABEL[place.id]}에서 온다냥`,
    lines(
      place.text,
      placeAns
        ? placeAns === place.id
          ? `너도 ${josa(PLACE_LABEL[placeAns], "이라고/라고")} 했지. 감이 정확하다냥.`
          : `너는 ${josa(PLACE_LABEL[placeAns], "이라고/라고")} 했지만, 사주는 ${josa(PLACE_LABEL[place.id], "을/를")} 가리킨다냥.`
        : null,
    ),
    [`📍 인연이 오는 방향: ${LUCK[sEl].direction}`, `🧿 그날 입을 색: ${LUCK[sEl].color}`],
  );

  const marriedSec = sec(
    "결혼 생활",
    `일지 ${palaceGod}의 결혼이다냥`,
    lines(
      MARRIED[palaceGod],
      GROUP_OF[palaceGod] === sg ? "배우자 자리에 배우자 별이 앉은 사주다냥. 부부 금슬이 좋은 자리다냥." : null,
      a("sp1") === "remarry" ? "두 번째 결혼은 첫 결혼과 다른 결의 사람이 맞다냥. 같은 사람을 또 고르지 마라냥." : (PARENTS[a("sp6") ?? ""] ?? null),
    ),
    [`🐾 잘 맞는 띠: ${goodSpouseAnimals(c).join("띠 · ")}띠`, `⚡ 부딪치는 띠: ${ANIMALS[(c.dayBranch + 6) % 12]}띠`],
  );

  const cautionSec = sec(
    "결혼 전 조심할 것",
    "이것만 피하면 좋은 결혼이다냥",
    lines(
      CANT_STAND[a("sp4") ?? ""]?.(c) ?? null,
      PATTERN[a("sp5") ?? ""] ?? null,
      c.sinsal.dohwa ? "도화살이 있어서 결혼 후에도 눈길이 온다냥. 선을 먼저 그어 두면 문제없다냥." : null,
    ),
    [],
  );

  const status = a("sp1");
  const nowSec =
    status === "dating" || status === "talk" || status === "some"
      ? sec("지금 그 사람이 배우자일까", "세 가지로 확인해라냥", lines("지금 만나는 사람이 배우자인지, 사주로 확인하는 법이다냥."), [
          `🐾 그 사람 띠가 ${goodSpouseAnimals(c).join("·")} 중 하나면 배우자 자리와 맞는다냥`,
          `👀 ${palace.keys[0]}·${josa(palace.keys[1], "이/가")} 보이면 배우자 자리의 사람이다냥`,
          top ? `📅 ${top.year}년에 관계가 한 단계 넘어가면 그 사람이다냥` : "📅 인연 해에 관계가 깊어지면 그 사람이다냥",
        ])
      : null;

  const sections = [
    { id: "trait", icon: "💍", section: traitSec },
    { id: "look", icon: "👀", section: lookSec },
    { id: "job", icon: "💼", section: jobSec },
    { id: "timing", icon: "📅", section: timingSec },
    { id: "place", icon: "📍", section: placeSec },
    { id: "married", icon: "🏡", section: marriedSec },
    { id: "caution", icon: "⚠️", section: cautionSec },
    ...(nowSec ? [{ id: "now", icon: "🔍", section: nowSec }] : []),
  ];
  const report: FullReport = { subScores: [], sections, luck: null };

  // ── 무료 맛보기 ──
  const hook = attractLine ?? PARENTS[a("sp6") ?? ""] ?? MARRIED[palaceGod];
  const beats: FortuneBeat[] = [
    {
      say: `${name}… 배우자는 사주에 이미 앉아 있다냥. 원국부터 본다냥.`,
      mood: "smug",
      card: { kind: "chart" },
      next: "감정 근거는?",
    },
    {
      say: "감정 근거다냥. 배우자 자리와 배우자 별을 표시해 뒀다냥.",
      mood: "talk",
      card: basisCard(c, [
        ["배우자 자리", `일지 ${ANIMALS[c.dayBranch]} · ${palaceGod}`],
        ["배우자 별", `${starWord} ${count === 0 ? "원국에 없음" : `${count}개`}`],
      ]),
      next: "어떤 사람이야?",
    },
    {
      say: "네 배우자, 이런 사람이다냥.",
      mood: "wow",
      card: {
        kind: "keywords",
        title: "배우자 키워드",
        items: [palace.keys[0], palace.keys[1], look.key],
        body: palace.trait,
      },
      next: "소름…",
    },
    {
      say: a("sp3") ? "늘 끌린 사람 얘기, 괜히 물은 거 아니다냥." : "결혼 얘기 하나 하자냥.",
      mood: "smug",
      card: { kind: "text", icon: "🔗", title: "네 인연의 비밀", body: hook },
      next: "언제 만나?",
    },
    {
      say: years.length >= 3 ? "앞으로 결혼 기운이 센 해가 세 번 들어온다냥." : "결혼 기운이 들어오는 해가 보인다냥.",
      mood: "wow",
      card: {
        kind: "text",
        icon: "📅",
        title: "만나는 시기",
        body: top
          ? `제일 센 해는 ${String(top.year).slice(0, 2)}○○년이다냥. 몇 월 무렵인지까지 보인다냥. 감정서에 적어 뒀다냥.`
          : "운에서 들어오는 해가 보인다냥. 감정서에 적어 뒀다냥.",
      },
      next: "몇 년인데?",
    },
  ];
  const teaser: FortuneTeaser = {
    mode: "spouse",
    title: `${name}의 배우자 감정서`,
    saju: c.saju.summary,
    beats,
    paywall: "…여기서부터가 진짜다냥. 배우자 얼굴과 직업, 만나는 해와 계절, 어디서 만나는지, 결혼 전에 피해야 할 것까지 다 적어 뒀다냥. 듣고 갈래? 😼",
    locked: sections.map((s) => locked(s.id, s.icon, s.section)),
  };
  return { teaser, report };
}
