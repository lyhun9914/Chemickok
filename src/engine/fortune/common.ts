import "server-only";
import { josa } from "@/lib/josa";
import type { ElementKey, FortuneCard, LockedPreview, ReportSection } from "@/models/types";
import { ANIMALS } from "../saju";
import { type Chart, type TenGod, type TenGroup, BRANCHES_HANGUL, STEMS_HANGUL, dominantGroups, elementLabel, gwiinOf } from "./chart";

// 냥신 speaks like a fortune-teller: short, flat, certain. One fact per line.

/** 일간 10개: 타고난 그릇. */
export const STEM: {
  name: string;
  image: string;
  core: string;
  gift: string;
  shadow: string;
  money: string;
  work: string;
  love: string;
}[] = [
  {
    name: "갑목(甲木)",
    image: "곧게 뻗은 큰 나무",
    core: "위로만 자라는 큰 나무다냥. 꺾일지언정 휘지 않는다냥.",
    gift: "뚝심과 리더십이다냥. 한번 정한 길은 끝까지 간다냥.",
    shadow: "굽힐 줄을 모른다냥. 고개 한 번 숙이면 끝날 일을 버티다 부러진 적, 있지?",
    money: "돈보다 명분이 먼저다냥. 큰 그림으로 벌고, 자잘한 관리에서 샌다냥.",
    work: "기획·교육·리더 자리다냥. 남 밑에서는 오래 못 버틴다냥.",
    love: "좋으면 직진인데 표현이 투박하다냥. 지켜 주고 싶은 사람한테 약하다냥.",
  },
  {
    name: "을목(乙木)",
    image: "바람에 흔들리며 피는 꽃",
    core: "흔들려도 안 꺾이는 꽃이다냥. 약해 보여서 다들 속는다냥.",
    gift: "적응력과 사람을 잇는 재주다냥. 어디든 뿌리내린다냥.",
    shadow: "기댈 데를 찾는다냥. 기댄 나무가 흔들리면 같이 흔들린다냥.",
    money: "알뜰하게 모으는데 사람 때문에 나간다냥.",
    work: "디자인·상담·서비스·중개다냥. 사람 사이에서 빛나는 일.",
    love: "다정하고 섬세하다냥. 서운한 걸 쌓아 뒀다가 한 번에 터뜨린다냥.",
  },
  {
    name: "병화(丙火)",
    image: "한여름의 태양",
    core: "숨기는 게 없는 한여름 태양이다냥. 네가 들어오면 방이 밝아진다냥.",
    gift: "추진력과 화끈함이다냥. 가만있어도 사람이 모인다냥.",
    shadow: "식는 것도 빠르다냥. 기분이 얼굴에 다 써 있다냥.",
    money: "크게 벌고 크게 쓴다냥. 통장보다 씀씀이가 먼저 커진다냥.",
    work: "방송·영업·교육·무대다냥. 앞에 서야 사는 사람이다냥.",
    love: "불같이 사랑한다냥. 반응이 없으면 금방 식는다냥.",
  },
  {
    name: "정화(丁火)",
    image: "밤을 밝히는 촛불",
    core: "밤을 밝히는 촛불이다냥. 겉은 조용한데 속에서 계속 타고 있다냥.",
    gift: "집중력과 섬세함이다냥. 한 사람, 한 가지에 깊다냥.",
    shadow: "생각이 너무 많다냥. 혼자 상처받고 혼자 정리한다냥.",
    money: "꼼꼼하게 번다냥. 마음 상하면 돈으로 푼다냥.",
    work: "연구·기획·의료·예술이다냥. 깊이 파고드는 일.",
    love: "한번 마음 주면 오래 간다냥. 의심도 오래 간다냥.",
  },
  {
    name: "무토(戊土)",
    image: "묵직한 큰 산",
    core: "움직이지 않는 큰 산이다냥. 다들 너한테 기대러 온다냥.",
    gift: "듬직함과 신용이다냥. 말보다 행동이다냥.",
    shadow: "한번 닫히면 안 열린다냥. 고집을 무게로 착각한다냥.",
    money: "땅·집과 인연이 깊다냥. 묵혀서 버는 팔자다냥.",
    work: "관리·부동산·공직·중개다냥. 판을 지키는 일.",
    love: "무뚝뚝한데 책임감은 최고다냥. 사랑을 말이 아니라 생활로 한다냥.",
  },
  {
    name: "기토(己土)",
    image: "모든 걸 품는 기름진 땅",
    core: "뭐든 품고 키우는 밭이다냥. 남 챙기다 자기는 늘 뒷전이다냥.",
    gift: "실속과 배려다냥. 사람을 키우는 재주가 있다냥.",
    shadow: "속으로 계산과 걱정이 많다냥. 남 눈치를 너무 본다냥.",
    money: "알뜰하게 모은다냥. 큰 모험은 안 한다냥.",
    work: "교육·회계·요식·돌봄이다냥. 사람과 살림을 다루는 일.",
    love: "헌신적이다냥. 서운한 건 말 못 하고 혼자 삭인다냥.",
  },
  {
    name: "경금(庚金)",
    image: "단단한 원석",
    core: "단단한 쇳덩이다냥. 옳고 그름이 칼같다냥.",
    gift: "결단력과 의리다냥. 할 말은 한다냥.",
    shadow: "말이 날카롭다냥. 상처 줄 생각은 없었는데 상처 줬지?",
    money: "승부로 번다냥. 한 방에 크게 벌고, 한 방에 잃는다냥.",
    work: "법·기술·금융·운동·조직이다냥. 칼을 쓰는 일.",
    love: "좋으면 화끈하다냥. 자존심 때문에 먼저 숙이질 않는다냥.",
  },
  {
    name: "신금(辛金)",
    image: "세공된 보석",
    core: "세공된 보석이다냥. 대접받아야 빛난다냥.",
    gift: "섬세한 감각과 완벽주의다냥. 고급을 한눈에 알아본다냥.",
    shadow: "자존심이 유리 같다냥. 무심한 한마디에 깊게 베인다냥.",
    money: "돈 되는 걸 보는 눈이 있다냥. 대신 꾸밈비가 크다냥.",
    work: "금융·패션·미용·전문직이다냥. 손끝이 예민한 일.",
    love: "까다롭다는 말 듣지? 기준이 높은 거다냥.",
  },
  {
    name: "임수(壬水)",
    image: "깊고 넓은 바다",
    core: "넓고 깊은 바다다냥. 속을 아무도 모른다냥.",
    gift: "지혜와 스케일이다냥. 머리가 비상하다냥.",
    shadow: "한곳에 못 머문다냥. 생각은 큰데 마무리가 약하다냥.",
    money: "흐르는 돈이다냥. 들어오는 길도 나가는 길도 넓다냥.",
    work: "무역·유통·여행·IT·기획이다냥. 흐르는 일.",
    love: "자유롭게 사랑한다냥. 묶으려 들면 떠난다냥.",
  },
  {
    name: "계수(癸水)",
    image: "새벽 이슬과 봄비",
    core: "소리 없이 스미는 봄비다냥. 조용히 다 알고 있다냥.",
    gift: "직관과 인내다냥. 사람 속을 꿰뚫는다냥.",
    shadow: "걱정과 상상이 많다냥. 일어나지도 않은 일로 밤을 샌다냥.",
    money: "티 안 나게 모은다냥. 남모르는 비상금이 있지?",
    work: "연구·상담·의료·예술이다냥. 안 보이는 걸 다루는 일.",
    love: "속으로 오래 좋아한다냥. 고백은 늦고 정은 깊다냥.",
  },
];

