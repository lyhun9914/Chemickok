import type { FortuneMode } from "@/models/types";
import type { InterviewQuestion } from "./interview";

/**
 * 사주·운세 점괘의 면담 질문 — 실제 점집에서 묻는 것들. The server reads each answer against the chart
 * (engine/fortune). Option ids are stable keys; labels and reacts can be reworded freely.
 * "{p}" is the other person's name (재회운).
 */

const SAJU: InterviewQuestion[] = [
  {
    id: "sj1",
    short: "뭐가 제일 궁금해서 왔냥?",
    ask: ["사주 보러 온 사람은 다 이유가 있다냥.", "뭐가 제일 궁금해서 왔냥?"],
    options: [
      { id: "money", label: "💰 돈·재물", react: "돈이구냥. 사주에 돈 들어오는 길이 다 적혀 있다냥.", mood: "smug" },
      { id: "work", label: "💼 일·진로", react: "일이구냥. 맞는 자리가 따로 있다냥." },
      { id: "love", label: "💞 연애·결혼", react: "결국 사람이구냥. 배우자 자리부터 보겠다냥.", mood: "smug" },
      { id: "people", label: "🧑‍🤝‍🧑 사람 관계", react: "사람한테 지쳤구냥… 얼굴에 써 있다냥.", mood: "wow" },
      { id: "health", label: "🩺 건강", react: "몸이 먼저다냥. 약한 데가 어딘지 보인다냥." },
      { id: "life", label: "🧭 내 인생 전체", react: "통째로 보자는 거구냥. 좋다냥, 다 펼쳐 주겠다냥.", mood: "happy" },
    ],
  },
  {
    id: "sj2",
    short: "지금 무슨 일 하냥?",
    ask: ["지금 무슨 일 하냥? 사주가 맞는 옷을 입고 있는지 보려는 거다냥."],
    options: [
      { id: "office", label: "🏢 회사·조직에 다닌다", react: "조직 생활이구냥. 흠…", minAge: 18 },
      { id: "biz", label: "🧾 내 사업·장사", react: "자기 장사구냥. 배짱이 있구냥.", mood: "wow", minAge: 18 },
      { id: "free", label: "🎨 프리랜서·예술·전문직", react: "자기 재주로 먹고사는구냥.", mood: "happy", minAge: 18 },
      { id: "study", label: "📚 학생·취업 준비", react: "아직 판을 짜는 중이구냥. 지금이 중요하다냥." },
      { id: "home", label: "🏠 집안일·육아", react: "집을 지키는 일이구냥. 그게 제일 고된 거다냥.", minAge: 20 },
      { id: "rest", label: "🔄 쉬는 중·옮기는 중", react: "갈림길이구냥. 그래서 왔구냥.", mood: "wow", minAge: 18 },
      { id: "retired", label: "🌇 은퇴하고 노후를 보내는 중", react: "한 고비를 다 넘겼구냥. 이제부터가 진짜 네 시간이다냥.", mood: "happy", minAge: 50 },
    ],
  },
  {
    id: "sj3",
    short: "형제 중 몇째냥?",
    ask: ["형제 중에 몇째냥? 점집에서 괜히 묻는 거 아니다냥."],
    options: [
      { id: "first", label: "👑 첫째·장남·장녀", react: "맏이구냥. 어릴 때부터 짐이 많았겠다냥." },
      { id: "middle", label: "🥪 중간", react: "가운데구냥. 눈치가 빠를 수밖에 없다냥.", mood: "smug" },
      { id: "last", label: "🍼 막내", react: "막내구냥. 그런데 사주는… 이따 말하겠다냥.", mood: "smug" },
      { id: "only", label: "🧍 외동", react: "혼자 컸구냥. 혼자가 편한 이유가 있다냥." },
      { id: "complex", label: "🔀 복잡하다 (이복·재혼 등)", react: "…말 안 해도 된다냥. 냥신은 다 안다냥.", mood: "wow" },
    ],
  },
  {
    id: "sj4",
    short: "요즘 몸에서 제일 신경 쓰이는 곳은?",
    ask: ["요즘 몸에서 제일 신경 쓰이는 데가 어디냥?"],
    options: [
      { id: "wood", label: "👀 눈 피로·목·어깨 뭉침", react: "뭉친 게 많구냥. 참는 게 버릇이다냥." },
      { id: "fire", label: "❤️ 두근거림·잠 설침·혈압", react: "속에 불이 있구냥. 화를 삼키지?", mood: "wow" },
      { id: "earth", label: "🍚 소화·위장", react: "걱정을 배로 하는구냥." },
      { id: "metal", label: "🫁 기관지·비염·피부", react: "예민하구냥. 공기부터 다르게 느끼는 사람이다냥." },
      { id: "water", label: "🦴 허리·관절·몸이 잘 붓는다", react: "아래가 약하구냥. 오래 버틴 몸이다냥." },
      { id: "none", label: "💪 딱히 없다", react: "튼튼하구냥. 그래도 사주는 따로 말한다냥.", mood: "smug" },
    ],
  },
  {
    id: "sj5",
    short: "돈이 들어오면 어디로 새냥?",
    ask: ["돈 얘기 좀 하자냥.", "돈이 들어오면 보통 어디로 새냥?"],
    options: [
      { id: "self", label: "🛍️ 나한테 쓴다 (옷·먹는 것·취미)", react: "자기한테 쓰는구냥. 나쁘지 않다냥.", mood: "happy" },
      { id: "others", label: "👨‍👩‍👧 가족이나 남한테 나간다", react: "베푸는 팔자구냥… 그래서 안 모이지?", mood: "wow" },
      { id: "invest", label: "📈 투자·사업에 넣는다", react: "굴리는구냥. 판이 크다냥.", minAge: 20 },
      { id: "save", label: "🏦 일단 모은다", react: "모으는구냥. 그런데 왜 불안하냥?", mood: "smug" },
      { id: "debt", label: "🧾 빚·대출 갚는 데 다 나간다", react: "갚느라 숨이 차구냥… 언제 끝나는지 보인다냥.", mood: "wow", minAge: 20 },
      { id: "leak", label: "🕳️ 어디로 가는지 모르게 샌다", react: "새는구냥… 구멍이 어딘지 보인다냥.", mood: "wow" },
    ],
  },
  {
    id: "sj6",
    short: "사람들이 너한테 제일 많이 하는 말은?",
    ask: ["사람들이 너한테 제일 많이 하는 말이 뭐냥?"],
    options: [
      { id: "stubborn", label: "🪨 고집 세다", react: "고집이구냥. 그게 네 무기다냥.", mood: "smug" },
      { id: "kind", label: "🕊️ 착하다·여리다", react: "착하다는 말… 사실 지겹지?", mood: "wow" },
      { id: "sharp", label: "📐 똑 부러진다", react: "칼 같구냥. 대신 속은 물렁하지?", mood: "smug" },
      { id: "bright", label: "☀️ 밝다·웃기다", react: "밝구냥. 근데 혼자 있을 땐 다르지?", mood: "wow" },
      { id: "mystery", label: "🌫️ 속을 모르겠다", react: "속을 안 보여 주는구냥. 냥신한텐 다 보인다냥.", mood: "smug" },
      { id: "solid", label: "🛡️ 든든하다", react: "기대는 사람이 많구냥. 너는 누구한테 기대냥?" },
    ],
  },
  {
    id: "sj7",
    short: "올해 큰일이 있었냥?",
    ask: ["올해 큰일 있었냥? 냥신이 맞혀 볼까 하다가 그냥 묻는다냥 😼"],
    options: [
      { id: "move", label: "🚚 이사했다", react: "자리를 옮겼구냥. 그럴 해였다냥.", mood: "wow" },
      { id: "job", label: "💼 일이 바뀌었다 (이직·퇴사·창업)", react: "일이 흔들렸구냥.", mood: "wow", minAge: 18 },
      { id: "breakup", label: "💔 사람과 끝났다", react: "…끝난 인연이 있었구냥." },
      { id: "meet", label: "💍 좋은 인연을 만났다", react: "들어온 인연이 있구냥.", mood: "happy" },
      { id: "loss", label: "💸 큰돈이 나갔다·손해를 봤다", react: "돈이 빠져나갔구냥. 그럴 해였다냥.", mood: "wow", minAge: 18 },
      { id: "sick", label: "🩹 아팠거나 다쳤다", react: "몸이 먼저 알았구냥." },
      { id: "family", label: "🕯️ 집안에 큰일이 있었다", react: "…집안 일이구냥. 네가 제일 많이 짊어졌겠다냥.", mood: "wow" },
      { id: "calm", label: "🌫️ 별일 없었다", react: "조용한 해였구냥. 폭풍 전엔 늘 조용하다냥.", mood: "smug" },
    ],
  },
  {
    id: "sj8",
    short: "지금 네 인생, 계절로 치면?",
    ask: ["마지막이다냥. 지금 네 인생을 계절로 치면?"],
    options: [
      { id: "spring", label: "🌱 봄 — 이제 막 시작하는 느낌", react: "싹이 나는 때구냥.", mood: "happy" },
      { id: "summer", label: "☀️ 한여름 — 한창 바쁘고 뜨겁다", react: "한창이구냥.", mood: "happy" },
      { id: "autumn", label: "🍂 가을 — 정리하고 거두는 중", react: "거두는 때구냥." },
      { id: "winter", label: "❄️ 한겨울 — 버티는 중", react: "…버티고 있구냥. 이제 다 봤다냥.", mood: "wow" },
      { id: "between", label: "🌪️ 환절기 — 다 바뀌는 중", react: "바뀌는 중이구냥. 그래서 흔들리는 거다냥.", mood: "wow" },
    ],
  },
];

