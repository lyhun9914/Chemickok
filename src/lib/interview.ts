import type { Mode } from "@/models/types";
import type { Mood } from "@/components/Nyang";
import { josa } from "./josa";

/**
 * 냥신 1:1 면담 문항. Only what the chat UI needs lives here (question, chips, 냥신's short reaction);
 * the scoring weights and the "왜 물어봤는지" decoding are server-only (engine/content/decode.ts).
 * Partner questions use {p}, {p:이/가}, {p:은/는}, {p:을/를}, {p:과/와}, {p:이랑/랑}.
 */
export interface InterviewOption {
  id: string;
  label: string;
  react: string;
  mood?: Mood;
  /** shown only to people at least / at most this old (한국 나이), e.g. "30대" to someone who has lived it */
  minAge?: number;
  maxAge?: number;
}

/** 한국 나이 (KST), the way the readings count it. */
export function koreanAge(birthdate: string): number | null {
  const y = Number(birthdate.slice(0, 4));
  if (!y) return null;
  return new Date(Date.now() + 9 * 3600 * 1000).getUTCFullYear() - y + 1;
}

/** Options that make sense at this age (all of them when the age is unknown). */
export const optionsForAge = (options: InterviewOption[], age: number | null) =>
  age === null ? options : options.filter((o) => (o.minAge ?? 0) <= age && age <= (o.maxAge ?? 999));

export interface InterviewQuestion {
  id: string;
  /** the question in one line, for quoting it back in the reading */
  short: string;
  ask: string[];
  options: InterviewOption[];
}

