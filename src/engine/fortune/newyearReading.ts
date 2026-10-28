import "server-only";
import { newYearOf } from "@/lib/config";
import type { FortuneBeat, FortuneTeaser, FullReport, QuestionnaireInput } from "@/models/types";
import { ANIMALS, branchRelation } from "../saju";
import {
  type Chart,
  type TenGod,
  type TenGroup,
  GROUP_OF,
  branchTenGod,
  dohwaOf,
  ganji,
  ganjiHanja,
  groupStars,
  gwiinOf,
  monthlyPillars,
  pillarScore,
  samhapWith,
  tenGod,
  yearPillar,
} from "./chart";
import { GOD_YEAR_SENIOR, LUCK, ORGANS, basisCard, josa, lines, locked, scoreWord, sec } from "./common";

// ───────────── 신년운세 ─────────────

/** The new year's 십성 (세운 천간) read area by area. */
const NY: Record<
  TenGod,
  {
    title: string;
    keys: [string, string, string];
    body: string;
    money: string;
    single: string;
    couple: string;
    work: string;
    study: string;
    health: string;
    advice: string;
  }
> = {
  비견: {
    title: "내 판을 새로 짜는 해",
    keys: ["독립", "자존심", "새 출발"],
    body: "내 힘으로 판을 짜는 해다냥. 누구 밑에 있기보다 내 이름을 걸고 싶어진다냥. 경쟁자도 같이 들어온다냥.",
    money: "버는 만큼 나눠 쓰게 되는 해다냥. 동업·보증·돈 빌려주기는 올해 금물이다냥.",
    single: "친구 같은 인연이 온다냥. 동호회·동창 모임처럼 '같은 편' 사이에서 시작된다냥.",
    couple: "둘 다 고집이 세지는 해다냥. 주도권 싸움만 피하면 동지처럼 단단해진다냥.",
    work: "독립·창업·프리랜서 생각이 커진다냥. 준비된 사람에겐 기회고, 아니면 상반기는 실력부터 쌓아라냥.",
    study: "혼자 파고드는 공부가 맞는 해다냥. 스터디보다 독학이다냥.",
    health: "근육·관절을 쓰는 운동이 운을 돋운다냥. 무리한 승부욕만 조심해라냥.",
    advice: "내 편을 만들되, 돈은 섞지 마라냥.",
  },
  겁재: {
    title: "지갑을 지키는 해",
    keys: ["경쟁", "지출", "승부"],
    body: "경쟁과 지출이 같이 오는 해다냥. 이기려는 마음이 커지는 만큼 돈과 사람이 새기 쉽다냥.",
    money: "목돈이 나갈 일이 생긴다냥. 남 따라 하는 투자는 반 토막 각오해라냥. 고정 지출부터 줄여라냥.",
    single: "경쟁자가 있는 인연이다냥. 놓치기 싫어 서두르면 오히려 멀어진다냥.",
    couple: "제3자가 끼어들기 쉬운 해다냥. 친구·동료 얘기로 싸우지 마라냥.",
    work: "승부가 붙는 해다냥. 이직 경쟁·평가에서 이기려면 실적을 숫자로 보여라냥.",
    study: "경쟁이 붙어야 성적이 오르는 해다냥. 라이벌을 하나 정해라냥.",
    health: "과음·과로로 몸이 먼저 지친다냥. 승부욕은 운동으로 풀어라냥.",
    advice: "빌려주지 말고, 따라 사지 마라냥.",
  },
  식신: {
    title: "먹을 복 들어오는 해",
    keys: ["여유", "재능", "먹을 복"],
    body: "마음이 편해지고 먹을 복이 드는 해다냥. 하고 싶던 걸 시작하면 그게 밥이 된다냥.",
    money: "재주가 돈이 되는 해다냥. 부업·취미 수익이 생기기 좋다냥. 큰 한 방보다 꾸준한 수입이다냥.",
    single: "편하게 웃게 해 주는 인연이 온다냥. 맛집·취미 모임에서 시작된다냥.",
    couple: "같이 먹고 노는 게 행복인 해다냥. 여행 한 번이 관계를 살린다냥.",
    work: "일이 즐거워지는 해다냥. 기획·콘텐츠·요리·교육처럼 손과 재주를 쓰는 일이 풀린다냥.",
    study: "좋아하는 과목이 확 늘어나는 해다냥. 재미 붙인 게 성적이 된다냥.",
    health: "몸이 편해지는 해인데, 그만큼 살이 붙는다냥. 과식만 조심해라냥.",
    advice: "미뤄 둔 걸 시작해라냥. 올해 시작한 게 오래 간다냥.",
  },
  상관: {
    title: "말과 재주가 터지는 해",
    keys: ["표현", "변화", "재치"],
    body: "말과 재주가 터지는 해다냥. 하고 싶은 말은 다 하게 되는데, 그 말이 기회도 되고 화근도 된다냥.",
    money: "아이디어가 돈이 되는 해다냥. 다만 기분 따라 쓰는 돈이 커진다냥.",
    single: "말이 잘 통하는 사람한테 확 끌린다냥. 첫 만남에 수다로 반한다냥.",
    couple: "말 한마디로 싸우고, 말 한마디로 푼다냥. 서운한 걸 쌓지 말고 그날 말해라냥.",
    work: "윗사람·규칙과 부딪치는 해다냥. 이직·전업 생각이 커지는데, 홧김에 그만두지는 마라냥.",
    study: "말하기·글쓰기·예체능이 터지는 해다냥. 대신 선생님과 부딪치지 마라냥.",
    health: "신경이 예민해져 잠이 얕아진다냥. 목·기관지를 아껴라냥.",
    advice: "말하기 전에 세 번 숨 쉬어라냥. 글로 쓰면 돈이 된다냥.",
  },
  편재: {
    title: "큰돈이 움직이는 해",
    keys: ["기회", "큰돈", "활동"],
    body: "큰돈과 기회가 움직이는 해다냥. 움직이는 만큼 생기는데, 욕심내는 순간 반 토막이다냥.",
    money: "목돈이 들어올 구멍이 생긴다냥. 투자·사업 기회가 오는데, 원금의 절반은 꼭 지켜라냥.",
    single: "인연이 여럿 들어오는 해다냥. 활동 반경을 넓히는 만큼 만난다냥.",
    couple: "함께 일을 벌이면 돈이 되는 해다냥. 대신 돈 얘기로 다투지 않게 규칙부터 정해라냥.",
    work: "영업·사업·프리랜서처럼 발로 뛰는 일이 터진다냥. 새 거래처가 붙는다냥.",
    study: "여기저기 관심이 퍼지는 해다냥. 과목 하나를 골라 끝까지 파라냥.",
    health: "바쁘게 뛰어다니다 허리·다리가 상한다냥. 쉬는 날을 달력에 박아 둬라냥.",
    advice: "기회는 잡되, 한 번에 다 걸지 마라냥.",
  },
  정재: {
    title: "차곡차곡 쌓이는 해",
    keys: ["안정", "저축", "성실"],
    body: "차곡차곡 쌓이는 해다냥. 큰 변화보다 꾸준함이 보상받는다냥.",
    money: "월급·고정 수입이 단단해지는 해다냥. 적금을 하나 시작하면 연말에 놀란다냥.",
    single: "진지한 인연이 온다냥. 결혼을 생각할 만한 사람이다냥.",
    couple: "살림과 미래 계획을 세우기 좋은 해다냥. 같이 사는 얘기가 자연스럽게 나온다냥.",
    work: "맡은 일을 끝까지 하는 사람이 인정받는 해다냥. 연봉 협상은 올해 해라냥.",
    study: "꾸준히 한 만큼 점수가 나오는 해다냥. 계획표가 곧 합격이다냥.",
    health: "규칙적인 생활이 곧 보약인 해다냥. 소화기를 챙겨라냥.",
    advice: "통장을 하나 더 만들어라냥. 올해 모은 돈이 내년을 지킨다냥.",
  },
  편관: {
    title: "버티면 오르는 해",
    keys: ["시험", "압박", "도약"],
    body: "압박과 시험이 오는 해다냥. 버티면 한 단계 오르는데, 몸이 먼저 신호를 보낸다냥.",
    money: "나갈 돈이 갑자기 생긴다냥. 수리비·병원비 같은 돈이다냥. 비상금을 따로 둬라냥.",
    single: "강하고 카리스마 있는 사람한테 끌리는 해다냥. 끌리는 만큼 휘둘리기도 한다냥.",
    couple: "책임이 무거워지는 해다냥. 서로 지친 티를 내도 탓하지는 마라냥.",
    work: "큰 프로젝트·시험·조직 개편 같은 도전이 온다냥. 피하지 말고 정면으로 받으면 승진 운이다냥.",
    study: "시험 압박이 센 해다냥. 버티면 한 단계 오른다냥.",
    health: "과로·스트레스로 몸이 상하기 쉬운 해다냥. 검진을 미루지 마라냥.",
    advice: "다 하려 하지 말고, 할 것 하나만 끝까지 해라냥.",
  },
  정관: {
    title: "인정받는 해",
    keys: ["명예", "자리", "신뢰"],
    body: "인정받는 해다냥. 반듯하게 쌓아 온 사람한테 '자리'가 생긴다냥.",
    money: "안정된 돈이 들어오는 해다냥. 승진·연봉·계약처럼 이름을 거는 돈이다냥.",
    single: "반듯하고 믿음 가는 인연이 온다냥. 소개·직장에서 만난다냥.",
    couple: "관계가 공식이 되는 해다냥. 상견례·결혼 같은 '다음 단계' 운이 있다냥.",
    work: "승진·합격·발탁 운이다냥. 원서를 넣을 거면 올해 넣어라냥.",
    study: "합격·선발 운이 좋은 해다냥. 원서를 넣어라냥.",
    health: "큰 탈은 없는데, 책임감에 쉬지를 못한다냥. 어깨·목을 풀어라냥.",
    advice: "약속과 규칙을 지키는 게 올해의 개운법이다냥.",
  },
  편인: {
    title: "생각이 확 바뀌는 해",
    keys: ["전환", "직관", "공부"],
    body: "생각과 방향이 확 바뀌는 해다냥. 공부·이직·전환엔 좋은데, 마음이 외로워진다냥.",
    money: "돈보다 배움에 쓰는 해다냥. 자격증·강의에 쓴 돈은 몇 년 뒤 돌아온다냥.",
    single: "말없이 통하는 묘한 인연이 온다냥. 빨리 진도 나가기보다 천천히 스며든다냥.",
    couple: "혼자만의 시간이 필요해지는 해다냥. 거리를 두는 걸 식은 걸로 오해하지 마라냥.",
    work: "업종을 바꾸거나 새 분야를 배우기 좋은 해다냥. 연구·기획·IT·상담처럼 머리를 쓰는 일이다냥.",
    study: "진로 생각이 확 바뀌는 해다냥. 새 분야를 탐색해 봐라냥.",
    health: "생각이 많아 잠을 설친다냥. 밤에는 휴대폰을 내려놓아라냥.",
    advice: "혼자 끙끙 앓지 마라냥. 생각은 줄이고, 결정은 소리 내서 해라냥.",
  },
  정인: {
    title: "도와주는 사람이 붙는 해",
    keys: ["귀인", "문서", "배움"],
    body: "도와주는 사람이 붙는 해다냥. 문서·계약·자격 운이 열린다냥.",
    money: "계약·부동산·문서로 들어오는 돈이 있다냥. 도장 찍을 일이 생기면 꼼꼼히 읽고 찍어라냥.",
    single: "나를 챙겨 주는 따뜻한 인연이 온다냥. 윗사람 소개가 좋다냥.",
    couple: "서로 기대고 챙기는 해다냥. 집안 어른의 도움을 받는다냥.",
    work: "시험·자격증·학위 운이 좋다냥. 윗사람이 끌어 준다냥.",
    study: "공부 운이 제일 좋은 해다냥. 선생님·선배 도움이 붙는다냥.",
    health: "몸이 회복되는 해다냥. 쉬면 쉬는 만큼 채워진다냥.",
    advice: "부탁해라냥. 올해는 손 내밀면 잡아 주는 해다냥.",
  },
};