/** Only the ages someone has actually lived through are offered (the client filters by 한국 나이). */
const AGE_SPANS = [
  { id: "child", label: "🧸 어린 시절", minAge: 8 },
  { id: "teen", label: "🎒 10대", minAge: 13 },
  { id: "early20", label: "🎓 20대 초반", minAge: 21, maxAge: 34 },
  { id: "late20", label: "💼 20대 후반", minAge: 26, maxAge: 34 },
  { id: "20s", label: "🎓 20대", minAge: 35 },
  { id: "30s", label: "🏠 30대", minAge: 31 },
  { id: "40s", label: "🌗 40대", minAge: 41 },
  { id: "50s", label: "🍂 50대", minAge: 51 },
  { id: "60s", label: "🌙 60대 이후", minAge: 61 },
];

const DAEUN: InterviewQuestion[] = [
  {
    id: "du1",
    short: "살면서 제일 힘들었던 때는?",
    ask: ["대운은 10년마다 바뀌는 큰 물줄기다냥. 지나온 길부터 맞춰 보겠다냥.", "살면서 제일 힘들었던 때가 언제냥?"],
    options: [
      ...AGE_SPANS.map((a) => ({ ...a, react: "그때구냥… 기억해 두겠다냥." })),
      { id: "none", label: "🌤️ 크게 힘든 적은 없었다", react: "아직이구냥. 흠…", mood: "smug" as const },
    ],
  },
  {
    id: "du2",
    short: "제일 잘 풀렸던 때는?",
    ask: ["반대로 제일 잘 풀렸던 때는?"],
    options: [
      ...AGE_SPANS.map((a) => ({ ...a, react: "그때구냥. 대운이 맞는지 보겠다냥." })),
      { id: "yet", label: "⏳ 아직 안 왔다", react: "아직 안 왔다… 그럼 언제 오는지 알려 주겠다냥.", mood: "smug" as const },
    ],
  },
  {
    id: "du7",
    short: "인생이 확 바뀐 때는?",
    ask: ["이사·이직·이별·결혼… 인생 판이 확 바뀐 때가 있었지?", "그게 언제였냥?"],
    options: [
      ...AGE_SPANS.map((a) => ({ ...a, react: "그때구냥… 대운표랑 맞춰 보겠다냥.", mood: "wow" as const })),
      { id: "none", label: "🌫️ 아직 크게 바뀐 적은 없다", react: "아직이구냥. 그럼 앞으로 올 때를 알려 주겠다냥.", mood: "smug" as const },
    ],
  },
  {
    id: "du9",
    short: "어릴 때 집안 분위기는?",
    ask: ["첫 대운은 집안 운으로 나타난다냥.", "어릴 때 집안 분위기는 어땠냥?"],
    options: [
      { id: "warm", label: "🏡 화목하고 넉넉한 편이었다", react: "든든하게 컸구냥.", mood: "happy" },
      { id: "plain", label: "🙂 평범했다", react: "무난하게 컸구냥." },
      { id: "hard", label: "🧱 형편이 어려웠다", react: "…일찍 철이 들었겠구냥.", mood: "wow" },
      { id: "tense", label: "⚡ 부모님 일로 시끄러웠다", react: "눈치 보며 컸구냥… 기억해 두겠다냥.", mood: "wow" },
      { id: "alone", label: "🚶 일찍부터 혼자 컸다", react: "혼자 서는 법을 일찍 배웠구냥." },
    ],
  },
  {
    id: "du3",
    short: "최근 3년은 어땠냥?",
    ask: ["최근 3년, 어땠냥?"],
    options: [
      { id: "up", label: "📈 조금씩 올라가는 중", react: "올라가는 중이구냥.", mood: "happy" },
      { id: "down", label: "📉 계속 꼬이고 막힌다", react: "막혔구냥… 이유가 있다냥.", mood: "wow" },
      { id: "wave", label: "🎢 오르락내리락 정신없다", react: "롤러코스터구냥." },
      { id: "flat", label: "😐 제자리걸음", react: "멈춘 느낌이구냥. 그게 제일 답답하지?" },
      { id: "turn", label: "🔄 인생이 통째로 바뀌었다", react: "판이 바뀌었구냥. 대운이 바뀐 거다냥.", mood: "wow" },
    ],
  },
  {
    id: "du8",
    short: "지금 제일 무거운 짐은?",
    ask: ["지금 어깨에 제일 무거운 짐 하나만 골라라냥."],
    options: [
      { id: "money", label: "💸 돈", react: "돈이 무겁구냥. 언제 풀리는지 보자냥.", mood: "wow" },
      { id: "work", label: "💼 일·진로", react: "갈 길이 무겁구냥." },
      { id: "people", label: "👥 사람·관계", react: "사람 때문이구냥… 그게 제일 지친다냥.", mood: "wow" },
      { id: "health", label: "🩺 건강", react: "몸이 먼저다냥." },
      { id: "family", label: "🏠 가족", react: "식구 일이구냥. 내 일보다 무겁지." },
      { id: "mind", label: "🌫️ 마음·불안", react: "마음이 무겁구냥… 이유가 대운에 있다냥.", mood: "smug" },
    ],
  },
  {
    id: "du4",
    short: "지금 앞에 놓인 큰 결정은?",
    ask: ["지금 앞에 큰 결정이 하나 있지? 뭐냥?"],
    options: [
      { id: "job", label: "💼 취업·이직·창업", react: "일이구냥. 시기가 중요하다냥.", minAge: 17 },
      { id: "home", label: "🏠 이사·집 문제", react: "자리를 옮기는 거구냥.", minAge: 18 },
      { id: "love", label: "💍 결혼·이별", react: "사람이구냥… 신중해야 한다냥.", mood: "wow", minAge: 18 },
      { id: "money", label: "💰 투자·큰돈", react: "큰돈이구냥. 때를 잘 봐야 한다냥.", mood: "smug", minAge: 20 },
      { id: "study", label: "🎓 진학·공부·자격증·유학", react: "배우는 거구냥. 좋다냥.", mood: "happy" },
      { id: "family", label: "👨‍👩‍👧 가족 일", react: "식구 일이구냥. 네 운이 식구 운이다냥." },
      { id: "retire", label: "🌇 은퇴·노후 준비", react: "다음 판을 짜는구냥. 때가 중요하다냥.", minAge: 45 },
      { id: "none", label: "🍃 딱히 없다", react: "없다… 곧 생길 거다냥.", mood: "smug" },
    ],
  },
  {
    id: "du10",
    short: "살면서 끌어 준 사람은?",
    ask: ["살면서 너를 끌어 준 사람이 있었냥?"],
    options: [
      { id: "parent", label: "👪 부모님", react: "부모 덕이 있구냥." },
      { id: "mentor", label: "🧑‍🏫 스승·선배·상사", react: "윗사람 복이구냥.", mood: "happy" },
      { id: "partner", label: "💞 연인·배우자", react: "짝 덕이 있구냥.", mood: "happy" },
      { id: "friend", label: "🤝 친구·동료", react: "옆 사람 복이구냥." },
      { id: "none", label: "🧍 없다, 다 혼자 했다", react: "…혼자 버텼구냥. 이제 올 사람을 알려 주겠다냥.", mood: "wow" },
    ],
  },
  {
    id: "du5",
    short: "앞으로 10년, 제일 원하는 건?",
    ask: ["앞으로 10년, 딱 하나만 가질 수 있다면?"],
    options: [
      { id: "money", label: "💰 돈", react: "돈이구냥. 솔직해서 좋다냥.", mood: "happy" },
      { id: "honor", label: "🏆 인정·명예", react: "이름을 남기고 싶구냥." },
      { id: "family", label: "🏡 가정·안정", react: "편안한 집이구냥." },
      { id: "free", label: "✈️ 자유", react: "얽매이기 싫구냥.", mood: "smug" },
      { id: "health", label: "🩺 건강", react: "다 잃어 봐서 아는구냥…", mood: "wow" },
      { id: "love", label: "💞 사랑", react: "결국 사랑이구냥.", mood: "happy" },
    ],
  },
  {
    id: "du6",
    short: "운이 안 좋을 때 너는?",
    ask: ["운이 안 좋을 때 너는 어떻게 하냥?"],
    options: [
      { id: "endure", label: "🧱 이 악물고 버틴다", react: "버티는 사람이구냥." },
      { id: "change", label: "🏃 판을 아예 바꾼다", react: "갈아엎는구냥.", mood: "wow" },
      { id: "lean", label: "🙏 사람한테 기댄다", react: "사람 복이 있어야 하는 팔자구냥." },
      { id: "fortune", label: "🔮 점 보러 간다", react: "…그래서 여기 왔구냥 😼", mood: "smug" },
      { id: "hide", label: "😴 숨어서 쉰다", react: "동굴로 들어가는구냥." },
    ],
  },
];