/** 가장 강한 십성: 사주의 기본 성향. */
export const GROUP_STRONG: Record<TenGroup, string> = {
  비겁: "사주에 '나'가 많다냥. 남 밑에 있으면 숨이 막힌다냥. 형제나 친구 일로 돈이 나간 적, 있지?",
  식상: "사주에 '말과 재주'가 넘친다냥. 할 말은 해야 직성이 풀린다냥. 그래서 윗사람과 부딪친다냥.",
  재성: "사주에 '돈과 현실'이 많다냥. 머릿속에 계산기가 늘 돌아간다냥. 대신 몸이 먼저 지친다냥.",
  관성: "사주에 '책임과 압박'이 많다냥. 맡은 건 무조건 해낸다냥. 그래서 쉬어도 쉬는 게 아니다냥.",
  인성: "사주에 '생각과 보호'가 많다냥. 머리로 다 해 보고 나서야 움직인다냥. 그래서 시작이 늦다냥.",
};

/** 가장 약한 십성: 빈자리. */
export const GROUP_WEAK: Record<TenGroup, string> = {
  비겁: "네 편이 적은 팔자다냥. 결국 다 혼자 해 왔지?",
  식상: "표현이 막힌 팔자다냥. 속에 있는 말의 반도 못 꺼낸다냥.",
  재성: "돈 욕심이 적은 팔자다냥. 대신 돈 관리가 약하다냥.",
  관성: "누가 시키는 걸 못 견딘다냥. 규칙보다 내 방식이다냥.",
  인성: "기댈 데 없이 컸다냥. 도움받는 게 어색하지?",
};