/** Shared pool; SOLO_INTERVIEW / COUPLE_INTERVIEW pick from it. */
const BASE: InterviewQuestion[] = [
  {
    id: "s1",
    short: "처음 간 카페, 어느 자리에 앉냥?",
    ask: ["몸 풀기부터 하겠다냥.", "처음 가 보는 카페에 혼자 들어갔다냥. 어느 자리에 앉냥?"],
    options: [
      { id: "a", label: "🪟 창가 구석 자리", react: "구석… 흠, 역시 그렇구냥." },
      { id: "b", label: "🚪 입구가 보이는 자리", react: "오호… 문 쪽을 보는구냥. 기억해 두겠다냥.", mood: "wow" },
      { id: "c", label: "🎯 한가운데 넓은 자리", react: "당당하구냥. 좋다냥.", mood: "happy" },
      { id: "d", label: "🔌 콘센트 있는 아무 자리", react: "실속파구냥 😼" },
      { id: "e", label: "🧸 푹신한 소파 자리", react: "편한 게 최고구냥 😌", mood: "happy" },
      { id: "f", label: "🌿 테라스·야외 자리", react: "바람 쐬는 거 좋아하는구냥 😺", mood: "happy" },
    ],
  },
  {
    id: "s2",
    short: "자기 전 마지막으로 보는 화면은?",
    ask: ["자기 전에 마지막으로 보는 화면은 뭐냥? 솔직하게."],
    options: [
      { id: "a", label: "💬 누군가와의 카톡방", react: "누구 대화방인지는 안 묻겠다냥… 😏" },
      { id: "b", label: "👀 누군가의 프로필·SNS", react: "…누구 프로필이냥. 아, 대답 안 해도 된다냥.", mood: "wow" },
      { id: "c", label: "📺 쇼츠·유튜브 무한 스크롤", react: "생각하기 싫은 밤이 많구냥." },
      { id: "d", label: "⏰ 알람만 맞추고 바로 끈다", react: "흥, 자기 관리 철저하구냥." },
      { id: "e", label: "📷 예전 사진첩을 넘겨 본다", react: "…추억 여행이구냥.", mood: "wow" },
      { id: "f", label: "🧾 내일 일정·할 일 목록", react: "계획파구냥." },
    ],
  },
  {
    id: "s3",
    short: "좋아하는 사람이 3시간째 카톡을 안 읽을 때, 너는?",
    ask: ["좋아하는 사람이 네 카톡을 3시간째 안 읽는다냥.", "그때 네 손가락은 뭘 하고 있냥?"],
    options: [
      { id: "a", label: "📨 '뭐해?' 한 번 더 보냈다", react: "직진이구냥! 🔥", mood: "wow" },
      { id: "b", label: "🔍 마지막 접속·스토리 확인", react: "…확인하는구냥. 냥신도 안다냥." },
      { id: "c", label: "⏳ 나도 똑같이 늦게 답할 거다", react: "흐음, 기싸움이냥 😼" },
      { id: "d", label: "😌 바쁜가 보다 하고 잊는다", react: "오, 멘탈 단단하구냥.", mood: "happy" },
      { id: "e", label: "📵 폰을 아예 멀리 치워 둔다", react: "애써 안 보는구냥… 신경은 쓰이지?" },
      { id: "f", label: "👯 친구한테 '이거 왜 안 읽어?' 캡처", react: "회의 소집이구냥 😹", mood: "happy" },
    ],
  },
  {
    id: "s4",
    short: "요즘 꿈에 자주 나오는 장면은?",
    ask: ["이상한 거 하나 묻겠다냥.", "요즘 꿈에서 자주 보는 장면이 있냥?"],
    options: [
      { id: "a", label: "🏃 누군가에게 쫓긴다", react: "쫓기는구냥… 메모했다냥." },
      { id: "b", label: "🦷 떨어지거나 이가 빠진다", react: "…오호. 이건 의미가 있다냥.", mood: "wow" },
      { id: "c", label: "👤 예전에 알던 사람이 나온다", react: "그 사람… 아직 꿈에 나오는구냥.", mood: "wow" },
      { id: "d", label: "💤 꿈이 잘 기억 안 난다", react: "흥, 쉽게 안 보여 주는구냥." },
      { id: "e", label: "🏠 낯선 집이나 길을 헤맨다", react: "헤매는구냥… 의미가 있다냥.", mood: "wow" },
      { id: "f", label: "💞 누군가와 설레는 장면", react: "오호~ 꿈에서 연애 중이구냥 😻", mood: "happy" },
    ],
  },
  {
    id: "s5",
    short: "크게 다툰 날 밤, 잠들기 전 첫 행동은?",
    ask: ["연인이랑 크게 다툰 날 밤이다냥.", "잠들기 전, 네 첫 행동은?"],
    options: [
      { id: "a", label: "📝 장문의 카톡을 쓴다", react: "할 말은 해야 하는구냥." },
      { id: "b", label: "✍️ 썼다 지웠다를 반복한다", react: "…그 마음 안다냥." },
      { id: "c", label: "😴 일단 잔다, 내일의 내가 하겠지", react: "쿨하구냥… 진짜 쿨한 건지는 모르겠지만 😼" },
      { id: "d", label: "📱 친구한테 캡처 보내서 누가 잘못했냐 묻는다", react: "ㅋㅋ 배심원단 소집이구냥.", mood: "happy" },
      { id: "e", label: "🎧 노래 틀고 혼자 운다", react: "…다 울고 나면 괜찮아진다냥." },
      { id: "f", label: "🙏 먼저 '미안해' 보내고 잔다", react: "평화주의자구냥." },
    ],
  },
  {
    id: "s6",
    short: "지금 눈앞에 떠오르는 색은?",
    ask: ["생각하지 말고 바로 골라라냥.", "지금 눈앞에 떠오르는 색은?"],
    options: [
      { id: "wood", label: "🌿 초록", react: "초록이구냥… 흥미롭다냥.", mood: "wow" },
      { id: "fire", label: "🔥 빨강", react: "빨강! 뜨겁구냥.", mood: "wow" },
      { id: "earth", label: "🌼 노랑", react: "노랑… 그렇구냥.", mood: "wow" },
      { id: "metal", label: "🤍 흰색", react: "흰색. 깔끔하구냥.", mood: "wow" },
      { id: "water", label: "🌊 남색", react: "깊은 색이구냥…", mood: "wow" },
    ],
  },
  {
    id: "s7",
    short: "전 연인(끝난 썸) 사진, 지금 네 폰에?",
    ask: ["전 연인(아니면 끝난 썸) 사진, 지금 네 폰에 있냥?"],
    options: [
      { id: "a", label: "🗑️ 깔끔하게 다 지웠다", react: "단호하구냥. 근데 정말 다 지웠냥? 😼" },
      { id: "b", label: "🔒 숨김 폴더에 넣어 뒀다", react: "…숨김 폴더. 냥신은 다 안다냥.", mood: "wow" },
      { id: "c", label: "🗂️ 갤러리 어딘가 섞여 있다", react: "무심하구냥… 진짜일까냥?" },
      { id: "d", label: "🌙 가끔 꺼내 본다", react: "가끔… 그렇구냥. 괜찮다냥." },
      { id: "e", label: "🙅 지울 사진이 없다", react: "그럼 첫 인연이 더 중요하구냥." },
      { id: "f", label: "💬 사진은 없는데 카톡방은 아직 안 나갔다", react: "…방은 남겨 뒀구냥.", mood: "wow" },
      { id: "g", label: "🎁 선물·편지 같은 물건은 아직 있다", react: "…물건은 못 버렸구냥.", mood: "wow" },
    ],
  },
  {
    id: "s8",
    short: "처음 같이 걷는 날, 손은 누가 먼저?",
    ask: ["처음으로 둘이 같이 걷는 날이다냥.", "손은 누가 먼저 잡냥?"],
    options: [
      { id: "a", label: "🤚 내가 먼저 잡는다", react: "직진이구냥!", mood: "wow" },
      { id: "b", label: "🙈 잡아 주길 기다린다", react: "기다리는구냥… 귀엽다냥.", mood: "happy" },
      { id: "c", label: "🧥 손 말고 소매를 슬쩍", react: "고단수구냥 😼" },
      { id: "d", label: "🚶 손잡는 건 좀 나중에", react: "천천히 가는구냥." },
    ],
  },
  {
    id: "s9",
    short: "상대가 연락 없이 30분 늦을 때 첫 생각은?",
    ask: ["약속 시간인데 상대가 30분째 안 온다냥. 연락도 없다냥.", "네 머릿속에 제일 먼저 드는 생각은?"],
    options: [
      { id: "a", label: "😰 무슨 일 생겼나?", react: "걱정부터 하는구냥." },
      { id: "b", label: "😤 날 우습게 보나?", react: "…뜨끔한 데가 있구냥.", mood: "wow" },
      { id: "c", label: "📞 일단 바로 전화한다", react: "행동파구냥." },
      { id: "d", label: "☕ 근처 구경하며 기다린다", react: "여유롭구냥 😌", mood: "happy" },
      { id: "e", label: "📱 그 사람 접속 시간부터 확인", react: "…확인부터 하는구냥.", mood: "wow" },
      { id: "f", label: "🚶 기다리다 그냥 집에 간다", react: "단호하구냥…" },
    ],
  },
  {
    id: "s10",
    short: "아무도 모르는 너의 연애 습관은?",
    ask: ["이건 친구들한테도 말 안 했을 거다냥.", "아무도 모르는 너의 연애 습관은?"],
    options: [
      { id: "a", label: "🧮 연락 온 시간·횟수를 기억해 둔다", react: "…다 세고 있었구냥.", mood: "wow" },
      { id: "b", label: "📝 할 말을 메모장에 미리 써 둔다", react: "준비성 철저하구냥." },
      { id: "c", label: "🎬 혼자 미래를 시뮬레이션한다", react: "결혼식까지 갔냥? 😹", mood: "happy" },
      { id: "d", label: "🧊 먼저 정 떼는 연습을 한다", react: "…아팠던 적이 있구냥." },
      { id: "e", label: "🎵 그 사람 생각나는 노래만 무한 반복", react: "감성 충만이구냥 🎧", mood: "happy" },
      { id: "f", label: "🔮 운세·타로로 관계를 점쳐 본다", react: "…지금도 그러는 중이구냥 😼", mood: "smug" },
    ],
  },
  {
    id: "s11",
    short: "연인한테 들으면 제일 무너지는 말은?",
    ask: ["연인한테 들으면 제일 무너지는 말은?"],
    options: [
      { id: "a", label: "💔 \"우리 시간 좀 갖자\"", react: "…그 말 무섭지냥." },
      { id: "b", label: "🌀 \"너 변했어\"", react: "흐음, 그렇구냥." },
      { id: "c", label: "🙄 \"알아서 해\"", react: "무관심이 제일 싫구냥." },
      { id: "d", label: "😮‍💨 \"너랑 있으면 피곤해\"", react: "…그 말은 냥신도 아프다냥." },
      { id: "e", label: "🫣 \"솔직히 예전만큼은 아니야\"", react: "…그 말이 제일 무섭구냥.", mood: "wow" },
      { id: "f", label: "😐 \"너 원래 그런 사람이잖아\"", react: "…그 말은 깊게 박히지냥." },
    ],
  },
  {
    id: "s12",
    short: "어릴 때 부모님한테 혼나면 너는?",
    ask: ["갑자기 옛날 얘기다냥.", "어릴 때 부모님한테 혼나면 너는 어땠냥?"],
    options: [
      { id: "a", label: "🚪 방에 들어가 문을 닫았다", react: "그때부터였구냥…", mood: "wow" },
      { id: "b", label: "🗣️ 억울하면 따졌다", react: "그때도 할 말은 했구냥 😼" },
      { id: "c", label: "🙏 바로 잘못했다고 했다", react: "…착한 아이였구냥." },
      { id: "d", label: "😭 그냥 울었다", react: "그랬구냥… 토닥토닥.", mood: "happy" },
      { id: "e", label: "😶 아무 말 없이 듣고만 있었다", react: "참는 아이였구냥…" },
      { id: "f", label: "😜 장난치거나 애교로 넘겼다", react: "분위기 메이커였구냥 😹", mood: "happy" },
    ],
  },
  {
    id: "s13",
    short: "지금까지 네 연애는 보통 어떻게 끝났냥?",
    ask: ["지금까지 네 연애(썸 포함)는 보통 어떻게 끝났냥?"],
    options: [
      { id: "a", label: "✂️ 내가 먼저 정리했다", react: "결단력 있구냥." },
      { id: "b", label: "🥀 상대가 먼저 떠났다", react: "…아팠겠구냥." },
      { id: "c", label: "🌫️ 흐지부지 연락이 끊겼다", react: "흐지부지… 이것도 패턴이다냥.", mood: "wow" },
      { id: "d", label: "🤷 아직 연애다운 연애를 안 해 봤다", react: "그럼 이번이 중요하겠구냥." },
      { id: "e", label: "🔁 헤어졌다 다시 만나기를 반복", react: "…미련이 많구냥.", mood: "wow" },
      { id: "f", label: "🤝 서로 합의하고 좋게 끝냈다", react: "어른스럽구냥." },
    ],
  },
  {
    id: "s14",
    short: "지금 네 마음 날씨는?",
    ask: ["마지막이다냥. 눈 감고 3초.", "지금 네 마음 날씨는?"],
    options: [
      { id: "sunny", label: "☀️ 맑음", react: "좋은 날이구냥 ☀️", mood: "happy" },
      { id: "rain", label: "🌧️ 비", react: "비가 오는구냥… 우산 씌워 주겠다냥." },
      { id: "fog", label: "🌫️ 안개", react: "안개… 뭐가 잘 안 보이는구냥." },
      { id: "storm", label: "⛈️ 폭풍 전야", react: "폭풍 전야라… 긴장되는구냥.", mood: "wow" },
      { id: "e", label: "🌈 비 그치고 무지개", react: "회복 중이구냥 🌈", mood: "happy" },
      { id: "f", label: "❄️ 춥고 건조함", react: "…마음이 시리구냥." },
    ],
  },
];