const REUNION: InterviewQuestion[] = [
  {
    id: "rq1",
    short: "누가 먼저 끝내자고 했냥?",
    ask: ["…앉아라냥. 끝난 얘기부터 하자냥.", "누가 먼저 끝내자고 했냥?"],
    options: [
      { id: "me", label: "🙋 내가 먼저", react: "네가 끝냈는데 여기 왔구냥… 흠.", mood: "wow" },
      { id: "them", label: "🫵 {p:이/가} 먼저", react: "{p:이/가} 놓았구냥." },
      { id: "both", label: "🤝 둘이 합의하고", react: "좋게 끝냈구냥. 그래도 못 잊었구냥." },
      { id: "fade", label: "🌫️ 흐지부지 끝났다", react: "끝맺음이 없었구냥. 그래서 더 남는 거다냥.", mood: "wow" },
      { id: "ghost", label: "👻 갑자기 연락이 끊겼다", react: "…잠수구냥. 그건 끝난 게 아니다냥.", mood: "smug" },
    ],
  },
  {
    id: "rq2",
    short: "헤어진 지 얼마나 됐냥?",
    ask: ["헤어진 지 얼마나 됐냥?"],
    options: [
      { id: "w1", label: "⏱️ 일주일도 안 됐다", react: "아직 뜨겁구냥." },
      { id: "m1", label: "📅 한 달 안쪽", react: "한 달… 제일 흔들릴 때다냥.", mood: "wow" },
      { id: "m3", label: "🗓️ 석 달 안쪽", react: "석 달이구냥. 그쪽도 생각날 때다냥.", mood: "smug" },
      { id: "y1", label: "🍂 1년 안쪽", react: "꽤 지났구냥." },
      { id: "long", label: "🕰️ 1년이 넘었다", react: "오래 품고 있었구냥…", mood: "wow" },
    ],
  },
  {
    id: "rq3",
    short: "진짜 이유는 뭐였냥?",
    ask: ["겉으로 말한 이유 말고, 진짜 이유는 뭐였냥?"],
    options: [
      { id: "fight", label: "🗯️ 싸움이 반복돼서", react: "같은 싸움이 돌았구냥." },
      { id: "cool", label: "🧊 마음이 식어서", react: "식었구냥… 누가 먼저 식었는지 보이냥?", mood: "wow" },
      { id: "third", label: "👤 다른 사람이 생겨서", react: "…제3자구냥.", mood: "wow" },
      { id: "real", label: "🏠 현실 문제 (거리·돈·집안)", react: "마음은 있는데 상황이 막았구냥." },
      { id: "talk", label: "📵 연락·표현 문제 (서운함이 쌓여서)", react: "말이 안 통했구냥. 그건 고칠 수 있다냥.", mood: "smug" },
      { id: "mine", label: "🙇 내 실수·잘못 때문에", react: "네 탓이라고 생각하는구냥… 그래서 더 못 놓는 거다냥.", mood: "wow" },
      { id: "nowhy", label: "🤐 이유를 제대로 못 들었다", react: "이유도 없이… 그게 제일 아프다냥.", mood: "wow" },
    ],
  },
  {
    id: "rq4",
    short: "헤어진 뒤 연락은?",
    ask: ["헤어진 뒤로 연락은?"],
    options: [
      { id: "none", label: "📵 한 번도 없었다", react: "서로 버티는 중이구냥." },
      { id: "noreply", label: "📨 내가 했는데 답이 없다", react: "…답이 없구냥. 그것도 답이다냥, 지금은.", mood: "wow" },
      { id: "some", label: "💬 가끔 안부는 주고받는다", react: "줄이 안 끊겼구냥.", mood: "smug" },
      { id: "they", label: "📲 {p:이/가} 먼저 연락해 왔다", react: "오호… {p:이/가} 먼저 왔구냥.", mood: "wow" },
      { id: "blocked", label: "🚫 차단당했다", react: "차단… 그래도 냥신은 본다냥." },
    ],
  },
  {
    id: "rq5",
    short: "{p}의 SNS는 지금?",
    ask: ["{p}의 SNS, 지금 어떻냥? 다 보고 있는 거 안다냥 😼"],
    options: [
      { id: "watch", label: "👀 내 스토리를 본다", react: "보고 있구냥… 그건 신호다냥.", mood: "wow" },
      { id: "erase", label: "🗑️ 나를 지웠다·언팔했다", react: "지웠구냥. 지운다는 건 아직 신경 쓴다는 거다냥.", mood: "smug" },
      { id: "new", label: "💑 새 사람 흔적이 있다", react: "…새 사람이구냥." },
      { id: "quiet", label: "🌫️ 아무것도 안 올린다", react: "숨었구냥." },
      { id: "dunno", label: "🙈 안 본다·볼 수 없다", react: "안 보는 것도 용기다냥." },
    ],
  },
  {
    id: "rq6",
    short: "얼마나 만났냥?",
    ask: ["얼마나 만났냥?"],
    options: [
      { id: "short", label: "🌱 3개월이 안 된다", react: "짧았구냥. 그래서 더 아쉽지?" },
      { id: "year", label: "🌿 3개월에서 1년", react: "정이 막 들 때였구냥." },
      { id: "mid", label: "🌳 1년에서 3년", react: "깊게 엉킨 사이구냥." },
      { id: "long", label: "🏔️ 3년이 넘는다", react: "청춘을 같이 보냈구냥…", mood: "wow" },
      { id: "again", label: "🔁 (기간 상관없이) 헤어졌다 다시 만난 적 있다", react: "돌아온 적이 있구냥. 패턴이 있다냥.", mood: "smug" },
    ],
  },
  {
    id: "rq7",
    short: "다시 만나면, 달라질 수 있냥?",
    ask: ["냉정하게 묻겠다냥. 다시 만나면 달라질 수 있냥?"],
    options: [
      { id: "me", label: "🔧 내가 바뀔 수 있다", react: "그 말, 기억해 두겠다냥." },
      { id: "them", label: "🫵 {p:이/가} 바뀌어야 한다", react: "{p}한테 달렸구냥." },
      { id: "both", label: "🤝 둘 다 노력하면 된다", react: "둘 다구냥. 좋은 답이다냥.", mood: "happy" },
      { id: "same", label: "🔁 솔직히 똑같을 것 같다", react: "…솔직하구냥. 그래도 왔구냥.", mood: "wow" },
    ],
  },
  {
    id: "rq8",
    short: "지금 네 마음은?",
    ask: ["마지막이다냥. 지금 네 마음은?"],
    options: [
      { id: "must", label: "🔥 무조건 다시 만나고 싶다", react: "간절하구냥. 다 봤다냥.", mood: "wow" },
      { id: "torn", label: "⚖️ 붙잡을지 고민 중", react: "흔들리는구냥." },
      { id: "close", label: "🕯️ 미련을 정리하고 싶다", react: "끝을 보러 왔구냥… 그것도 답이다냥." },
      { id: "wait", label: "🚪 {p:이/가} 오면 받아 줄 거다", react: "문은 열어 뒀구냥.", mood: "smug" },
      { id: "curious", label: "👁️ 그냥 그쪽 마음이 궁금하다", react: "궁금하구냥. 보여 주겠다냥.", mood: "smug" },
    ],
  },
];

