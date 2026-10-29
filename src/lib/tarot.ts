/** 오늘의 타로 한 장: the 22 major arcana, read by 냥신 (one line + today's advice). */
export interface TarotCard {
  no: string;
  name: string;
  emoji: string;
  line: string;
  advice: string;
}

export const TAROT: TarotCard[] = [
  { no: "0", name: "바보", emoji: "🎒", line: "겁 없이 첫발을 떼는 카드다냥. 계산보다 설렘이 이기는 날이다냥.", advice: "새로운 걸 하나 시작해라냥." },
  { no: "I", name: "마법사", emoji: "🪄", line: "손에 쥔 걸로 다 해낼 수 있다는 카드다냥. 재주가 빛난다냥.", advice: "미뤄 둔 아이디어를 꺼내라냥." },
  { no: "II", name: "여사제", emoji: "🌙", line: "말보다 직감이 맞는 날이다냥. 조용히 지켜보면 답이 보인다냥.", advice: "결정은 하루만 더 묵혀라냥." },
  { no: "III", name: "여황제", emoji: "🌸", line: "풍요와 사랑의 카드다냥. 베푼 만큼 돌아온다냥.", advice: "좋아하는 사람한테 먼저 챙겨 줘라냥." },
  { no: "IV", name: "황제", emoji: "👑", line: "질서와 책임의 카드다냥. 네가 판을 잡으면 정리된다냥.", advice: "할 일 목록부터 세워라냥." },
  { no: "V", name: "교황", emoji: "📿", line: "어른의 조언이 약이 되는 날이다냥.", advice: "믿는 사람한테 한 번 물어봐라냥." },
  { no: "VI", name: "연인", emoji: "💞", line: "마음이 끌리는 쪽을 고르는 카드다냥. 선택의 날이다냥.", advice: "머리 말고 마음이 가는 쪽을 골라라냥." },
  { no: "VII", name: "전차", emoji: "🐎", line: "밀고 나가면 이기는 카드다냥. 망설임이 제일 큰 적이다냥.", advice: "오늘은 직진이다냥." },
  { no: "VIII", name: "힘", emoji: "🦁", line: "부드러움이 힘을 이기는 카드다냥. 화 대신 미소가 통한다냥.", advice: "한 번만 참아라냥. 판이 바뀐다냥." },
  { no: "IX", name: "은둔자", emoji: "🏮", line: "혼자만의 시간이 답을 주는 카드다냥.", advice: "폰 내려놓고 30분 걸어라냥." },
  { no: "X", name: "운명의 수레바퀴", emoji: "🎡", line: "흐름이 바뀌는 카드다냥. 오늘 온 우연은 우연이 아니다냥.", advice: "들어온 제안은 일단 들어 봐라냥." },
  { no: "XI", name: "정의", emoji: "⚖️", line: "뿌린 대로 거두는 카드다냥. 공정하게 하면 이긴다냥.", advice: "애매한 건 숫자로 확인해라냥." },
  { no: "XII", name: "매달린 사람", emoji: "🙃", line: "멈춰서 다르게 보라는 카드다냥. 기다림이 답이다냥.", advice: "급한 결정은 내일로 미뤄라냥." },
  { no: "XIII", name: "죽음", emoji: "🥀", line: "끝이 아니라 끝맺음의 카드다냥. 하나를 정리해야 새것이 들어온다냥.", advice: "안 쓰는 거 하나 버려라냥." },
  { no: "XIV", name: "절제", emoji: "🫖", line: "균형의 카드다냥. 과하지도 모자라지도 않게가 정답이다냥.", advice: "오늘은 적당히가 최고다냥." },
  { no: "XV", name: "악마", emoji: "😈", line: "유혹의 카드다냥. 알면서 끌리는 게 하나 있지?", advice: "그거 하나만 참아라냥." },
  { no: "XVI", name: "탑", emoji: "⚡", line: "갑작스러운 변화의 카드다냥. 무너져야 새로 쌓는다냥.", advice: "계획이 틀어져도 당황하지 마라냥." },
  { no: "XVII", name: "별", emoji: "⭐", line: "희망의 카드다냥. 바라던 게 조금씩 보이기 시작한다냥.", advice: "소원 하나 적어 두라냥." },
  { no: "XVIII", name: "달", emoji: "🌕", line: "불안과 착각의 카드다냥. 보이는 게 다가 아니다냥.", advice: "확인 안 된 말은 믿지 마라냥." },
  { no: "XIX", name: "태양", emoji: "🌞", line: "성공과 기쁨의 카드다냥. 오늘은 네가 주인공이다냥.", advice: "자신 있게 앞에 서라냥." },
  { no: "XX", name: "심판", emoji: "📯", line: "다시 부르는 카드다냥. 지난 인연이나 일이 돌아온다냥.", advice: "옛 연락 하나 반갑게 받아라냥." },
  { no: "XXI", name: "세계", emoji: "🌍", line: "완성의 카드다냥. 하던 일이 마무리된다냥.", advice: "끝낸 걸 축하해라냥. 다음 판이 열린다냥." },
];

/** How a card sits in the day: bright (go), calm (steady), shadow (careful). Used to read two cards together. */
const TONE: ("bright" | "calm" | "shadow")[] = [
  "bright", // 바보
  "bright", // 마법사
  "calm", // 여사제
  "bright", // 여황제
  "calm", // 황제
  "calm", // 교황
  "bright", // 연인
  "bright", // 전차
  "calm", // 힘
  "calm", // 은둔자
  "bright", // 운명의 수레바퀴
  "calm", // 정의
  "shadow", // 매달린 사람
  "shadow", // 죽음
  "calm", // 절제
  "shadow", // 악마
  "shadow", // 탑
  "bright", // 별
  "shadow", // 달
  "bright", // 태양
  "calm", // 심판
  "bright", // 세계
];

/** Two cards read together: the day's mood (first) and today's move (second). */
export function tarotPair(a: number, b: number): { title: string; line: string } {
  const ta = TONE[a];
  const tb = TONE[b];
  const has = (t: string) => ta === t || tb === t;
  const shadow = ta === "shadow" ? TAROT[a] : TAROT[b];
  if (ta === "bright" && tb === "bright") return { title: "밀어붙여도 되는 날", line: "두 장 모두 밝은 카드다냥. 오늘은 망설이지 말고 먼저 움직여라냥." };
  if (ta === "shadow" && tb === "shadow")
    return { title: "버티면 이기는 날", line: "흔들리는 카드가 두 장이다냥. 그래도 끝이 아니라 바뀌는 중이다냥. 오늘은 버티기만 해도 이긴 거다냥." };
  if (has("bright") && has("shadow"))
    return { title: "함정 하나만 피하면 되는 날", line: `흐름은 좋은데 '${shadow.name}' 카드가 함정 하나를 알려 준다냥. 그것만 피하면 오늘은 네 편이다냥.` };
  if (has("bright")) return { title: "천천히 가도 닿는 날", line: "기운은 밝은데 속도는 천천히 가라는 날이다냥. 서두르지 않으면 원하는 데 닿는다냥." };
  if (has("shadow")) return { title: "지키는 게 버는 날", line: "조심하는 만큼 지켜지는 날이다냥. 무리한 약속과 충동은 내일로 미뤄라냥." };
  return { title: "조용히 정리하는 날", line: "차분한 카드가 두 장이다냥. 큰일보다 작은 마무리가 운을 부르는 날이다냥." };
}