export const PARTNER_INTERVIEW: InterviewQuestion[] = [
  {
    id: "o1",
    short: "{p}의 카톡 말투는?",
    ask: ["{p}의 카톡 말투는 어떻냥?"],
    options: [
      { id: "a", label: "🥰 이모티콘·ㅋㅋ 폭탄", react: "표현이 넘치는구냥." },
      { id: "b", label: "📏 단답 + 마침표.", react: "마침표… 무섭구냥 😹", mood: "happy" },
      { id: "c", label: "🐢 답은 늦는데 길다", react: "신중한 타입이구냥." },
      { id: "d", label: "⚡ 칼답", react: "칼답이면 마음 있는 거다냥 😼" },
      { id: "e", label: "❓ 질문으로 끝나서 대화를 이어 간다", react: "대화를 이어 가고 싶구냥 😺", mood: "happy" },
      { id: "f", label: "🎙️ 카톡보다 음성 메시지·전화", react: "목소리파구냥." },
    ],
  },
  {
    id: "o2",
    short: "{p:이/가} 너를 부르는 호칭은?",
    ask: ["{p:이/가} 너를 부르는 호칭은?"],
    options: [
      { id: "a", label: "🍯 애칭 (자기·애기 등)", react: "달달하구냥 🍯", mood: "happy" },
      { id: "b", label: "📛 그냥 이름", react: "담백하구냥." },
      { id: "c", label: "😏 '야' 아니면 장난 별명", react: "장난꾸러기구냥 😼" },
      { id: "d", label: "🤐 호칭 없이 그냥 말한다", react: "흐음… 그렇구냥.", mood: "wow" },
      { id: "e", label: "🙋 '오빠·누나' 같은 관계 호칭", react: "관계 호칭이구냥." },
      { id: "f", label: "🔀 기분 따라 호칭이 바뀐다", react: "호칭이 기분 온도계구냥 😹", mood: "happy" },
    ],
  },
  {
    id: "o3",
    short: "다투면 {p:은/는} 어떻게 하냥?",
    ask: ["둘이 다투면, {p:은/는} 어떻게 하냥?"],
    options: [
      { id: "a", label: "📞 바로 전화해서 풀려고 한다", react: "급하구냥." },
      { id: "b", label: "🫥 연락이 뜸해진다 (잠수)", react: "잠수… 메모했다냥.", mood: "wow" },
      { id: "c", label: "🙇 이유도 모르고 일단 사과한다", react: "…그렇구냥." },
      { id: "d", label: "🧠 조목조목 따진다", react: "논리파구냥." },
      { id: "e", label: "🚶 '잠깐 바람 좀 쐬고 올게'", react: "시간이 필요한 타입이구냥." },
      { id: "f", label: "😢 울거나 말을 잇지 못한다", react: "…마음이 여린 사람이구냥.", mood: "wow" },
    ],
  },
  {
    id: "o4",
    short: "{p:이/가} 휴대폰을 두는 방식은?",
    ask: ["별거 아닌 것 같지? 중요하다냥.", "{p:이/가} 휴대폰을 둘 때 보통 어떻게 두냥?"],
    options: [
      { id: "a", label: "📵 화면을 엎어 둔다", react: "엎어 둔다… 메모했다냥 😼", mood: "wow" },
      { id: "b", label: "📱 아무렇지 않게 보여 준다", react: "투명하구냥." },
      { id: "c", label: "💑 잠금화면이 우리 사진", react: "오호~ 😻", mood: "happy" },
      { id: "d", label: "🔕 알림을 다 꺼 놨다", react: "자기만의 속도가 있구냥." },
      { id: "e", label: "📞 전화는 늘 자리를 피해서 받는다", react: "…자리를 피하는구냥.", mood: "wow" },
      { id: "f", label: "✋ 항상 손에 쥐고 있다", react: "폰이 손의 일부구냥 😹", mood: "happy" },
    ],
  },
  {
    id: "o5",
    short: "데이트 장소는 주로 누가 정하냥?",
    ask: ["둘이 만날 때, 장소는 주로 누가 정하냥?"],
    options: [
      { id: "a", label: "🧭 {p:이/가} 다 정한다", react: "리드하는 타입이구냥." },
      { id: "b", label: "🙋 내가 다 정한다", react: "네가 핸들을 잡는구냥." },
      { id: "c", label: "🤝 그때그때 번갈아", react: "균형파구냥." },
      { id: "d", label: "🔁 정하는 사람 없이 늘 같은 곳", react: "익숙함이구냥…" },
      { id: "e", label: "🗺️ {p:이/가} 후보를 찾아 놓고 고르게 해 준다", react: "센스쟁이구냥 😺", mood: "happy" },
      { id: "f", label: "📍 정하다가 결국 아무 데나 간다", react: "결정 장애 커플이구냥 😹", mood: "happy" },
    ],
  },
  {
    id: "o6",
    short: "{p:이/가} 힘든 일이 생기면?",
    ask: ["{p:이/가} 힘든 일이 생기면 어떻냥?"],
    options: [
      { id: "a", label: "💬 나한테 다 털어놓는다", react: "네가 안전한 곳이구냥." },
      { id: "b", label: "🕳️ 혼자 동굴에 들어간다", react: "동굴형이구냥." },
      { id: "c", label: "😄 아무 일 없는 척 더 웃는다", react: "…이게 제일 위험하다냥.", mood: "wow" },
      { id: "d", label: "😠 짜증이 늘어난다", react: "흐음, 그렇구냥." },
      { id: "e", label: "🍺 술을 찾는다", react: "술로 푸는 타입이구냥." },
      { id: "f", label: "🏃 갑자기 운동이나 일에 몰두한다", react: "몸으로 푸는 타입이구냥." },
    ],
  },
  {
    id: "o7",
    short: "{p:이/가} 먼저 '보고 싶다'고 한 게 언제?",
    ask: ["{p:이/가} 먼저 '보고 싶다'고 한 게 언제냥?"],
    options: [
      { id: "a", label: "📅 오늘·어제", react: "달달하구냥 💕", mood: "happy" },
      { id: "b", label: "🗓️ 일주일 안쪽", react: "적당하구냥." },
      { id: "c", label: "🕐 헤어질 때나 전화 끊을 때만 한다", react: "아쉬울 때 나오는구냥." },
      { id: "d", label: "🚫 그런 말 하는 사람이 아니다", react: "그런 사람도 있다냥." },
      { id: "e", label: "🍷 술 마셨을 때만 한다", react: "취중진담이구냥 🍷", mood: "wow" },
      { id: "f", label: "📸 말 대신 사진·이모티콘을 보낸다", react: "돌려 말하는구냥 😺" },
    ],
  },
  {
    id: "o8",
    short: "{p:이/가} 다른 이성 얘기를 할 때는?",
    ask: ["{p:이/가} 다른 이성 얘기를 할 때는?"],
    options: [
      { id: "a", label: "🗣️ 숨김없이 다 말한다", react: "투명하구냥." },
      { id: "b", label: "🤫 아예 얘기를 안 꺼낸다", react: "조심스럽구냥." },
      { id: "c", label: "🧐 은근히 내 반응을 본다", react: "떠보는구냥 😼", mood: "wow" },
      { id: "d", label: "😒 내가 그런 얘기 하면 표정이 굳는다", react: "질투쟁이구냥 😹", mood: "happy" },
      { id: "e", label: "🤝 이성 친구들을 아예 나한테 소개해 준다", react: "투명하구냥 👍", mood: "happy" },
      { id: "f", label: "😅 얘기하다 눈치 보며 말을 돌린다", react: "…눈치 보는구냥.", mood: "wow" },
    ],
  },
  {
    id: "o9",
    short: "{p:이/가} 취하면 하는 말은?",
    ask: ["{p:이/가} 술에 취했다냥.", "그때 {p:은/는} 어떻냥?"],
    options: [
      { id: "a", label: "🥰 사랑한다·보고 싶다 폭발", react: "취중진담이구냥 😻", mood: "happy" },
      { id: "b", label: "😂 웃음이 많아지고 장난이 심해진다", react: "귀엽구냥 😹", mood: "happy" },
      { id: "c", label: "🌙 갑자기 진지한 속얘기를 한다", react: "…속이 깊구냥.", mood: "wow" },
      { id: "d", label: "😴 그냥 잔다", react: "귀엽구냥 😹", mood: "happy" },
      { id: "e", label: "🤐 술을 조절해서 취한 모습을 잘 안 보인다", react: "자기 관리파구냥." },
      { id: "f", label: "📞 여기저기 전화를 건다", react: "전화 폭주구냥 😹", mood: "happy" },
    ],
  },
  {
    id: "o10",
    short: "{p}의 SNS에 너는 어떻게 나오냥?",
    ask: ["마지막이다냥.", "{p}의 SNS에 너는 어떻게 나오냥?"],
    options: [
      { id: "a", label: "📸 자주 올린다", react: "자랑하고 싶구냥 😻", mood: "happy" },
      { id: "b", label: "🫥 티 안 나게 가끔 (손·뒷모습)", react: "은근하구냥." },
      { id: "c", label: "🚫 전혀 안 올린다", react: "흠…", mood: "wow" },
      { id: "d", label: "🔒 비공개 계정에만 올린다", react: "…비밀 계정이구냥 😼", mood: "wow" },
      { id: "e", label: "📌 프로필·배경 사진에만 있다", react: "대표 사진이구냥 😻", mood: "happy" },
      { id: "f", label: "💬 내 게시물에 댓글·좋아요만 단다", react: "응원파구냥." },
    ],
  },
];