/** One month in a word, and what to do in it. */
const MONTH: Record<TenGod, [string, string]> = {
  비견: ["내 힘으로 밀고 가는 달", "혼자 끝낼 일을 끝내라냥."],
  겁재: ["지갑 단속할 달", "큰 결제는 다음 달로 미뤄라냥."],
  식신: ["먹을 복·여유가 드는 달", "미뤄 둔 걸 시작해라냥."],
  상관: ["말과 아이디어가 터지는 달", "발표·제안·고백은 이때다냥."],
  편재: ["기회와 큰돈이 움직이는 달", "약속을 잡고 밖으로 나가라냥."],
  정재: ["차곡차곡 모이는 달", "저축·정리·계약 갱신을 해라냥."],
  편관: ["압박을 버티는 달", "급한 일부터 처리하고 일찍 자라냥."],
  정관: ["인정받는 달", "원서·면접·승진 얘기는 이때다냥."],
  편인: ["생각이 깊어지는 달", "배우고 계획을 세워라냥."],
  정인: ["도움이 들어오는 달", "부탁하고 도장 찍어라냥."],
};

type Area = "money" | "love" | "work" | "health" | "people";
const AREA_LABEL: Record<Area, string> = { money: "재물운", love: "연애·인연운", work: "일·직장운", health: "건강운", people: "사람운" };

