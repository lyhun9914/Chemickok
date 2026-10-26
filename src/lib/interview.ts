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
}

export interface InterviewQuestion {
  id: string;
  /** the question in one line, for quoting it back in the reading */
  short: string;
  ask: string[];
  options: InterviewOption[];
}

export const SELF_INTERVIEW: InterviewQuestion[] = [
  {
    id: "s1",
    short: "처음 간 카페, 어느 자리에 앉냥?",
    ask: ["몸 풀기부터 하겠다냥.", "처음 가 보는 카페에 혼자 들어갔다냥. 어느 자리에 앉냥?"],
    options: [
      { id: "a", label: "🪟 창가 구석 자리", react: "구석… 흠, 역시 그렇구냥." },
      { id: "b", label: "🚪 입구가 보이는 자리", react: "오호… 문 쪽을 보는구냥. 기억해 두겠다냥.", mood: "wow" },
      { id: "c", label: "🛋️ 한가운데 넓은 자리", react: "당당하구냥. 좋다냥.", mood: "happy" },
      { id: "d", label: "🔌 콘센트 있는 아무 자리", react: "실속파구냥 😼" },
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
    ],
  },
  {
    id: "s10",
    short: "아무도 모르는 너의 연애 습관은?",
    ask: ["이건 친구들한테도 말 안 했을 거다냥.", "아무도 모르는 너의 연애 습관은?"],
    options: [
      { id: "a", label: "🕵️ 그 사람 팔로잉 목록을 본다", react: "…다 봤다냥. 😼", mood: "wow" },
      { id: "b", label: "📝 할 말을 메모장에 미리 써 둔다", react: "준비성 철저하구냥." },
      { id: "c", label: "🎬 혼자 미래를 시뮬레이션한다", react: "결혼식까지 갔냥? 😹", mood: "happy" },
      { id: "d", label: "🧊 먼저 정 떼는 연습을 한다", react: "…아팠던 적이 있구냥." },
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
      { id: "d", label: "🤷 제대로 끝나 본 적이 없다", react: "그럼 이번이 중요하겠구냥." },
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
    ],
  },
  {
    id: "o5",
    short: "데이트 장소는 주로 누가 정하냥?",
    ask: ["데이트 장소는 주로 누가 정하냥?"],
    options: [
      { id: "a", label: "🧭 {p:이/가} 다 정한다", react: "리드하는 타입이구냥." },
      { id: "b", label: "🙋 내가 다 정한다", react: "네가 핸들을 잡는구냥." },
      { id: "c", label: "🤝 그때그때 번갈아", react: "균형파구냥." },
      { id: "d", label: "🔁 정하는 사람 없이 늘 같은 곳", react: "익숙함이구냥…" },
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
    ],
  },
  {
    id: "o7",
    short: "{p:이/가} 먼저 '보고 싶다'고 한 게 언제?",
    ask: ["{p:이/가} 먼저 '보고 싶다'고 한 게 언제냥?"],
    options: [
      { id: "a", label: "📅 오늘·어제", react: "달달하구냥 💕", mood: "happy" },
      { id: "b", label: "🗓️ 일주일 안쪽", react: "적당하구냥." },
      { id: "c", label: "🤔 기억이 잘 안 난다", react: "…흠.", mood: "wow" },
      { id: "d", label: "🚫 그런 말 하는 사람이 아니다", react: "그런 사람도 있다냥." },
    ],
  },
  {
    id: "o8",
    short: "{p:이/가} 다른 이성 얘기를 할 때는?",
    ask: ["마지막이다냥.", "{p:이/가} 다른 이성 얘기를 할 때는?"],
    options: [
      { id: "a", label: "🗣️ 숨김없이 다 말한다", react: "투명하구냥." },
      { id: "b", label: "🤫 아예 얘기를 안 꺼낸다", react: "조심스럽구냥." },
      { id: "c", label: "🧐 은근히 내 반응을 본다", react: "떠보는구냥 😼", mood: "wow" },
      { id: "d", label: "😒 내가 그런 얘기 하면 표정이 굳는다", react: "질투쟁이구냥 😹", mood: "happy" },
    ],
  },
];

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