/** Solo-only: crushes, being single, how you meet people. */
const SOLO_ONLY: InterviewQuestion[] = [
  {
    id: "n1",
    short: "소개팅 상대 사진, 제일 먼저 보는 곳은?",
    ask: ["소개팅이 잡혔다냥. 상대 사진을 미리 받았다냥.", "제일 먼저 눈이 가는 곳은?"],
    options: [
      { id: "a", label: "😊 웃는 얼굴인지", react: "따뜻한 사람을 찾는구냥." },
      { id: "b", label: "👀 눈빛·분위기", react: "분위기파구냥 😼" },
      { id: "c", label: "📷 사진 배경·찍은 장소", react: "…탐정이구냥.", mood: "wow" },
      { id: "d", label: "🙈 안 보고 그냥 나간다", react: "흥, 대담하구냥." },
      { id: "e", label: "🧑‍🤝‍🧑 같이 찍은 친구들 분위기", react: "주변을 보는구냥 😼", mood: "smug" },
      { id: "f", label: "📝 프로필 소개 문구", react: "글을 보는구냥." },
    ],
  },
  {
    id: "n2",
    short: "호감 가는 사람이 단톡에서 네 말에만 반응이 없을 때?",
    ask: ["단톡방에 호감 가는 사람이 있다냥.", "근데 그 사람이 다른 사람 말엔 다 답하면서 네 말에만 반응이 없다냥. 너는?"],
    options: [
      { id: "a", label: "💬 개인톡을 보낸다", react: "정면 돌파구냥!", mood: "wow" },
      { id: "b", label: "😂 단톡에서 더 웃긴 말을 한다", react: "관심 끌기 작전이구냥 😹", mood: "happy" },
      { id: "c", label: "📵 조용히 단톡 알림을 끈다", react: "…상처받았구냥." },
      { id: "d", label: "🤷 그런가 보다 한다", react: "멘탈 갑이구냥." },
      { id: "e", label: "📊 그 사람이 남한테 단 답장을 분석한다", react: "분석가구냥 😼", mood: "smug" },
      { id: "f", label: "⏰ 하루 기다렸다가 다시 말 건다", react: "인내심 있구냥." },
    ],
  },
  {
    id: "n3",
    short: "약속 없는 토요일 오후 3시, 너는?",
    ask: ["약속 하나 없는 토요일 오후 3시다냥.", "지금 너는 뭐 하고 있냥?"],
    options: [
      { id: "a", label: "🛋️ 집에서 혼자 충전 중", react: "집순이·집돌이구냥 😌" },
      { id: "b", label: "📞 누구라도 불러낸다", react: "외로움을 못 참는구냥." },
      { id: "c", label: "☕ 혼자 핫플에 간다", react: "혼자서도 잘 노는구냥.", mood: "happy" },
      { id: "d", label: "📱 누가 연락 주길 기다리며 폰만 본다", react: "…기다리는구냥.", mood: "wow" },
      { id: "e", label: "📚 운동이나 공부 같은 자기계발", react: "부지런하구냥." },
      { id: "f", label: "🎮 게임·덕질에 푹 빠져 있다", react: "최애 시간이구냥 🎮", mood: "happy" },
    ],
  },
  {
    id: "n4",
    short: "\"누가 너 좋아한대\" 들으면 첫 반응은?",
    ask: ["친구가 슬쩍 말한다냥. \"야, 누가 너 좋아한대.\"", "네 첫 반응은?"],
    options: [
      { id: "a", label: "😳 \"누군데?! 빨리 말해\"", react: "설레는구냥 😻", mood: "happy" },
      { id: "b", label: "🙄 \"에이, 설마\"", react: "안 믿는구냥…" },
      { id: "c", label: "😐 아무렇지 않은 척, 집에 가서 곱씹는다", react: "겉바속촉이구냥 😼" },
      { id: "d", label: "😮‍💨 솔직히 좀 부담스럽다", react: "흐음, 그렇구냥." },
      { id: "e", label: "😏 \"나도 알아\" 하고 아는 척한다", react: "허세구냥 😹", mood: "happy" },
      { id: "f", label: "😊 고맙지만 일단 지켜본다", react: "신중하구냥." },
    ],
  },
];

