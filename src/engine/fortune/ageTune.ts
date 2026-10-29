import "server-only";

/**
 * The year/month lines are written for working adults ("승진·이직·연봉"). A teenager or a retiree reads the same 십성,
 * but it shows up in a different life: these swaps keep the meaning and change the setting. Applied to every line of a
 * reading whose subject is that age now (not to 대운, whose decades each have their own age).
 */
const STUDENT: [string, string][] = [
  ["승진·합격·결혼 같은 '자리'", "합격·임원·상 같은 '자리'"],
  ["공부·이직·전환", "공부·진로·전환"],
  ["원서·면접·승진 얘기는", "원서·면접·시험 얘기는"],
  ["승진·연봉·계약처럼 이름을 거는 돈", "상금·장학금·용돈처럼 이름을 거는 돈"],
  ["소개·직장에서 만난다냥", "학교·학원에서 만난다냥"],
  ["일·직장에서 만난다냥", "학교·동아리에서 만난다냥"],
  ["이사·이직·관계 변화", "이사·전학·관계 변화"],
  ["이동·출장·이직 기운", "이동·여행·전학 기운"],
  ["이직 경쟁·평가에서 이기려면 실적을 숫자로 보여라냥", "시험·대회에서 이기려면 실력을 점수로 보여라냥"],
  ["이직·전업 생각이 커지는데, 홧김에 그만두지는 마라냥", "진로를 바꾸고 싶어지는데, 홧김에 정하지는 마라냥"],
  ["연봉 협상은 올해 해라냥", "목표는 올해 한 단계 높여 잡아라냥"],
  ["큰 프로젝트·시험·조직 개편 같은 도전이 온다냥. 피하지 말고 정면으로 받으면 승진 운이다냥", "큰 시험·대회 같은 도전이 온다냥. 피하지 말고 정면으로 받으면 합격 운이다냥"],
  ["승진·합격·발탁 운이다냥", "합격·발탁 운이다냥"],
  ["독립·창업·프리랜서 생각이 커진다냥", "내 길을 내 손으로 정하고 싶어진다냥"],
  ["'정관(명예·직장)'", "'정관(명예·학업)'"],
  ["명예·직장의 기운", "명예·학업의 기운"],
  ["그래서 끌린 사람들과는 끝까지 못 갔던 거다냥.", "그래서 설레는 사람과 오래갈 사람이 다를 수 있다냥."],
];

const SENIOR: [string, string][] = [
  ["학원·스터디·학교에서 만난다냥", "강좌·문화센터·배움 모임에서 만난다냥"],
  ["승진·합격·결혼 같은 '자리'", "감투·인정·집안 경사 같은 '자리'"],
  ["공부·이직·전환", "배움·취미·전환"],
  ["원서·면접·승진 얘기는", "부탁·계약·감투 얘기는"],
  ["승진·연봉·계약처럼 이름을 거는 돈", "연금·계약·문서처럼 이름을 거는 돈"],
  ["소개·직장에서 만난다냥", "소개·모임에서 만난다냥"],
  ["이사·이직·관계 변화", "이사·관계 변화"],
  ["이동·출장·이직 기운", "이동·여행 기운"],
];

function swap(text: string, table: [string, string][]): string {
  let out = text;
  for (const [from, to] of table) if (out.includes(from)) out = out.replaceAll(from, to);
  return out;
}

function deep<T>(v: T, f: (s: string) => string): T {
  if (typeof v === "string") return f(v) as T;
  if (Array.isArray(v)) return v.map((x) => deep(x, f)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x, f)])) as T;
  return v;
}

/** 한국 나이 under 20 → school life, 65 and over → retired life; everyone else unchanged. */
export function tuneForAge<T>(reading: T, koreanAge: number): T {
  const table = koreanAge < 20 ? STUDENT : koreanAge >= 65 ? SENIOR : null;
  return table ? deep(reading, (s) => swap(s, table)) : reading;
}
