import "server-only";
import { BRANCHES_HANGUL, BRANCHES_HANJA, STEMS_HANGUL, STEMS_HANJA, computeSaju } from "./saju";

/**
 * 일주 고양이 도감 — free. The day pillar (일주) is the one pillar people compare with friends, so each of the 60 gets
 * a cat: the 천간 sets what kind of cat (숲대장냥, 촛불냥 …), the 지지 its temper (한밤의, 느긋한 …). Classic 일주 labels
 * (괴강 · 백호 · 양인 · 간여지동 · 일귀) and a 기 센 순위 over all 60 make it worth sharing.
 */

const STEM: { cat: string; icon: string; key: string; trait: string }[] = [
  { cat: "숲대장냥", icon: "🌲", key: "리더", trait: "곧게 위로만 자라는 큰 나무다냥. 한번 정하면 안 굽힌다냥. 앞에 서야 숨이 쉬어지는 사람이다냥." },
  { cat: "꽃덩굴냥", icon: "🌿", key: "끈기", trait: "바위 틈에서도 꽃을 피우는 덩굴이다냥. 부드러워 보여도 제일 끈질긴 건 너다냥." },
  { cat: "햇살냥", icon: "☀️", key: "열정", trait: "하늘의 태양이다냥. 숨기는 게 없고, 있으면 주변이 환해진다냥. 대신 식을 땐 확 식는다냥." },
  { cat: "촛불냥", icon: "🕯️", key: "따뜻함", trait: "어둠 속 촛불이다냥. 조용히 따뜻하고, 한 사람을 오래 비춘다냥. 속은 누구보다 뜨겁다냥." },
  { cat: "산신냥", icon: "⛰️", key: "듬직함", trait: "큰 산이다냥. 묵직하고 믿음직한데, 한번 버티면 아무도 못 옮긴다냥." },
  { cat: "텃밭냥", icon: "🌾", key: "포용", trait: "모든 걸 품는 밭이다냥. 사람을 키우고 챙기는데, 정작 자기 속은 잘 안 보여 준다냥." },
  { cat: "무쇠냥", icon: "⚔️", key: "결단", trait: "무쇠 칼이다냥. 결단이 빠르고 의리가 세다냥. 말이 직설이라 오해도 산다냥." },
  { cat: "보석냥", icon: "💎", key: "섬세함", trait: "갈고닦은 보석이다냥. 예민하고 기준이 높다냥. 자존심 건드리면 오래 기억한다냥." },
  { cat: "바다냥", icon: "🌊", key: "지혜", trait: "큰 바다다냥. 품이 넓고 머리가 빠르다냥. 어디로 흐를지 아무도 모른다냥." },
  { cat: "이슬냥", icon: "💧", key: "직관", trait: "새벽 이슬이다냥. 조용히 스며들어 마음을 읽는다냥. 눈치와 상상력이 남다르다냥." },
];

const BRANCH: { mood: string; key: string; trait: string; love: string }[] = [
  { mood: "한밤의", key: "밤샘 두뇌", trait: "밤에 머리가 제일 잘 돈다냥. 계산이 빠르고 비밀이 많다냥.", love: "연애에선 밀당 고수다냥. 마음은 늦게 보여 준다냥." },
  { mood: "느긋한", key: "뚝심", trait: "느려 보여도 끝까지 가는 소다냥. 한번 마음 주면 안 바뀐다냥.", love: "연애는 느린데, 한번 사귀면 오래 간다냥." },
  { mood: "용맹한", key: "용맹", trait: "호랑이 기질이다냥. 앞장서야 직성이 풀린다냥.", love: "좋으면 직진이다냥. 고백도 먼저 하는 편이다냥." },
  { mood: "새침한", key: "감각", trait: "새침하고 감각적이다냥. 분위기와 예쁜 걸 놓치지 않는다냥.", love: "설렘이 생명이다냥. 분위기에 약하다냥." },
  { mood: "꿈꾸는", key: "야망", trait: "꿈이 큰 용이다냥. 욕심도 스케일도 크다냥.", love: "연애도 큰 그림을 그린다냥. 기대가 높다냥." },
  { mood: "눈치 빠른", key: "눈치", trait: "눈치 빠르고 집요하다냥. 속으로 다 계산하고 움직인다냥.", love: "질투를 숨기지만 다 보고 있다냥." },
  { mood: "질주하는", key: "자유", trait: "멈추면 답답한 말이다냥. 열정이 넘치고 자유가 생명이다냥.", love: "불같이 빠지고, 식을 때도 빠르다냥." },
  { mood: "다정한", key: "다정", trait: "다정하고 정이 많다냥. 고집은 조용히 세다냥.", love: "챙겨 주는 연애를 한다냥. 서운함은 말 안 하고 쌓아 둔다냥." },
  { mood: "재주 많은", key: "재주", trait: "재주 많은 원숭이다냥. 머리 회전이 빠르고 금방 질린다냥.", love: "재밌는 사람한테 끌린다냥. 지루하면 끝이다냥." },
  { mood: "깔끔한", key: "완벽", trait: "깔끔하고 완벽주의다냥. 말 한마디도 정확해야 한다냥.", love: "기준이 높아 쉽게 안 빠진다냥. 빠지면 깊다냥." },
  { mood: "의리 있는", key: "의리", trait: "의리의 개다냥. 내 사람은 끝까지 지킨다냥.", love: "한 사람만 본다냥. 배신은 절대 용서 못 한다냥." },
  { mood: "태평한", key: "복", trait: "태평해 보이는 돼지다냥. 마음 넓고 복이 많다냥.", love: "다 퍼 주는 연애를 한다냥. 그래서 상처도 많다냥." },
];