export const ORGANS: Record<ElementKey, string> = {
  wood: "간·쓸개·눈·근육",
  fire: "심장·혈압·혈액순환",
  earth: "위장·비장·소화기",
  metal: "폐·기관지·대장·피부",
  water: "신장·방광·허리·뼈",
};

/** 용신 오행으로 하는 개운(開運). */
export const LUCK: Record<
  ElementKey,
  {
    color: string;
    direction: string;
    numbers: string;
    food: string;
    place: string;
    item: string;
    act: string;
  }
> = {
  wood: {
    color: "초록·청색",
    direction: "동쪽",
    numbers: "3·8",
    food: "신맛·푸른 채소",
    place: "숲·공원·식물원",
    item: "화분·나무 소품",
    act: "아침 산책, 새로운 걸 배우기",
  },
  fire: {
    color: "빨강·주황",
    direction: "남쪽",
    numbers: "2·7",
    food: "쓴맛·붉은 과일",
    place: "햇볕 드는 곳·사람 많은 곳",
    item: "캔들·따뜻한 조명",
    act: "사람 만나기, 마음을 말로 꺼내기",
  },
  earth: {
    color: "노랑·베이지",
    direction: "중앙(집 근처)",
    numbers: "5·10",
    food: "단맛·잡곡",
    place: "산·흙길·도자기 공방",
    item: "도자기·황토 소품",
    act: "잠·밥 시간 고정하기, 한 가지를 오래 하기",
  },
  metal: {
    color: "흰색·금색",
    direction: "서쪽",
    numbers: "4·9",
    food: "매운맛·배·무",
    place: "높은 곳·잘 정리된 공간",
    item: "금속 시계·액세서리",
    act: "버리고 정리하기, 미뤄 둔 결정 내리기",
  },
  water: {
    color: "검정·남색",
    direction: "북쪽",
    numbers: "1·6",
    food: "짠맛·해산물·물",
    place: "강·바다·욕조",
    item: "유리·수정 소품",
    act: "물 자주 마시기, 밤 산책, 혼자 생각할 시간",
  },
};

export const SINSAL_TEXT = {
  dohwa: "도화살(桃花殺)이 있다냥. 가만있어도 사람이 꼬인다냥. 인기는 복인데, 원치 않는 인연도 같이 온다냥.",
  yeokma: "역마살(驛馬殺)이 있다냥. 한곳에 오래 못 있는 팔자다냥. 움직일수록 돈과 기회가 붙는다냥.",
  hwagae: "화개살(華蓋殺)이 있다냥. 혼자만의 시간이 꼭 필요한 사람이다냥. 예술·종교·학문 감각이 남다르다냥.",
  hongyeom: "홍염살(紅艶殺)이 있다냥. 티는 안 나는데 묘하게 끌리는 사람이다냥. 네가 모르는 사이 너 좋아한 사람, 꽤 있다냥.",
  gwiin: "천을귀인(天乙貴人)이 있다냥. 죽으란 법은 없는 팔자다냥. 막판에 꼭 누가 손을 내민다냥.",
} as const;