/** Couple-only: how you behave inside this relationship. */
const COUPLE_ONLY: InterviewQuestion[] = [
  {
    id: "c1",
    short: "{p}한테 온 카톡, 답장까지 보통 얼마나?",
    ask: ["몸 풀기부터 하겠다냥.", "{p}한테 카톡이 왔다냥. 읽고 답장하기까지 보통 얼마나 걸리냥?"],
    options: [
      { id: "a", label: "⚡ 보자마자 바로", react: "칼답이구냥 😻", mood: "happy" },
      { id: "b", label: "⏳ 일부러 조금 텀을 둔다", react: "밀당이구냥 😼" },
      { id: "c", label: "🌀 생각날 때 몰아서", react: "자유로운 영혼이구냥." },
      { id: "d", label: "📝 할 말 정리해서 길게", react: "정성파구냥." },
      { id: "e", label: "🙊 읽음 안 뜨게 미리보기로만 본다", react: "…미리보기 고수구냥 😼", mood: "smug" },
      { id: "f", label: "📞 카톡 대신 전화한다", react: "목소리파구냥 😺", mood: "happy" },
    ],
  },
  {
    id: "c2",
    short: "{p:이/가} 술자리, 밤 12시인데 연락이 없을 때?",
    ask: ["{p:이/가} 친구들이랑 술자리에 갔다고 치자냥.", "밤 12시인데 연락이 없다냥. 너는?"],
    options: [
      { id: "a", label: "📞 전화해 본다", react: "확인해야 마음이 놓이는구냥." },
      { id: "b", label: "🔍 친구들 스토리부터 뒤져 본다", react: "…다 봤다냥 😼", mood: "wow" },
      { id: "c", label: "😴 \"재밌게 놀아\" 하고 먼저 잔다", react: "쿨하구냥.", mood: "happy" },
      { id: "d", label: "🤐 나도 연락 안 한다, 먼저 하나 보자", react: "기싸움이구냥…" },
      { id: "e", label: "😤 다음 날 아침에 서운하다고 말한다", react: "할 말은 하는구냥." },
      { id: "f", label: "🚕 데리러 간다고 한다", react: "직접 출동이구냥 🚕", mood: "wow" },
    ],
  },
  {
    id: "c3",
    short: "{p}의 폰에 처음 보는 이름의 알림이 떴을 때?",
    ask: ["별거 아닌 것 같지? 중요하다냥.", "같이 있는데 {p}의 폰에 알림이 떴다냥. 처음 보는 이름이다냥. 너는?"],
    options: [
      { id: "a", label: "🗣️ \"누구야?\" 바로 묻는다", react: "직구구냥." },
      { id: "b", label: "🧠 모른 척, 이름만 기억해 둔다", react: "…기억해 두는구냥.", mood: "wow" },
      { id: "c", label: "🤷 별생각 없다", react: "믿음이 단단하구냥.", mood: "happy" },
      { id: "d", label: "😶 표정이 굳고 말수가 준다", react: "티 나는구냥 😹" },
      { id: "e", label: "🔄 나도 일부러 다른 이성 얘기를 꺼낸다", react: "맞불 작전이구냥 😼", mood: "smug" },
      { id: "f", label: "💬 나중에 지나가듯 '그 사람 누구야?' 묻는다", react: "타이밍을 고르는구냥." },
    ],
  },
  {
    id: "c4",
    short: "{p:과/와} 크게 다툰 날 밤, 첫 행동은?",
    ask: ["{p:과/와} 크게 다퉜다고 치자냥.", "그날 밤 잠들기 전, 네 첫 행동은?"],
    options: [
      { id: "a", label: "📝 장문의 카톡을 쓴다", react: "할 말은 해야 하는구냥." },
      { id: "b", label: "✍️ 썼다 지웠다를 반복한다", react: "…그 마음 안다냥." },
      { id: "c", label: "😴 일단 잔다, 내일의 내가 하겠지", react: "쿨하구냥… 진짜 쿨한 건지는 모르겠지만 😼" },
      { id: "d", label: "📱 친구한테 캡처 보내서 누가 잘못했냐 묻는다", react: "ㅋㅋ 배심원단 소집이구냥.", mood: "happy" },
      { id: "e", label: "🎧 노래 틀고 혼자 운다", react: "…다 울고 나면 괜찮아진다냥." },
      { id: "f", label: "🙏 먼저 '미안해' 보내고 잔다", react: "평화주의자구냥." },
    ],
  },
  {
    id: "c5",
    short: "{p:과/와}의 기념일, 제일 서운할 것 같은 건?",
    ask: ["{p:과/와} 기념일을 보낸다고 치자냥.", "이 중에 제일 서운할 것 같은 건?"],
    options: [
      { id: "a", label: "📭 아무것도 없을 때", react: "그건 서운하지냥." },
      { id: "b", label: "🎁 성의 없는 기프티콘", react: "성의가 중요하구냥." },
      { id: "c", label: "🧠 내가 지나가듯 한 말을 기억 못 할 때", react: "…기억해 주길 바라는구냥.", mood: "wow" },
      { id: "d", label: "🙂 딱히 서운할 건 없다", react: "통이 크구냥." },
      { id: "e", label: "📸 사진 하나 안 남길 때", react: "기록파구냥 📸" },
      { id: "f", label: "⌛ 늦게 오거나 일찍 가야 한다고 할 때", react: "시간이 곧 마음이구냥." },
    ],
  },
  {
    id: "c6",
    short: "{p}한테 아직 못 한 말은?",
    ask: ["솔직하게 말해라냥.", "{p}한테 아직 못 한 말이 있냥?"],
    options: [
      { id: "a", label: "💗 진짜 많이 좋아한다는 말", react: "…그 말 아껴 두지 마라냥.", mood: "happy" },
      { id: "b", label: "😢 그때 서운했던 일", react: "쌓아 둔 게 있구냥." },
      { id: "c", label: "🔮 우리 미래에 대한 얘기", react: "진지하구냥.", mood: "wow" },
      { id: "d", label: "🙆 할 말은 다 하는 편이다", react: "시원하구냥." },
      { id: "e", label: "😓 사실 요즘 좀 지쳤다는 말", react: "…솔직하구냥.", mood: "wow" },
      { id: "f", label: "🙏 그때 내가 미안했다는 말", react: "마음에 걸린 게 있구냥." },
    ],
  },
  {
    id: "c7",
    short: "{p}의 전 연인 얘기가 나오면?",
    ask: ["{p}의 전 연인 얘기가 나왔다냥.", "너는?"],
    options: [
      { id: "a", label: "🕵️ 궁금해서 이것저것 묻는다", react: "궁금한 건 못 참는구냥." },
      { id: "b", label: "🙉 듣고 싶지 않다", react: "…그렇구냥." },
      { id: "c", label: "🙂 과거는 과거다", react: "어른스럽구냥.", mood: "happy" },
      { id: "d", label: "😔 나랑 비교할까 봐 신경 쓰인다", react: "…괜찮다냥." },
      { id: "e", label: "😂 웃으면서 내 과거 얘기로 맞받아친다", react: "맞불 작전이구냥 😹", mood: "happy" },
      { id: "f", label: "🔍 그 사람 SNS를 몰래 찾아본다", react: "…수사 개시구냥.", mood: "wow" },
    ],
  },
  {
    id: "c9",
    short: "{p:과/와}의 미래, 떠올려 본 적 있냥?",
    ask: ["{p:과/와}의 미래를 떠올려 본 적 있냥?"],
    options: [
      { id: "a", label: "💍 결혼식장까지 가 봤다", react: "벌써 거기까지구냥 😻", mood: "happy" },
      { id: "b", label: "✈️ 내년 여행 정도", react: "현실적이구냥." },
      { id: "c", label: "😰 생각하면 불안해서 안 한다", react: "…불안하구냥.", mood: "wow" },
      { id: "d", label: "🌊 그런 건 안 그린다", react: "지금이 중요하구냥." },
      { id: "e", label: "🙊 미래 얘기를 꺼냈다가 반응이 애매했다", react: "…그때 좀 서운했구냥.", mood: "wow" },
      { id: "f", label: "🧾 현실 문제(돈·집·직장)부터 떠오른다", react: "현실파구냥." },
    ],
  },
  {
    id: "c10",
    short: "{p:이/가} \"나 요즘 좀 힘들어\" 하면?",
    ask: ["{p:이/가} 지나가듯 말한다냥. \"나 요즘 좀 힘들어.\"", "네 첫 반응은?"],
    options: [
      { id: "a", label: "🛠️ 뭐가 문제인지 해결책부터", react: "해결사구냥." },
      { id: "b", label: "🫂 일단 안아 주고 들어 준다", react: "따뜻하구냥.", mood: "happy" },
      { id: "c", label: "😟 \"혹시 나 때문이야?\"", react: "…그 생각부터 드는구냥.", mood: "wow" },
      { id: "d", label: "🚪 혼자 생각할 시간을 준다", react: "배려구냥." },
      { id: "e", label: "🍗 말없이 맛있는 거 사 들고 간다", react: "행동파 위로구냥 🍗", mood: "happy" },
      { id: "f", label: "🗣️ 나도 힘든 얘기를 같이 꺼낸다", react: "같이 털어놓는구냥." },
    ],
  },
  {
    id: "c11",
    short: "{p:이/가} 연락 없이 30분 늦을 때 첫 생각은?",
    ask: ["{p:과/와}의 약속인데 30분째 안 온다냥. 연락도 없다냥.", "네 머릿속에 제일 먼저 드는 생각은?"],
    options: [
      { id: "a", label: "😰 무슨 일 생겼나?", react: "걱정부터 하는구냥." },
      { id: "b", label: "😤 날 우습게 보나?", react: "…뜨끔한 데가 있구냥.", mood: "wow" },
      { id: "c", label: "📞 일단 바로 전화한다", react: "행동파구냥." },
      { id: "d", label: "☕ 근처 구경하며 기다린다", react: "여유롭구냥 😌", mood: "happy" },
      { id: "e", label: "📱 그 사람 접속 시간부터 확인", react: "…확인부터 하는구냥.", mood: "wow" },
      { id: "f", label: "🚶 기다리다 그냥 집에 간다", react: "단호하구냥…" },
    ],
  },
  {
    id: "c12",
    short: "{p}한테 들으면 제일 무너지는 말은?",
    ask: ["{p}한테 들으면 제일 무너지는 말은?"],
    options: [
      { id: "a", label: "💔 \"우리 시간 좀 갖자\"", react: "…그 말 무섭지냥." },
      { id: "b", label: "🌀 \"너 변했어\"", react: "흐음, 그렇구냥." },
      { id: "c", label: "🙄 \"알아서 해\"", react: "무관심이 제일 싫구냥." },
      { id: "d", label: "😮‍💨 \"너랑 있으면 피곤해\"", react: "…그 말은 냥신도 아프다냥." },
      { id: "e", label: "🫣 \"솔직히 예전만큼은 아니야\"", react: "…그 말이 제일 무섭구냥.", mood: "wow" },
      { id: "f", label: "😐 \"너 원래 그런 사람이잖아\"", react: "…그 말은 깊게 박히지냥." },
    ],
  },
  {
    id: "c13",
    short: "지금 너랑 {p} 사이의 날씨는?",
    ask: ["마지막이다냥. 눈 감고 3초.", "지금 너랑 {p} 사이의 날씨는?"],
    options: [
      { id: "sunny", label: "☀️ 맑음", react: "좋을 때구냥 ☀️", mood: "happy" },
      { id: "rain", label: "🌧️ 비", react: "비가 오는구냥… 우산 씌워 주겠다냥." },
      { id: "fog", label: "🌫️ 안개", react: "안개… 그 사람 마음이 잘 안 보이는구냥." },
      { id: "storm", label: "⛈️ 폭풍 전야", react: "폭풍 전야라… 긴장되는구냥.", mood: "wow" },
      { id: "e", label: "🌈 비 그치고 무지개", react: "오, 고비를 넘었구냥 🌈", mood: "happy" },
      { id: "f", label: "❄️ 춥고 건조함", react: "…둘 사이가 시리구냥." },
    ],
  },
];