const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]; // 목 화 토 금 수
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const GEN = (a: number, b: number) => (a + 1) % 5 === b; // a 생 b

const GOEGANG = ["경진", "경술", "임진", "임술", "무술"];
const BAEKHO = ["갑진", "을미", "병술", "정축", "무진", "임술", "계축"];
const YANGIN = ["병오", "무오", "임자"];
const ILGWI = ["정해", "정유", "계사", "계묘"];

const LABELS: { list: string[] | ((s: number, b: number) => boolean); name: string; line: string; power: number }[] = [
  { list: GOEGANG, name: "괴강(魁罡)", line: "괴강 일주다냥. 60일주 중 손꼽히는 센 기운이다냥. 판을 뒤집는 힘이 있다냥.", power: 6 },
  { list: BAEKHO, name: "백호(白虎)", line: "백호 일주다냥. 추진력이 무섭다냥. 일을 몰아쳐서 끝낸다냥.", power: 4 },
  { list: YANGIN, name: "양인(羊刃)", line: "양인 일주다냥. 칼을 품은 기운이라 승부에 강하다냥.", power: 5 },
  { list: (s, b) => STEM_EL[s] === BRANCH_EL[b], name: "간여지동(干與支同)", line: "간여지동 일주다냥. 위아래가 같은 기운이라 자기 확신이 단단하다냥.", power: 3 },
  { list: ILGWI, name: "일귀(日貴)", line: "일귀 일주다냥. 타고난 귀인 자리라 사람 복이 있다냥.", power: 0 },
];

const HARMONY: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };

const nameOf = (s: number, b: number) => `${STEMS_HANGUL[s]}${BRANCHES_HANGUL[b]}`;
const labelsOf = (s: number, b: number) => LABELS.filter((l) => (typeof l.list === "function" ? l.list(s, b) : l.list.includes(nameOf(s, b))));

/** 기 센 정도: 양간, 간여지동, 지지가 일간을 생함, 괴강 · 백호 · 양인. */
function power(s: number, b: number): number {
  let p = s % 2 === 0 ? 3 : 0;
  if (GEN(BRANCH_EL[b], STEM_EL[s])) p += 2;
  if (GEN(STEM_EL[s], BRANCH_EL[b])) p -= 1; // 설기
  if ((STEM_EL[s] + 2) % 5 === BRANCH_EL[b]) p -= 1; // 내가 극하는 지지 위
  if ((BRANCH_EL[b] + 2) % 5 === STEM_EL[s]) p -= 2; // 지지에 극당함
  for (const l of labelsOf(s, b)) p += l.power;
  return p;
}

const ALL = Array.from({ length: 60 }, (_, i) => ({ i, s: i % 10, b: i % 12 }));
const RANK = new Map([...ALL].sort((x, y) => power(y.s, y.b) - power(x.s, x.b) || x.i - y.i).map((x, k) => [x.i, k + 1]));

export interface IljuCard {
  no: number; // 도감 번호 1..60 (60갑자 순)
  ganji: string; // "갑자"
  hanja: string; // "甲子"
  name: string; // "한밤의 숲대장냥"
  icon: string;
  keys: string[];
  trait: string;
  love: string;
  labels: string[];
  labelLine: string | null;
  rank: number; // 기 센 순위 1..60
  rankLine: string;
  match: { ganji: string; name: string };
}

export function iljuCard(birthdate: string, birthtime = ""): IljuCard | null {
  const saju = computeSaju(birthdate, birthtime);
  if (!saju) return null;
  const day = saju.summary.pillars.find((p) => p.label === "일주");
  if (!day) return null;
  const s = STEMS_HANJA.indexOf(day.hanja[0]);
  const b = BRANCHES_HANJA.indexOf(day.hanja[1]);
  if (s < 0 || b < 0) return null;
  const i = ALL.find((x) => x.s === s && x.b === b)!.i;
  const rank = RANK.get(i)!;
  const labels = labelsOf(s, b);
  const ms = (s + 5) % 10;
  const mb = HARMONY[b];
  return {
    no: i + 1,
    ganji: nameOf(s, b),
    hanja: `${STEMS_HANJA[s]}${BRANCHES_HANJA[b]}`,
    name: `${BRANCH[b].mood} ${STEM[s].cat}`,
    icon: STEM[s].icon,
    keys: [STEM[s].key, BRANCH[b].key, labels[0]?.name.replace(/\(.*\)/, "") ?? (s % 2 === 0 ? "양(陽)의 기운" : "음(陰)의 기운")],
    trait: `${STEM[s].trait} ${BRANCH[b].trait}`,
    love: BRANCH[b].love,
    labels: labels.map((l) => l.name),
    labelLine: labels[0]?.line ?? null,
    rank,
    rankLine:
      rank <= 6
        ? "60일주 중 최상위권이다냥. 건드리면 큰일 나는 기운이다냥 😼"
        : rank <= 20
          ? "기가 센 편이다냥. 밀어붙이는 힘이 있다냥."
          : rank <= 40
            ? "딱 중간이다냥. 필요할 때만 꺼내는 힘이다냥."
            : rank <= 54
              ? "기가 순한 편이다냥. 대신 오래 가는 힘이 있다냥."
              : "60일주 중 제일 순한 쪽이다냥. 부드러운 게 이기는 법이다냥.",
    match: { ganji: nameOf(ms, mb), name: `${BRANCH[mb].mood} ${STEM[ms].cat}` },
  };
}