export const GOD_SHORT: Record<TenGod, string> = {
  비견: "독립·경쟁",
  겁재: "승부·손재",
  식신: "재능·먹을 복",
  상관: "표현·변화",
  편재: "큰돈·기회",
  정재: "안정된 돈",
  편관: "압박·도전",
  정관: "명예·직장",
  편인: "직관·전환",
  정인: "공부·도움",
};

/** 세운(그해의 운) by 십성. */
export const GOD_YEAR: Record<TenGod, string> = {
  비견: "내 힘으로 판을 짜는 해다냥. 동업·보증은 피해라냥.",
  겁재: "경쟁과 지출이 같이 오는 해다냥. 돈 빌려주는 순간 못 받는다냥.",
  식신: "먹을 복과 일복이 같이 오는 해다냥. 미뤄 둔 걸 시작해라냥.",
  상관: "말과 재주가 터지는 해다냥. 대신 윗사람과 부딪치고 말이 돈다냥.",
  편재: "큰돈이 움직이는 해다냥. 기회는 오는데 욕심내면 반 토막이다냥.",
  정재: "차곡차곡 쌓이는 해다냥. 월급·저축·안정의 해다냥.",
  편관: "압박과 시험의 해다냥. 버티면 한 단계 오르는데, 몸이 먼저 상한다냥.",
  정관: "인정받는 해다냥. 승진·합격·결혼 같은 '자리'가 생긴다냥.",
  편인: "생각이 확 바뀌는 해다냥. 공부·이직·전환엔 좋은데 외롭다냥.",
  정인: "도와주는 사람이 붙는 해다냥. 문서·계약·자격 운이 있다냥.",
};

/** The year's theme read against this chart: the same 십성 helps one chart and burdens another. */
const GOOD_TAIL = ["네 사주엔 반가운 기운이라 결과가 좋게 남는다냥.", "이 해도 너한텐 반가운 기운이다냥. 밀어붙여도 된다냥.", "역시 반가운 해다냥. 미뤄 둔 걸 꺼내라냥."];
const HEAVY_TAIL = [
  "근데 네 사주엔 무거운 기운이라, 얻는 만큼 대가가 따른다냥.",
  "이 해도 너한텐 무거운 기운이다냥. 큰 결정은 한 번 더 재라냥.",
  "역시 무거운 해다냥. 지키는 게 버는 거다냥.",
];

/** The same year for someone past 65: 몸 · 식구 · 재산, not promotions and weddings. */
export const GOD_YEAR_SENIOR: Record<TenGod, string> = {
  비견: "친구·형제 일로 바빠지는 해다냥. 돈 거래만은 피해라냥.",
  겁재: "주변으로 돈이 새기 쉬운 해다냥. 지갑은 꼭 닫아라냥.",
  식신: "먹을 복과 편한 일상이 드는 해다냥. 몸이 가볍다냥.",
  상관: "말로 서운함이 생기는 해다냥. 자식한테 한마디 줄여라냥.",
  편재: "목돈이 움직이는 해다냥. 재산 정리는 이때 해 둬라냥.",
  정재: "살림이 차곡차곡 안정되는 해다냥.",
  편관: "몸을 조심할 해다냥. 검진을 미루지 마라냥.",
  정관: "집안에서 어른 대접받는 해다냥. 경사가 있다냥.",
  편인: "생각이 많아지는 해다냥. 혼자 있지 말고 사람을 만나라냥.",
  정인: "자식과 주변의 도움이 드는 해다냥. 문서 일이 잘 풀린다냥.",
};