const SPOUSE: InterviewQuestion[] = [
  {
    id: "sp1",
    short: "지금 연애 상태는?",
    ask: ["배우자 자리를 보려면 지금 상태부터 알아야 한다냥.", "지금 연애 상태는?"],
    options: [
      { id: "single", label: "🙋 솔로 (한동안 연애 쉬는 중)", react: "비어 있구냥. 자리가 비어야 들어온다냥.", mood: "smug" },
      { id: "some", label: "💭 썸 타는 중", react: "누가 있구냥… 그 사람인지 보자냥.", mood: "wow" },
      { id: "dating", label: "💑 연애 중", react: "지금 그 사람이 맞는지 궁금하구냥.", mood: "smug" },
      { id: "talk", label: "💍 결혼 얘기 오가는 중", react: "결정을 앞뒀구냥. 신중히 보겠다냥.", mood: "wow", minAge: 20 },
      { id: "after", label: "💔 최근에 이별했다", react: "끝나고 왔구냥. 다음 사람이 궁금하구냥." },
      { id: "remarry", label: "🕊️ 결혼했었다 (재혼 운이 궁금)", react: "두 번째 인연이구냥. 그것도 사주에 있다냥.", minAge: 24 },
    ],
  },
  {
    id: "sp2",
    short: "결혼, 언제 하고 싶냥?",
    ask: ["결혼은 언제 하고 싶냥?"],
    options: [
      { id: "asap", label: "⏩ 빠를수록 좋다", react: "급하구냥 😼", mood: "smug" },
      { id: "soon", label: "📅 2~3년 안에", react: "계획이 있구냥." },
      { id: "later", label: "🕰️ 몇 년 뒤, 자리 잡고 나서", react: "천천히구냥. 준비된 사람이 좋은 짝을 만난다냥." },
      { id: "flow", label: "🌀 인연 오면 그때", react: "흐름에 맡기는구냥." },
      { id: "no", label: "🙅 별로 생각 없다", react: "생각 없는데 왔구냥? 궁금은 하구냥 😼", mood: "smug" },
    ],
  },
  {
    id: "sp3",
    short: "늘 어떤 사람한테 끌렸냥?",
    ask: ["늘 어떤 사람한테 끌렸냥?"],
    options: [
      { id: "flashy", label: "😎 잘생기고 화려한 사람", react: "눈이 높구냥." },
      { id: "warm", label: "🧸 편하고 다정한 사람", react: "따뜻한 사람이구냥.", mood: "happy" },
      { id: "able", label: "🧠 똑똑하고 능력 있는 사람", react: "배울 게 있는 사람이구냥." },
      { id: "fun", label: "🎭 재밌고 자유로운 사람", react: "심심한 건 못 참는구냥." },
      { id: "steady", label: "🛡️ 듬직하고 책임감 있는 사람", react: "기댈 사람이구냥." },
      { id: "mystic", label: "🌙 묘하고 속을 알 수 없는 사람", react: "…위험한 쪽이구냥 😼", mood: "smug" },
    ],
  },
  {
    id: "sp4",
    short: "결혼 상대에게 절대 못 참는 건?",
    ask: ["결혼 상대한테 이것만은 절대 못 참는다, 하나만 골라라냥."],
    options: [
      { id: "money", label: "💸 돈 문제", react: "돈이구냥. 현실적이다냥." },
      { id: "lie", label: "🗣️ 거짓말", react: "거짓말이구냥. 한 번 데어 봤구냥?", mood: "wow" },
      { id: "family", label: "👪 시댁·처가 간섭", react: "집안 문제구냥." },
      { id: "vice", label: "🍺 술·도박·게임", react: "중독이구냥. 보고 자란 게 있구냥?", mood: "wow" },
      { id: "cold", label: "🧊 무심함", react: "외로운 결혼이 제일 무섭구냥." },
      { id: "obsess", label: "🔒 집착·통제", react: "숨 막히는 게 싫구냥." },
    ],
  },
  {
    id: "sp5",
    short: "연애하면 보통 누가 더 좋아했냥?",
    ask: ["연애하면 보통 누가 더 좋아했냥?"],
    options: [
      { id: "me", label: "🙋 내가 더", react: "늘 더 주는 쪽이었구냥…" },
      { id: "them", label: "🫵 상대가 더", react: "받는 쪽이었구냥.", mood: "smug" },
      { id: "even", label: "⚖️ 비슷했다", react: "균형이 맞았구냥." },
      { id: "flip", label: "⏳ 시작은 상대가, 끝엔 내가 더", react: "…늘 그 패턴이구냥.", mood: "wow" },
      { id: "few", label: "🌱 연애 경험이 별로 없다", react: "아직 백지구냥. 그것도 운이다냥." },
    ],
  },
  {
    id: "sp6",
    short: "부모님 사이는 어떻냥?",
    ask: ["좀 사적인 걸 묻겠다냥. 부모님 사이는 어떻냥? 결혼은 보고 배운 대로 간다냥."],
    options: [
      { id: "good", label: "🌸 사이좋으시다", react: "좋은 걸 보고 자랐구냥.", mood: "happy" },
      { id: "fight", label: "🌊 자주 다투신다", react: "…시끄러운 집이었구냥.", mood: "wow" },
      { id: "dry", label: "🧊 무덤덤하시다", react: "정 없는 결혼을 봤구냥." },
      { id: "apart", label: "🚪 이혼·별거하셨다", react: "그래서 결혼이 무섭구냥.", mood: "wow" },
      { id: "gone", label: "🕊️ 한 분이 안 계신다", react: "…일찍 철이 들었겠구냥." },
    ],
  },
  {
    id: "sp7",
    short: "어디서 만날 것 같냥?",
    ask: ["마지막이다냥. 그 사람, 어디서 만날 것 같냥? 감으로 골라라냥."],
    options: [
      { id: "work", label: "💼 일·직장", react: "가까이에 있구냥." },
      { id: "intro", label: "🧑‍🤝‍🧑 지인 소개", react: "누가 데려오는구냥." },
      { id: "hobby", label: "🎨 취미·모임", react: "좋아하는 걸 하다 만나는구냥.", mood: "happy" },
      { id: "app", label: "📱 앱·SNS", react: "요즘 인연이구냥." },
      { id: "chance", label: "✈️ 여행지·우연히", react: "우연이구냥… 사주가 맞는지 보자냥.", mood: "smug" },
      { id: "school", label: "🎓 학교·공부하는 곳", react: "배우는 데서구냥." },
    ],
  },
];