/** How a 십성 group leans each area, in points. */
const LEAN: Record<TenGroup, Record<Area, number>> = {
  비겁: { money: -7, love: 0, work: 3, health: 4, people: 2 },
  식상: { money: 5, love: 6, work: 2, health: 4, people: 0 },
  재성: { money: 10, love: 3, work: 4, health: -3, people: 0 },
  관성: { money: 2, love: 3, work: 9, health: -5, people: 2 },
  인성: { money: -2, love: 1, work: 5, health: 5, people: 7 },
};

const LAST_YEAR: Record<string, (up: boolean, god: TenGod, clash: boolean) => string> = {
  good: (up) => (up ? "올해가 잘 풀렸다고 했지. 새해는 그 흐름이 더 커진다냥." : "올해가 잘 풀렸다고 했지. 새해는 한 템포 쉬어 가는 해다냥. 올해 얻은 걸 지키는 게 이기는 거다냥."),
  busy: (up, god) =>
    ["식신", "정인", "정재"].includes(god) ? "정신없이 바빴다고 했지. 새해는 좀 숨을 돌린다냥." : "정신없이 바빴다고 했지. 새해도 바쁜데, 이번엔 바쁜 만큼 남는다냥.",
  hard: (up) => (up ? "버티기만 했다고 했지. 새해는 숨통이 트인다냥. 운의 점수부터 올라간다냥." : "버티기만 했다고 했지. 새해도 쉽진 않은데, 버틴 근육이 이제 쓸모가 생긴다냥."),
  change: (_up, _god, clash) =>
    clash ? "확 바뀐 해였다고 했지. 새해에도 한 번 더 움직인다냥. 이번엔 네가 고르는 변화다냥." : "확 바뀐 해였다고 했지. 새해는 바뀐 자리에 뿌리 내리는 해다냥.",
  stuck: (up) => (up ? "제자리걸음이었다고 했지. 새해는 발이 떨어진다냥." : "제자리였다고 했지. 새해는 조급해하지 말고 실력부터 쌓는 해다냥. 그게 내후년을 연다냥."),
  lonely: (_up, god) =>
    ["비견", "정인", "식신", "정관"].includes(god)
      ? "외로웠다고 했지. 새해는 사람이 들어오는 해다냥."
      : "외로웠다고 했지. 새해는 혼자 있는 시간이 실력이 되는 해다냥. 사람은 하반기에 붙는다냥.",
};

const WANT_AREA: Record<string, Area> = { money: "money", love: "love", work: "work", study: "work", health: "health", people: "people" };
const WANT_LABEL: Record<string, string> = { money: "재물운", love: "연애운", work: "일·직장운", study: "시험·합격운", health: "건강운", people: "인간관계운" };

const HABIT: Record<string, (act: string) => string> = {
  late: (act) => `늦잠·미루기를 버리고 싶다고 했지. 아침 첫 30분을 정해 둬라냥. 네 용신 행동 — ${act} — 을 아침에 붙이면 하루가 열린다냥.`,
  spend: () => "충동구매를 버리고 싶다고 했지. 사고 싶은 게 생기면 장바구니에 넣고 사흘을 재워라냥. 사흘 뒤에도 갖고 싶으면 그때 사라냥.",
  phone: () => "새벽 폰을 버리고 싶다고 했지. 자정에 폰을 침대 밖에 두는 것, 그게 새해 첫 개운법이다냥.",
  worry: () => "생각 과다를 버리고 싶다고 했지. 걱정은 종이에 적고 접어 둬라냥. 적은 걱정은 반으로 준다냥.",
  drink: () => "술·야식을 버리고 싶다고 했지. 주 2회만 정해 두고 나머지는 물로 바꿔라냥. 위장이 편해야 운이 들어온다냥.",
  people: () => "거절 못 하는 버릇을 버리고 싶다고 했지. '생각해 보고 말해 줄게' 한마디면 된다냥. 바로 대답하지 않는 것부터 연습해라냥.",
};

