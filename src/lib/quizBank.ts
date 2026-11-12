/**
 * "나를 얼마나 아냥?" 퀴즈의 문제 은행. The owner answers QUIZ_LEN of these about themself; friends guess. Questions are
 * stored by id and answers by index, so wording can be polished later without breaking old quizzes ({n} = the owner).
 */
export interface QuizQ {
  id: string;
  q: string;
  options: [string, string, string, string];
}

export const QUIZ_LEN = 7;
/** a quiz takes at most this many friends' answers */
export const QUIZ_MAX_PLAYS = 100;

export const QUIZ_BANK: QuizQ[] = [
  { id: "weekend", q: "{n}의 완벽한 주말은?", options: ["🏠 집콕 넷플릭스", "🍻 약속 꽉꽉", "🚗 훌쩍 여행", "😴 밀린 잠"] },
  { id: "angry", q: "{n}가 화났을 때는?", options: ["🗣️ 바로 말한다", "🤐 조용해진다", "📴 잠수 탄다", "🍗 먹으면 풀린다"] },
  { id: "reply", q: "{n}의 연락 스타일은?", options: ["⚡ 칼답", "🐢 늦답", "📞 전화파", "👀 읽고 까먹음"] },
  { id: "snack", q: "{n}의 최애 야식은?", options: ["🍗 치킨", "🌶️ 떡볶이", "🍜 라면", "🐷 족발·보쌈"] },
  { id: "trip", q: "{n}의 여행 스타일은?", options: ["📋 분 단위 계획", "🎲 즉흥 그 자체", "🍽️ 맛집 투어", "🛏️ 숙소에서 쉬기"] },
  { id: "cat", q: "{n}가 고양이라면?", options: ["🐶 사람 좋아 개냥이", "😼 새침한 도도냥", "🍙 먹보 뚱냥이", "💨 새벽 우다다냥"] },
  { id: "clock", q: "{n}는 언제 제일 쌩쌩할까?", options: ["🌅 새벽형", "☀️ 아침형", "🌇 오후 늦게", "🦉 밤샘 올빼미"] },
  { id: "gift", q: "{n}가 제일 반기는 선물은?", options: ["💌 손편지", "🍰 먹을 것", "🧰 실용템", "💸 현금"] },
  { id: "stress", q: "{n}의 스트레스 해소법은?", options: ["🏃 운동", "🛍️ 쇼핑", "🍜 먹방", "😪 잠"] },
  { id: "chat", q: "단톡방에서 {n}의 역할은?", options: ["👏 리액션 담당", "📰 정보 담당", "👻 눈팅 담당", "🤣 드립 담당"] },
  { id: "coffee", q: "{n}의 카페 메뉴는?", options: ["🧊 아아", "🥛 라떼", "🧋 달달한 음료", "🍵 커피 안 마심"] },
  { id: "love", q: "{n}의 연애 스타일은?", options: ["🏹 직진", "🎣 밀당", "🤝 친구에서 연인", "🙅 연애 관심 없음"] },
  { id: "island", q: "무인도에 딱 하나 가져간다면 {n}는?", options: ["📱 휴대폰", "🧑‍🤝‍🧑 친구", "🍱 먹을 것", "🛏️ 침대"] },
  { id: "karaoke", q: "노래방에서 {n}는?", options: ["🎤 발라드 열창", "💃 아이돌 댄스", "🎺 트로트", "🙉 탬버린만"] },
  { id: "money", q: "갑자기 100만 원이 생기면 {n}는?", options: ["🏦 저축", "✈️ 여행", "🛍️ 쇼핑", "🍣 맛있는 거"] },
  { id: "first", q: "{n}의 첫인상은?", options: ["🧊 차가워 보임", "🐑 순해 보임", "🤪 웃겨 보임", "😠 무서워 보임"] },
  { id: "movie", q: "{n}가 좋아하는 영화 장르는?", options: ["😱 공포·스릴러", "💕 로맨스", "💥 액션", "😂 코미디"] },
  { id: "phone", q: "{n}의 휴대폰 배터리는 보통?", options: ["🔋 늘 100%", "🪫 늘 빨간불", "🔌 보조배터리 필수", "❓ 신경 안 씀"] },
  { id: "late", q: "약속 시간에 {n}는?", options: ["⏰ 10분 일찍", "✅ 딱 맞춰", "🏃 5분 늦음", "🌙 한참 늦음"] },
  { id: "season", q: "{n}가 제일 좋아하는 계절은?", options: ["🌸 봄", "🏖️ 여름", "🍂 가을", "⛄ 겨울"] },
];

export const quizQ = (id: string) => QUIZ_BANK.find((x) => x.id === id) ?? null;

/** "{n}" → the owner's name with the right particle after it (가/이, 는/은, 의 stays). */
export function quizText(q: string, name: string): string {
  const fin = (w: string) => {
    const c = w.charCodeAt(w.length - 1);
    return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : false;
  };
  return q
    .replace("{n}가", `${name}${fin(name) ? "이" : "가"}`)
    .replace("{n}는", `${name}${fin(name) ? "은" : "는"}`)
    .replace("{n}", name);
}

/** 냥신's word on a friend's score. */
export function quizVerdict(score: number, total: number): string {
  const r = total ? score / total : 0;
  if (r === 1) return "만점이다냥! 영혼의 단짝 인정 🐾";
  if (r >= 5 / 7) return "꽤 잘 아는 사이다냥. 찐친 자격 있다냥 😺";
  if (r >= 3 / 7) return "반쯤 안다냥. 밥 한 번 더 먹어라냥 🍚";
  return "처음 보는 사이냥? 지금부터 알아 가라냥 🙀";
}