// ───────────── 신년운세 ─────────────

const NEWYEAR: InterviewQuestion[] = [
  {
    id: "ny1",
    short: "올 한 해, 한마디로 하면?",
    ask: ["새해를 보려면 올해부터 알아야 한다냥.", "올 한 해, 한마디로 하면 어땠냥?"],
    options: [
      { id: "good", label: "🌸 잘 풀린 해", react: "좋았구냥. 그 흐름이 이어지는지 보자냥.", mood: "happy" },
      { id: "busy", label: "🏃 정신없이 바빴던 해", react: "숨 돌릴 틈도 없었구냥." },
      { id: "hard", label: "⛈️ 버티기만 한 해", react: "…고생했다냥. 새해엔 뭐가 바뀌는지 보자냥.", mood: "wow" },
      { id: "change", label: "🔀 확 바뀐 해 (이사·이직·이별)", react: "판이 바뀌었구냥. 사주에도 흔적이 있다냥.", mood: "smug" },
      { id: "stuck", label: "🧊 제자리걸음", react: "답답했구냥. 발이 언제 떨어지는지 보자냥." },
      { id: "lonely", label: "🌙 외로웠던 해", react: "혼자 버텼구냥…" },
    ],
  },
  {
    id: "ny2",
    short: "새해에 제일 잡고 싶은 운은?",
    ask: ["새해에 딱 하나만 잡는다면, 무슨 운이냥?"],
    options: [
      { id: "money", label: "💰 재물운", react: "돈이구냥. 현실적이다냥 😼", mood: "smug" },
      { id: "love", label: "💘 연애운", react: "인연이구냥." },
      { id: "work", label: "💼 일·직장운", react: "일이구냥. 인정받고 싶구냥." },
      { id: "study", label: "📝 시험·합격운", react: "붙어야 하는 게 있구냥." },
      { id: "health", label: "🌿 건강운", react: "몸이 먼저구냥. 현명하다냥." },
      { id: "people", label: "🤝 인간관계운", react: "사람이구냥. 사람이 곧 운이다냥." },
    ],
  },
  {
    id: "ny3",
    short: "새해에 계획 중인 큰일은?",
    ask: ["새해에 계획 중인 큰일이 있냥? 날짜까지 골라 주겠다냥."],
    options: [
      { id: "job", label: "💼 이직·취업", react: "움직일 생각이구냥. 문이 열리는 달을 보자냥.", minAge: 17 },
      { id: "move", label: "📦 이사", react: "집을 옮기는구냥. 움직일 달이 따로 있다냥." },
      { id: "marry", label: "💍 결혼·연애 시작", react: "좋은 일이구냥 😽", mood: "happy", minAge: 20 },
      { id: "biz", label: "🚀 창업·부업", react: "판을 벌이는구냥. 돈 들어오는 달을 보자냥.", minAge: 18 },
      { id: "exam", label: "📝 시험·자격증", react: "합격하는 달을 짚어 주겠다냥." },
      { id: "invest", label: "📈 투자·큰 지출", react: "큰돈이구냥… 신중히 보겠다냥.", mood: "wow", minAge: 20 },
      { id: "none", label: "🌿 딱히 없다, 흐름 보고", react: "흐름부터 보자냥. 기회는 따로 온다냥." },
    ],
  },
  {
    id: "ny4",
    short: "지금 연애 상태는?",
    ask: ["새해 인연운을 보려면 지금 상태부터 알아야 한다냥."],
    options: [
      { id: "single", label: "🙋 솔로", react: "자리가 비었구냥. 누가 앉는지 보자냥.", mood: "smug" },
      { id: "some", label: "💭 썸 타는 중", react: "누가 있구냥… 새해에 어떻게 되는지 보자냥.", mood: "wow" },
      { id: "dating", label: "💑 연애 중", react: "둘 사이의 새해를 보자냥." },
      { id: "married", label: "💍 결혼했다", react: "가정의 새해를 보자냥.", minAge: 20 },
      { id: "after", label: "💔 이별한 지 얼마 안 됐다", react: "…아직 아프구냥. 새해엔 다르다냥." },
    ],
  },
  {
    id: "ny5",
    short: "요즘 제일 걱정되는 건?",
    ask: ["요즘 밤에 제일 자주 떠오르는 걱정은 뭐냥?"],
    options: [
      { id: "money", label: "💸 돈", react: "돈 걱정이구냥." },
      { id: "work", label: "📉 일·진로", react: "앞길이 걱정이구냥." },
      { id: "people", label: "😮‍💨 사람 관계", react: "사람 때문이구냥." },
      { id: "health", label: "🏥 건강", react: "몸 걱정이구냥. 꼭 짚어 주겠다냥." },
      { id: "love", label: "💔 연애", react: "마음 걱정이구냥." },
      { id: "family", label: "🏠 가족", react: "집안 걱정이구냥." },
      { id: "mind", label: "🫠 번아웃·무기력", react: "많이 지쳤구냥…", mood: "wow" },
    ],
  },
  {
    id: "ny6",
    short: "새해엔 꼭 버리고 싶은 버릇은?",
    ask: ["마지막이다냥. 새해엔 꼭 버리고 싶은 버릇 하나만 골라라냥."],
    options: [
      { id: "late", label: "⏰ 늦잠·미루기", react: "아침이 무겁구냥." },
      { id: "spend", label: "🛍️ 충동구매", react: "지갑이 가볍구냥 😼", mood: "smug" },
      { id: "phone", label: "📱 새벽까지 폰", react: "밤이 길구냥." },
      { id: "worry", label: "🌀 생각 과다", react: "머릿속이 시끄럽구냥." },
      { id: "drink", label: "🍺 술·야식", react: "위장이 운다냥.", minAge: 20 },
      { id: "people", label: "🙇 거절 못 하기", react: "착한 게 병이구냥." },
    ],
  },
];

export const FORTUNE_INTERVIEW: Record<FortuneMode, InterviewQuestion[]> = {
  newyear: NEWYEAR,
  saju: SAJU,
  daeun: DAEUN,
  reunion: REUNION,
  spouse: SPOUSE,
};