const pick = (pool: InterviewQuestion[], ids: string[]) => ids.map((id) => pool.find((q) => q.id === id)!);

/** 솔로: 연애 습관 · 썸 · 지난 연애 · 혼자일 때의 나 */
export const SOLO_INTERVIEW: InterviewQuestion[] = pick(
  [...BASE, ...SOLO_ONLY],
  ["s1", "s2", "s3", "n1", "s4", "n2", "s6", "s7", "n3", "s10", "n4", "s12", "s13", "s14"],
);

/** 커플: 이 사람과의 관계 안에서의 나 */
export const COUPLE_INTERVIEW: InterviewQuestion[] = pick(
  [...BASE, ...COUPLE_ONLY],
  ["c1", "c2", "c3", "c4", "c5", "s6", "c6", "c7", "c9", "c10", "s12", "c11", "c12", "c13"],
);

/** Love interviews only; the 사주·운세 products have their own questions (lib/fortuneQuestions). */
export const selfInterview = (mode: Mode) => (mode === "couple" ? COUPLE_INTERVIEW : SOLO_INTERVIEW);

/** Replaces {p} and {p:이/가}-style particles with the partner's name. */
export function fill(text: string, partnerName: string): string {
  const p = partnerName || "그 사람";
  return text
    .replace(/\{p:(이\/가|은\/는|을\/를|과\/와|이랑\/랑)\}/g, (_, pair) => josa(p, pair))
    .replaceAll("{p}", p);
}

export function optionOf(qs: InterviewQuestion[], qid: string, oid: string | undefined): InterviewOption | undefined {
  return qs.find((q) => q.id === qid)?.options.find((o) => o.id === oid);
}

/** A typed-in answer is stored as "=" + text instead of an option id. */
export const CUSTOM_PREFIX = "=";
export const CUSTOM_MAX = 60;
export const isCustom = (a: string | undefined): a is string => Boolean(a?.startsWith(CUSTOM_PREFIX));
export const customText = (a: string) => a.slice(CUSTOM_PREFIX.length);

/** The "잘 모르겠어" button stores this instead of an option id. */
export const UNKNOWN_ANSWER = "?";
export const UNKNOWN_LABEL = "🤷 잘 모르겠어";

/** How a stored answer reads back in the chat and the reading. */
export function answerLabel(qs: InterviewQuestion[], qid: string, a: string | undefined): string {
  if (a === UNKNOWN_ANSWER) return UNKNOWN_LABEL;
  return isCustom(a) ? `✏️ ${customText(a)}` : (optionOf(qs, qid, a)?.label ?? "");
}