/** 삼재: 申子辰 띠 → 寅卯辰 해, 巳酉丑 → 亥子丑, 寅午戌 → 申酉戌, 亥卯未 → 巳午未 (들 · 눌 · 날). */
function samjae(birthBranch: number, yearBranch: number): 0 | 1 | 2 | 3 {
  const start = { 8: 2, 0: 2, 4: 2, 5: 11, 9: 11, 1: 11, 2: 8, 6: 8, 10: 8, 11: 5, 3: 5, 7: 5 }[birthBranch]!;
  const k = (yearBranch - start + 12) % 12;
  return k < 3 ? ((k + 1) as 1 | 2 | 3) : 0;
}
const SAMJAE_NAME = ["", "들삼재", "눌삼재", "날삼재"];
const SAMJAE_LINE = [
  "",
  "들삼재(入三災)다냥. 삼재가 들어오는 해라, 새로 벌이는 일은 한 번 더 따져라냥.",
  "눌삼재(留三災)다냥. 삼재 한가운데라 버티는 해다냥. 무리한 확장만 피하면 된다냥.",
  "날삼재(出三災)다냥. 삼재가 나가는 해다냥. 마무리만 잘하면 다음 해부터 가볍다냥.",
];

export function newyearReading(input: QuestionnaireInput, c: Chart): { teaser: FortuneTeaser; report: FullReport } {
  const name = input.me.name;
  const a = (id: string) => (input.self[id] && input.self[id] !== "?" ? input.self[id] : undefined);
  const Y = newYearOf();
  const ageY = Y - c.birthYear + 1;
  const senior = ageY >= 65;
  const student = ageY < 20;
  const yp = yearPillar(Y);
  const yGanji = ganji(yp.stem, yp.branch);
  const yHanja = ganjiHanja(yp.stem, yp.branch);
  const god = tenGod(c.dayStem, yp.stem);
  const bGod = branchTenGod(c.dayStem, yp.branch);
  const t = NY[god];
  // pillarScore runs 20..95; shown on a 42..96 scale so a heavy year reads as "조심" rather than a failing grade. Order is kept.
  const soft = (n: number) => Math.round(42 + (n - 20) * 0.72);
  const raw = pillarScore(c, yp.stem, yp.branch);
  const score = soft(raw);
  const lastScore = soft(pillarScore(c, yearPillar(Y - 1).stem, yearPillar(Y - 1).branch));
  const rel = branchRelation(c.dayBranch, yp.branch);
  const together = samhapWith(c.dayBranch, yp.branch);
  const birth = c.branches[0];
  const sj = samjae(birth, yp.branch);
  const ownYear = yp.branch === birth;
  const birthClash = branchRelation(birth, yp.branch) === "clash";
  const daeunNow = [...c.daeun].reverse().find((d) => ageY >= d.age);
  const spouseGroup: TenGroup = c.gender === "male" ? "재성" : "관성";
  const dohwa = [dohwaOf(c.dayBranch), dohwaOf(birth)];
  const yeokma = [groupStars(c.dayBranch).yeokma, groupStars(birth).yeokma];
  const gwiin = gwiinOf(c.dayStem);
  const L = LUCK[c.yongsin];

  // ── 12달 (양력 1~12월: 1월은 전년 축월) ──
  const months = [...monthlyPillars(Y - 1), ...monthlyPillars(Y)]
    .filter((m) => m.year === Y)
    .sort((x, y) => x.month - y.month)
    .map((m) => {
      const mg = tenGod(c.dayStem, m.stem);
      const r = branchRelation(c.dayBranch, m.branch);
      const s = soft(0.6 * pillarScore(c, m.stem, m.branch) + 0.4 * raw);
      return {
        ...m,
        god: mg,
        group: GROUP_OF[mg],
        rel: r,
        together: samhapWith(c.dayBranch, m.branch),
        ganji: ganji(m.stem, m.branch),
        hanja: ganjiHanja(m.stem, m.branch),
        score: s,
      };
    });
  const byScore = [...months].sort((x, y) => y.score - x.score || x.month - y.month);
  const best = byScore.slice(0, 3).sort((x, y) => x.month - y.month);
  const top = byScore[0];
  const worst = [...months]
    .sort((x, y) => x.score - y.score || x.month - y.month)
    .slice(0, 2)
    .sort((x, y) => x.month - y.month);
  const tag = (m: (typeof months)[number]) => (m.rel === "harmony" ? " · 합(合)" : m.rel === "clash" ? " · 충(沖)" : m.together ? " · 삼합" : "");
  // A month's 십성 says what it brings; a low score says that it comes heavy (e.g. 도움은 오는데 대가가 큰 달).
  const heavy = (m: (typeof months)[number]) => (m.score < 55 ? " · 기운이 무거움" : "");
  // The do-line is said once per 감정서; a second month with the same 십성 keeps only its name.
  const saidDo = new Set<string>();
  const monthLine = (m: (typeof months)[number]) => {
    const act = MONTH[m.god][1];
    const fresh = !saidDo.has(act);
    saidDo.add(act);
    return `${m.month}월(${m.ganji}) — ${MONTH[m.god][0]}.${fresh ? ` ${act}` : ""}`;
  };

  /** Months that lean one area, best first. */
  const mean = months.reduce((t, m) => t + m.score, 0) / months.length;
  /** Months that fit one area: what the month's 십성 brings counts more than the month's overall luck. */
  const areaMonths = (area: Area, n = 2) =>
    [...months]
      .map((m) => {
        let s = (m.score - mean) * 0.5 + LEAN[m.group][area] * 1.6;
        if (area === "love") {
          if (m.group === spouseGroup) s += 8;
          if (dohwa.includes(m.branch)) s += 6;
          if (m.rel === "harmony") s += 5;
        }
        if (area === "people" && gwiin.includes(m.branch)) s += 8;
        if (m.rel === "clash") s -= 6;
        return { ...m, s };
      })
      .sort((x, y) => y.s - x.s || x.month - y.month)
      .slice(0, n)
      .sort((x, y) => x.month - y.month);
  const careful = (area: Area) =>
    [...months]
      .map((m) => ({ ...m, s: m.score + LEAN[m.group][area] - (m.rel === "clash" ? 8 : 0) - (area === "money" && m.god === "겁재" ? 6 : 0) }))
      .sort((x, y) => x.s - y.s || x.month - y.month)[0];
  const mm = (ms: { month: number }[]) => ms.map((m) => `${m.month}월`).join(" · ");

  // ── 영역 점수 ──
  const yg = GROUP_OF[god];
  const bg = GROUP_OF[bGod];
  const clamp = (n: number) => Math.max(32, Math.min(97, Math.round(n)));
  const areaScore = (area: Area) => {
    let s = score + LEAN[yg][area] + LEAN[bg][area] * 0.5;
    if (area === "love") {
      if (yg === spouseGroup || bg === spouseGroup) s += 6;
      if (dohwa.includes(yp.branch)) s += 7;
      if (rel === "harmony") s += 5;
      if (rel === "clash") s -= 6;
    }
    if (area === "health") {
      if (rel === "clash") s -= 8;
      if (senior) s -= 3;
    }
    if (area === "people" && gwiin.includes(yp.branch)) s += 8;
    return clamp(s);
  };
  const areas = (["money", "love", "work", "health", "people"] as Area[]).map((k) => ({ key: k, label: student && k === "work" ? "학업운" : AREA_LABEL[k], score: areaScore(k) }));
  const areaOf = (k: Area) => areas.find((x) => x.key === k)!;

  // ── 유료 감정서 ──
  const tail =
    raw >= 70
      ? "네 사주엔 반가운 기운이라, 움직이는 만큼 남는다냥."
      : raw < 52
        ? "다만 네 사주엔 무거운 기운이라, 얻는 만큼 대가가 따른다냥. 지키는 게 버는 해다냥."
        : "넘치지도 모자라지도 않은 해다냥. 어떻게 쓰느냐가 결과를 가른다냥.";
  const relLine =
    rel === "harmony"
      ? `${yGanji}년의 ${josa(ANIMALS[yp.branch], "이/가")} 네 일지와 합(合)을 이룬다냥. 새 인연·새 계약이 붙는 해다냥.`
      : rel === "clash"
        ? `${yGanji}년의 ${josa(ANIMALS[yp.branch], "이/가")} 네 일지와 충(沖)을 이룬다냥. 이사·이직·관계 변화처럼 판이 흔들리는 해다냥. 흔들릴 때 붙잡을 것 하나만 정해 둬라냥.`
        : together
          ? `${yGanji}년의 기운이 네 일지와 삼합(三合)을 이룬다냥. 같은 편이 생기는 해다냥.`
          : null;
  const wantKey = a("ny2");
  const wantLine = wantKey
    ? (() => {
        const ar = areaOf(WANT_AREA[wantKey]);
        const ms = areaMonths(WANT_AREA[wantKey]);
        return `제일 잡고 싶다던 ${wantKey === "study" ? "합격운" : WANT_LABEL[wantKey]}은 ${ar.score}점이다냥. ${ar.score >= 72 ? "운이 네 편이다냥." : ar.score >= 58 ? "노력한 만큼은 온다냥." : "쉽게 오진 않는데, 문이 열리는 달은 있다냥."} ${mm(ms)}에 문이 열린다냥.`;
      })()
    : null;

  const totalSec = sec(
    `${Y} ${yGanji}년 총운`,
    `${t.title}다냥`,
    lines(
      `${Y}년은 ${yGanji}(${yHanja})년이다냥. 네 일간에게 ${josa(god, "으로/로")} 들어오는 해다냥.`,
      senior ? GOD_YEAR_SENIOR[god] : t.body,
      tail,
      relLine,
      LAST_YEAR[a("ny1") ?? ""]?.(score >= lastScore, god, rel === "clash") ?? null,
      daeunNow
        ? `지금 대운(${daeunNow.ganji}, ${daeunNow.score}점) 위에 올라탄 해라, ${daeunNow.score >= 65 ? "큰 흐름이 받쳐 준다냥." : daeunNow.score < 52 ? "큰 흐름이 무거우니 욕심은 반만 내라냥." : "큰 흐름은 평탄하다냥. 이 해의 기운이 결과를 정한다냥."}`
        : null,
      wantLine,
    ),
    [
      `📊 ${Y} 총운 ${score}점 · ${scoreWord(score)}`,
      `🔑 키워드: ${t.keys.join(" · ")}`,
      `🀄 세운: ${yGanji}(${yHanja}) · 천간 ${god} · 지지 ${bGod}`,
      `✅ 한 줄 조언: ${t.advice}`,
    ],
  );

  const moneyMonths = areaMonths("money");
  const moneyCare = careful("money");
  const moneySec = sec(
    "재물운",
    `${areaOf("money").score}점 · ${mm(moneyMonths)}에 들어온다냥`,
    lines(
      t.money,
      bg === "재성" && yg !== "재성" ? `지지에도 재성(${bGod})이 깔려 있어서, 눈에 안 보이는 돈 길이 하나 더 있다냥.` : null,
      a("ny5") === "money" ? "돈 걱정이 제일 크다고 했지. 새해 돈은 '버는 달'과 '지키는 달'을 나눠 쓰면 걱정이 반으로 준다냥." : null,
    ),
    [`💰 돈이 들어오는 달: ${mm(moneyMonths)}`, `🚫 지갑 닫을 달: ${moneyCare.month}월(${moneyCare.ganji})`],
  );

  const status = a("ny4");
  // Under 20: no 결혼 · 상견례 · 동거 talk.
  const teen = (line: string, alt: string) => (student && /결혼|상견례|같이 사는/.test(line) ? alt : line);
  const single = teen(t.single, "진지하게 오래 갈 인연이 온다냥. 서두르지 않는 사람이 이긴다냥.");
  const couple = teen(t.couple, "관계가 한 단계 깊어지는 해다냥. 서로의 친구들에게도 자연스럽게 소개하게 된다냥.");
  const loveMonths = areaMonths("love");
  const loveBody = senior
    ? "배우자·가족과의 정이 깊어지는 해다냥. 먼저 고맙다고 말하는 쪽이 복을 받는다냥."
    : status === "dating" || status === "married"
      ? couple
      : status === "after"
        ? `이별의 해를 넘기는 해다냥. ${score >= 60 ? "새해 상반기에 마음이 먼저 정리되고, 새 사람은 그다음에 온다냥." : "서두르지 마라냥. 상처가 아물어야 다음 사람이 제대로 보인다냥."} ${single}`
        : status === "some"
          ? `썸이 있다고 했지. ${rel === "harmony" || dohwa.includes(yp.branch) || yg === spouseGroup ? "새해는 썸이 연애로 넘어가기 좋은 해다냥." : "새해는 밀당이 길어지는 해다냥. 네가 한 발 먼저 가야 끝이 난다냥."} ${single}`
          : single;
  const loveSec = sec(
    senior ? "가족·인연운" : "연애·인연운",
    `${areaOf("love").score}점 · ${mm(loveMonths)}이 인연의 달이다냥`,
    lines(
      loveBody,
      dohwa.includes(yp.branch) && !senior ? "새해 지지에 도화(桃花)가 든다냥. 가만있어도 눈길이 오는 해다냥." : null,
      yg === spouseGroup && !senior && !student ? `새해 천간에 배우자 별(${c.gender === "male" ? "재성" : "관성"})이 들어온다냥. 진지한 인연의 해다냥.` : null,
    ),
    [`💘 인연이 드는 달: ${mm(loveMonths)}`, ...(rel === "clash" && !senior ? ["⚡ 일지 충이 드는 해: 다툼은 그날 풀고 자라냥"] : [])],
  );

  const workMonths = areaMonths("work");
  const workSec = sec(
    student ? "학업·진로운" : senior ? "일상·활동운" : "일·직장운",
    `${areaOf("work").score}점 · ${mm(workMonths)}에 힘이 실린다냥`,
    lines(
      student ? t.study : senior ? "일보다 하루의 리듬이 운을 정하는 해다냥. 배우는 모임 하나를 들면 사람과 활력이 같이 온다냥." : t.work,
      yeokma.includes(yp.branch) ? "새해에 역마(驛馬)가 든다냥. 이동·출장·이직 기운이 세다냥. 움직이면 붙는 해다냥." : null,
      a("ny5") === "work" ? "앞길이 걱정이라고 했지. 걱정은 계획으로 바꾸면 줄어든다냥. 아래 달에 맞춰 한 걸음씩 가라냥." : null,
    ),
    [`💼 힘이 실리는 달: ${mm(workMonths)}`],
  );

  const healthCare = careful("health");
  const healthSec = sec(
    "건강운",
    `${areaOf("health").score}점 · ${healthCare.month}월을 조심해라냥`,
    lines(
      senior ? `${t.health} 무엇보다 넘어지는 사고를 조심해라냥.` : t.health,
      `네 사주에서 약한 고리는 ${ORGANS[c.gisin]} 쪽이다냥. 새해엔 여기부터 챙겨라냥.`,
      rel === "clash" ? "일지와 충이 드는 해라 몸이 먼저 흔들린다냥. 이동이 많은 달엔 무리하지 마라냥." : null,
      a("ny5") === "health" || a("ny5") === "mind"
        ? a("ny5") === "mind"
          ? "번아웃이 걱정이라고 했지. 새해 운은 쉬는 사람에게 들어온다냥. 일주일에 하루는 아무것도 안 하는 날로 비워 둬라냥."
          : "건강이 걱정이라고 했지. 미뤄 둔 검진은 새해 상반기에 받아라냥. 그게 운을 지키는 제일 싼 방법이다냥."
        : null,
    ),
    [`🩺 조심할 달: ${healthCare.month}월(${healthCare.ganji})`, `🫀 챙길 곳: ${ORGANS[c.gisin]}`],
  );

  const gwiinMonths = months.filter((m) => gwiin.includes(m.branch));
  const clashAnimal = ANIMALS[(c.dayBranch + 6) % 12];
  const peopleSec = sec(
    "사람운 · 귀인",
    `${gwiin.map((b) => ANIMALS[b]).join("·")}띠가 귀인이다냥`,
    lines(
      gwiin.includes(yp.branch) ? "새해 지지에 천을귀인이 든다냥. 막히는 순간마다 누가 손을 내미는 해다냥." : null,
      yg === "인성"
        ? "인성의 해라 윗사람·선배 덕을 보는 해다냥."
        : yg === "비겁"
          ? "비겁의 해라 친구·동료가 힘이 되는데, 돈은 섞지 마라냥."
          : yg === "식상"
            ? "식상의 해라 네가 챙기는 사람들이 나중에 복이 되어 돌아온다냥."
            : null,
      a("ny5") === "people" ? "사람 때문에 지쳤다고 했지. 새해엔 거리를 두는 것도 운을 지키는 법이다냥." : null,
      a("ny5") === "family" ? "가족이 걱정이라고 했지. 새해엔 네가 다 짊어지지 말고, 말로 나눠라냥. 나누면 가벼워지는 해다냥." : null,
      `${clashAnimal}띠와는 부딪치기 쉽다냥. 돈 거래·동업만 피하면 된다냥.`,
    ),
    [`🤝 귀인 띠: ${gwiin.map((b) => ANIMALS[b]).join(" · ")}`, ...(gwiinMonths.length ? [`🌟 귀인이 드는 달: ${mm(gwiinMonths)}`] : []), `⚡ 부딪치기 쉬운 띠: ${clashAnimal}`],
  );

  const flowSec = sec(
    "12달 흐름",
    `최고의 달은 ${top.month}월이다냥`,
    lines(
      `${Y}년 열두 달을 하나씩 짚었다냥. 월운(月運)은 절기로 바뀌어서, 각 달 초순(4~8일 무렵)부터 기운이 넘어간다냥.`,
      `제일 좋은 달은 ${best.map((m) => `${m.month}월`).join("·")}, 몸을 낮출 달은 ${worst.map((m) => `${m.month}월`).join("·")}이다냥.`,
    ),
    months.map((m) => `${m === top ? "🌟" : worst.includes(m) ? "⚠️" : "·"} ${m.month}월 ${m.ganji} ${m.score}점 · ${MONTH[m.god][0]}${tag(m)}${heavy(m)}`),
  );

  const plan = a("ny3");
  const PLAN: Record<string, { label: string; pick: (m: (typeof months)[number]) => number; why: string }> = {
    job: {
      label: "이직·취업",
      pick: (m) => (m.group === "관성" ? 8 : 0) + (yeokma.includes(m.branch) ? 6 : 0) + (m.group === "인성" ? 3 : 0),
      why: "관성(자리)이 들거나 역마(이동)가 드는 달",
    },
    move: {
      label: "이사",
      pick: (m) => (yeokma.includes(m.branch) ? 8 : 0) + (m.rel === "harmony" ? 5 : 0) + (m.god === "정인" ? 4 : 0),
      why: "역마(이동)가 들거나 일지와 합이 드는 달",
    },
    marry: {
      label: "결혼·연애 시작",
      pick: (m) => (m.group === spouseGroup ? 8 : 0) + (m.rel === "harmony" ? 6 : 0) + (dohwa.includes(m.branch) ? 4 : 0),
      why: "배우자 별이 들거나 일지와 합이 드는 달",
    },
    biz: { label: "창업·부업", pick: (m) => (m.god === "식신" || m.god === "편재" ? 8 : 0) + (m.group === "재성" ? 3 : 0), why: "식신(재주)과 편재(사업)가 드는 달" },
    exam: { label: "시험·자격증", pick: (m) => (m.group === "인성" ? 8 : 0) + (m.god === "정관" ? 6 : 0), why: "인성(공부)과 정관(합격)이 드는 달" },
    invest: { label: "투자·큰 지출", pick: (m) => (m.god === "정재" ? 8 : m.god === "편재" ? 6 : 0) - (m.god === "겁재" ? 8 : 0), why: "재성이 들고 겁재(손재)가 없는 달" },
  };
  const P = plan && PLAN[plan] ? PLAN[plan] : null;
  const planPicks = P
    ? [...months]
        .map((m) => ({ ...m, s: (m.score - mean) * 0.5 + P.pick(m) * 1.3 - (m.rel === "clash" && plan !== "move" ? 8 : 0) }))
        .sort((x, y) => y.s - x.s || x.month - y.month)
        .slice(0, 2)
        .sort((x, y) => x.month - y.month)
    : [];
  const planClash = P ? months.filter((m) => m.rel === "clash").map((m) => m.month) : [];
  const planLoss = plan === "invest" ? months.filter((m) => m.god === "겁재" && m.rel !== "clash").map((m) => m.month) : [];
  const planAvoid = [...planClash, ...planLoss].sort((x, y) => x - y);
  const planSec = P
    ? sec(
        `${P.label} 타이밍`,
        `${mm(planPicks)}이 문이 열리는 달이다냥`,
        lines(
          `새해에 ${josa(P.label, "을/를")} 생각한다고 했지. 사주로 보면 ${P.why}이 맞다냥.`,
          ...planPicks.map((m) => monthLine(m)),
          planClash.length ? `${planClash.map((n) => `${n}월`).join("·")}은 일지와 부딪치는(충) 달이라 큰 결정은 피해라냥.` : null,
          planLoss.length ? `${planLoss.map((n) => `${n}월`).join("·")}은 겁재(손재)가 드는 달이라 돈을 묶지 마라냥.` : null,
        ),
        [`🗓️ 추천 달: ${mm(planPicks)}`, ...(planAvoid.length ? [`⛔ 피할 달: ${planAvoid.map((n) => `${n}월`).join(" · ")}`] : [])],
      )
    : sec(
        "새해 기회의 달",
        `${top.month}월에 기회가 온다냥`,
        lines("계획은 없다고 했지. 그럼 기회가 먼저 찾아오는 달을 알려 주겠다냥.", monthLine(top), `이 달에 들어온 제안은 가볍게 넘기지 마라냥.`),
        [`🗓️ 기회의 달: ${top.month}월(${top.ganji})`],
      );

  const nextSj = samjae(birth, yearPillar(Y + 1).branch);
  const cautionSec = sec(
    "삼재 · 조심할 것",
    sj ? `${ANIMALS[birth]}띠는 ${SAMJAE_NAME[sj]}다냥` : `${ANIMALS[birth]}띠는 삼재가 아니다냥`,
    lines(
      sj ? SAMJAE_LINE[sj] : `${ANIMALS[birth]}띠는 ${Y}년에 삼재가 아니다냥.${nextSj === 1 ? ` 다만 ${Y + 1}년부터 삼재가 들어오니, 큰일은 새해 안에 매듭지어라냥.` : ""}`,
      sj && raw >= 70 ? "근데 세운 점수가 높아서 복삼재(福三災)다냥. 겁먹을 필요 없다냥. 삼재에 오히려 일이 풀리는 사주다냥." : null,
      ownYear ? `${Y}년은 네 띠의 해(본명년)다냥. 기운이 들뜨기 쉬우니 큰 결정은 한 박자 늦춰라냥.` : null,
      birthClash ? `${ANIMALS[yp.branch]}해는 ${ANIMALS[birth]}띠와 충이 드는 해다냥. 계약서는 두 번 읽고, 이동은 여유 있게 잡아라냥.` : null,
      `몸을 낮출 달은 ${worst.map((m) => `${m.month}월(${m.ganji})`).join("·")}이다냥. 이 달엔 새 일을 벌이기보다 하던 걸 지켜라냥.`,
    ),
    [`🧿 삼재: ${sj ? `${SAMJAE_NAME[sj]} (${Y})` : "해당 없음"}`, `⚠️ 몸 낮출 달: ${worst.map((m) => `${m.month}월`).join(" · ")}`],
  );

  const luckSec = sec(
    "새해 개운법",
    `${josa(L.color, "이/가")} 새해 행운의 색이다냥`,
    lines(
      `네 용신은 ${c.yongsin === "wood" ? "목(木)" : c.yongsin === "fire" ? "화(火)" : c.yongsin === "earth" ? "토(土)" : c.yongsin === "metal" ? "금(金)" : "수(水)"}이다냥. 새해 내내 이 기운을 곁에 두면 운이 붙는다냥.`,
      HABIT[a("ny6") ?? ""]?.(L.act) ?? null,
      `행운의 날을 고를 땐 ${best.map((m) => `${m.month}월`).join("·")} 안에서 골라라냥.`,
    ),
    [`🎨 색: ${L.color}`, `🧭 방향: ${L.direction}`, `🔢 숫자: ${L.numbers}`, `🍽️ 음식: ${L.food}`, `📍 기운 받는 곳: ${L.place}`, `🧸 소품: ${L.item}`, `🏃 행동: ${L.act}`],
  );

  const sections = [
    { id: "total", icon: "🎍", section: totalSec },
    { id: "money", icon: "💰", section: moneySec },
    { id: "love", icon: "💘", section: loveSec },
    { id: "work", icon: student ? "📝" : "💼", section: workSec },
    { id: "health", icon: "🌿", section: healthSec },
    { id: "people", icon: "🤝", section: peopleSec },
    { id: "flow", icon: "🗓️", section: flowSec },
    { id: "plan", icon: "🎯", section: planSec },
    { id: "caution", icon: "🧿", section: cautionSec },
    { id: "luck", icon: "🍀", section: luckSec },
  ];
  const report: FullReport = { subScores: areas.map((x) => ({ label: x.label, score: x.score })), sections, luck: null };

  // ── 무료 맛보기 ──
  const hook = P
    ? `${josa(P.label, "을/를")} 계획한다고 했지. 새해에 그 문이 열리는 달이 딱 두 번 있다냥. ${planAvoid.length ? `그리고 절대 움직이면 안 되는 달도 있다냥.` : "몇 월인지 감정서에 적어 뒀다냥."}`
    : sj
      ? `${ANIMALS[birth]}띠는 ${Y}년이 ${SAMJAE_NAME[sj]}다냥. ${raw >= 70 ? "근데 겁먹을 필요 없는 삼재다냥. 이유는 감정서에 있다냥." : "조심할 달과 버티는 법을 감정서에 적어 뒀다냥."}`
      : (LAST_YEAR[a("ny1") ?? ""]?.(score >= lastScore, god, rel === "clash") ?? `${t.title}… 그런데 네 사주엔 한 가지가 더 보인다냥.`);
  const beats: FortuneBeat[] = [
    {
      say: `${name}… ${Y}년 ${yGanji}년의 운을 펼친다냥. 원국부터 깔고 본다냥.`,
      mood: "smug",
      card: { kind: "chart" },
      next: "감정 근거는?",
    },
    {
      say: "새해 기운을 네 원국에 맞대 봤다냥. 근거부터 보여 주겠다냥.",
      mood: "talk",
      card: basisCard(c, [
        ["세운", `${Y} ${yGanji}(${yHanja})년 · ${god}`],
        ["일지와", rel === "harmony" ? "합(合)" : rel === "clash" ? "충(沖)" : together ? "삼합(三合)" : "무난"],
        ["삼재", sj ? SAMJAE_NAME[sj] : "해당 없음"],
        ...(daeunNow ? ([["그해 대운", `${daeunNow.ganji} · ${daeunNow.score}점`]] as [string, string][]) : []),
      ]),
      next: "총운은?",
    },
    {
      say: `${Y}년 총운이다냥.`,
      mood: "wow",
      card: { kind: "score", label: `${Y} 총운`, score, headline: t.title, body: `${senior ? GOD_YEAR_SENIOR[god] : t.body} ${tail}` },
      next: "12달은?",
    },
    {
      say: "열두 달을 하나씩 세웠다냥. 막대가 높을수록 운이 센 달이다냥.",
      mood: "talk",
      card: {
        kind: "timeline",
        title: `${name}의 ${Y} 12달`,
        icon: "🗓️",
        unit: "월",
        note: `● 빛나는 칸이 새해 최고의 달이다냥`,
        items: months.map((m) => ({ age: String(m.month), ganji: m.ganji, hanja: m.hanja, score: m.score, current: m === top, god: m.god })),
      },
      next: "왜 그 달이야?",
    },
    {
      say: P ? "새해 계획, 괜히 물은 거 아니다냥." : sj ? "띠도 봐야 한다냥." : "올해 얘기, 괜히 물은 거 아니다냥.",
      mood: "smug",
      card: { kind: "text", icon: P ? "🎯" : sj ? "🧿" : "🔗", title: P ? `${P.label} 타이밍` : sj ? "삼재" : "올해와 새해", body: hook },
      next: "더 알려 줘",
    },
    {
      say: "새해를 세 단어로 줄이면 이렇다냥.",
      mood: "wow",
      card: { kind: "keywords", title: `${Y} 키워드`, items: [...t.keys], body: `한 줄 조언: ${t.advice}` },
      next: "다 듣고 싶어",
    },
  ];
  const teaser: FortuneTeaser = {
    mode: "newyear",
    title: `${name}의 ${Y} 신년운세`,
    saju: c.saju.summary,
    beats,
    paywall: `…여기서부터가 진짜다냥. 재물·연애·일·건강·사람운 점수와 들어오는 달, 열두 달 하나하나, ${P ? `${P.label} 날짜, ` : ""}삼재와 조심할 달, 새해 개운법까지 다 적어 뒀다냥. 듣고 갈래? 😼`,
    locked: sections.map((s) => locked(s.id, s.icon, s.section)),
    story: {
      kind: "fortune",
      label: `${name}의 ${Y} 신년운세`,
      emoji: "🎍",
      headline: t.title,
      sub: `${Y} ${yGanji}년 총운 ${score}점`,
      meta: c.saju.summary.pillars.map((pl) => pl.hanja).join(" "),
      slipLabel: "냥신이 짚은 최고의 달",
      slipValue: `${top.month}월`,
      slipText: `키워드 · ${t.keys.join(" · ")}`,
    },
  };
  return { teaser, report };
}
