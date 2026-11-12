import "server-only";
import type { ElementKey } from "@/models/types";
import { iljuCard } from "./ilju";
import { josa } from "@/lib/josa";
import { ANIMALS, GENERATES, SAMHAP, branchRelation, computeSaju, stemRelation } from "./saju";

/**
 * 단톡방 케미표 — free. Everyone in a group chat puts in a name and a birthday; every pair gets a 케미 score from the
 * 사주 alone (일간끼리의 관계 · 일지 합충 · 띠 · 서로 모자란 오행을 채우는지). Friendship, not romance: 충 reads as
 * 투닥투닥, 극 as 티키타카. The same two birthdays always give the same score.
 */

export interface ChemPerson {
  name: string;
  birthdate: string;
}

export interface ChemMember {
  name: string;
  cat: string;
  icon: string;
  animal: string;
  role: string;
}

export interface ChemPair {
  a: number;
  b: number;
  score: number;
  label: string;
  line: string;
}

export interface ChemRoomView {
  members: ChemMember[];
  pairs: ChemPair[];
  best: ChemPair | null;
  rival: ChemPair | null;
  /** highest average 케미 */
  mood: { member: number; avg: number } | null;
  /** looks after the most people (the others' day masters are fed by theirs) */
  carer: { member: number; count: number } | null;
}

const ROLE: Record<ElementKey, string> = {
  wood: "🌱 아이디어 뱅크",
  fire: "🔥 텐션 담당",
  earth: "🏔️ 중재자",
  metal: "⚔️ 결정권자",
  water: "🌊 정보통",
};

const sameTrio = (a: number, b: number) => a !== b && SAMHAP.some((g) => g.includes(a) && g.includes(b));
/** 0..9, stable per pair of names (order doesn't matter), so ties don't all look alike */
function nameSalt(x: string, y: string): number {
  const s = [x, y].sort().join("|");
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 10;
}

type Saju = NonNullable<ReturnType<typeof computeSaju>>;

function pairOf(pa: ChemPerson, sa: Saju, pb: ChemPerson, sb: Saju): Omit<ChemPair, "a" | "b"> {
  const stem = stemRelation(sa.dm, sb.dm);
  const day = branchRelation(sa.dm.branch, sb.dm.branch);
  const year = branchRelation(sa.dm.yearBranch, sb.dm.yearBranch);
  const strongest = (s: Saju) => (Object.entries(s.summary.elements) as [ElementKey, number][]).sort((x, y) => y[1] - x[1])[0][0];
  const fills = (sa.summary.lacking === strongest(sb) ? 1 : 0) + (sb.summary.lacking === strongest(sa) ? 1 : 0);

  let score = 68;
  score += { combine: 16, iGenerate: 9, theyGenerate: 9, same: 6, iControl: 1, theyControl: 1 }[stem];
  score += day === "harmony" ? 9 : day === "clash" ? -12 : sameTrio(sa.dm.branch, sb.dm.branch) ? 5 : 0;
  score += year === "harmony" ? 4 : year === "clash" ? -4 : sameTrio(sa.dm.yearBranch, sb.dm.yearBranch) ? 3 : 0;
  score += fills * 4;
  score += nameSalt(pa.name, pb.name) - 4;
  score = Math.max(41, Math.min(99, Math.round(score)));

  const A = pa.name;
  const B = pb.name;
  if (day === "clash")
    return { score, label: "😼 투닥투닥 앙숙", line: `${josa(A, "이랑/랑")} ${josa(B, "은/는")} 일지가 충(沖)이다냥. 만나면 투닥대는데, 이상하게 안 보면 궁금한 사이다냥.` };
  if (stem === "combine")
    return { score, label: "💞 찰떡궁합", line: `일간이 합(合)이다냥. 말 안 해도 통하는 사이다냥. 둘이 붙어 있으면 단톡방이 조용해진다냥.` };
  if (day === "harmony") return { score, label: "🤝 단짝", line: `일지가 육합이다냥. 같이 있으면 편하고, 연락 안 해도 서운하지 않은 사이다냥.` };
  if (stem === "iGenerate" || stem === "theyGenerate") {
    const giver = stem === "iGenerate" ? A : B;
    const taker = stem === "iGenerate" ? B : A;
    return { score, label: "🍚 챙겨 주는 사이", line: `${giver}의 기운이 ${josa(taker, "을/를")} 키워 준다냥. ${josa(giver, "이/가")} 밥 사고 ${josa(taker, "이/가")} 리액션하는 사이다냥.` };
  }
  if (fills > 0) return { score, label: "🧩 빈칸 채우는 사이", line: `서로 모자란 오행을 채워 준다냥. 성격은 달라도 같이 있으면 일이 된다냥.` };
  if (stem === "same") return { score, label: "🪞 거울 친구", line: `같은 오행의 일간이다냥. 생각하는 게 비슷해서 편한데, 고집도 똑같다냥.` };
  return { score, label: "⚡ 티키타카", line: `한쪽이 한쪽을 극(剋)하는 사이다냥. 말다툼처럼 보여도 대화가 제일 재밌는 조합이다냥.` };
}

export function chemRoom(people: ChemPerson[]): ChemRoomView {
  const charts = people.map((p) => computeSaju(p.birthdate));
  const members: ChemMember[] = people.map((p, i) => {
    const s = charts[i];
    const c = iljuCard(p.birthdate);
    return {
      name: p.name,
      cat: c?.name ?? "고양이",
      icon: c?.icon ?? "🐈",
      animal: s ? ANIMALS[s.dm.yearBranch] : "",
      role: s ? ROLE[s.dm.element] : "",
    };
  });
  const pairs: ChemPair[] = [];
  const carers = people.map(() => 0);
  for (let a = 0; a < people.length; a++)
    for (let b = a + 1; b < people.length; b++) {
      const sa = charts[a];
      const sb = charts[b];
      if (!sa || !sb) continue;
      pairs.push({ a, b, ...pairOf(people[a], sa, people[b], sb) });
      if (GENERATES[sa.dm.element] === sb.dm.element) carers[a]++;
      if (GENERATES[sb.dm.element] === sa.dm.element) carers[b]++;
    }
  pairs.sort((x, y) => y.score - x.score || x.a - y.a || x.b - y.b);
  const best = pairs[0] ?? null;
  const low = pairs.length > 1 ? pairs[pairs.length - 1] : null;
  const rival = low && (low.score < 72 || low.label.includes("앙숙")) ? low : null;
  let mood: ChemRoomView["mood"] = null;
  if (people.length >= 3) {
    const avg = people.map((_, i) => {
      const mine = pairs.filter((p) => p.a === i || p.b === i);
      return mine.length ? mine.reduce((s, p) => s + p.score, 0) / mine.length : 0;
    });
    const top = avg.indexOf(Math.max(...avg));
    mood = { member: top, avg: Math.round(avg[top]) };
  }
  const most = Math.max(0, ...carers);
  const carer = people.length >= 3 && most >= 2 ? { member: carers.indexOf(most), count: most } : null;
  return { members, pairs, best, rival, mood, carer };
}