/** The year's theme read against this chart: the same 십성 helps one chart and burdens another. `i` varies the wording down a list of years. */
export function yearText(y: { god: TenGod; score: number }, i = 0, age = 0): string {
  const base = age >= 65 ? GOD_YEAR_SENIOR[y.god] : GOD_YEAR[y.god];
  const tail = y.score >= 70 ? GOOD_TAIL[i % 3] : y.score < 52 ? HEAVY_TAIL[i % 3] : "";
  return tail ? `${base} ${tail}` : base;
}

// ───────────── helpers ─────────────

export const nameOf = (full: string) => full.trim();
export const stemOf = (c: Chart) => STEM[c.dayStem];
export const dayMasterName = (c: Chart) => STEM[c.dayStem].name;

/** "병자 계사 신해 을미" + 한자. */
export const pillarsLine = (c: Chart) => c.saju.summary.pillars.map((p) => `${p.label} ${p.hangul}(${p.hanja})`).join(" · ");

export function elementsLine(c: Chart): string {
  const e = c.saju.summary.elements;
  return (Object.keys(e) as ElementKey[]).map((k) => `${elementLabel(k)[0]}${e[k]}`).join(" ");
}

export function sinsalList(c: Chart): string[] {
  const s = c.sinsal;
  return [s.dohwa && "도화살", s.yeokma && "역마살", s.hwagae && "화개살", s.hongyeom && "홍염살", s.gwiin && "천을귀인"].filter(Boolean) as string[];
}

/** The 감정 근거 table every reading opens with: the chart facts, in the trade's own terms. */
export function basisCard(c: Chart, extra: [string, string][] = []): FortuneCard {
  const { top, low } = dominantGroups(c);
  const rows: [string, string][] = [
    ["원국", c.saju.summary.pillars.map((p) => p.hanja).join(" ")],
    ["일간", `${dayMasterName(c)} · ${STEM[c.dayStem].image}`],
    ["오행", elementsLine(c)],
    ["신강·신약", c.strong ? "신강(身强)" : "신약(身弱)"],
    ["십성", `${top} 강 · ${low} 약`],
    ["용신", `${elementLabel(c.yongsin)}`],
    ["신살", sinsalList(c).join(" · ") || "특이 신살 없음"],
    ["대운", `${c.forward ? "순행" : "역행"} · 대운수 ${c.daeunSu}`],
    ...(c.blood ? ([["혈액형", `${c.blood}형`]] as [string, string][]) : []),
    ...extra,
  ];
  return {
    kind: "basis",
    rows,
    note: c.saju.summary.pillars.length < 4 ? "태어난 시를 몰라 시주(時柱)는 빼고 감정했다냥." : undefined,
  };
}

export const animalOfBranch = (b: number) => ANIMALS[b];
export const gwiinAnimals = (c: Chart) => gwiinOf(c.dayStem).map(animalOfBranch);
export const branchName = (b: number) => BRANCHES_HANGUL[b];
export const stemName = (s: number) => STEMS_HANGUL[s];

export const lines = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join("\n");
export const sec = (title: string, headline: string, body: string, bullets: string[] = []): ReportSection => ({ title, headline, body, bullets });

/** Locked preview: the section's real opening, cut mid-sentence. */
export function locked(id: string, icon: string, s: ReportSection): LockedPreview {
  const first = s.body.split("\n").find((l) => l.length > 12) ?? s.body;
  // Cut mid-thought but never mid-word: back up to the last space before ~26 characters.
  const head = first.length > 28 ? first.slice(0, first.lastIndexOf(" ", 26) > 12 ? first.lastIndexOf(" ", 26) : 26) : first;
  const cut = `${head.trim().replace(/[.!?,·]+$/, "")}…`;
  const count = s.body.split("\n").filter(Boolean).length + s.bullets.length;
  return {
    id,
    icon,
    title: s.title,
    tease: cut,
    count,
  };
}

export const scoreWord = (n: number) => (n >= 85 ? "대길(大吉)" : n >= 72 ? "길(吉)" : n >= 58 ? "평(平)" : n >= 45 ? "소흉(小凶)" : "흉(凶)");

export { josa };
export { daNyang } from "@/lib/josa";
