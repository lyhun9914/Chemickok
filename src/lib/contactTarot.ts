/**
 * 연락할까 말까? 타로 — a free three-card spread for one contact question: ① 지금 흐름 ② 그 사람 마음 ③ 냥신의 조언.
 * Each major arcana leans go / wait / stop; the 그 사람 card counts most. Cards are the same 22 as 오늘의 타로 (lib/tarot).
 */
export type Sign = "go" | "wait" | "stop";

export const CONTACT: { sign: Sign; now: string; heart: string; advice: string }[] = [
  { sign: "go", now: "가볍게 시작하면 풀리는 흐름이다냥.", heart: "깊게 재지 않고 툭 반가워할 거다냥.", advice: "부담 없는 한 줄로 가라냥. '이거 보니까 생각나서'면 충분하다냥." },
  { sign: "go", now: "네 손에 주도권이 있는 흐름이다냥.", heart: "네 말 한마디에 반응할 준비가 돼 있다냥.", advice: "질문으로 끝나는 문장을 보내라냥. 답장이 쉬워진다냥." },
  {
    sign: "wait",
    now: "물밑에서 뭔가 흐르는 중이다냥. 겉으론 조용하다냥.",
    heart: "속으론 생각하는데 티를 안 내는 중이다냥.",
    advice: "오늘은 지켜봐라냥. 그 사람 상태 메시지에 힌트가 있다냥.",
  },
  { sign: "go", now: "따뜻한 기운이 흐른다냥. 챙겨 주는 말이 통한다냥.", heart: "너한테 편안함을 느끼고 있다냥.", advice: "'밥은 먹었어?' 같은 챙김 한 줄이 제일 세다냥." },
  {
    sign: "go",
    now: "분명하게 하는 사람이 이기는 흐름이다냥.",
    heart: "애매한 건 싫은 상태다냥. 분명한 걸 원한다냥.",
    advice: "용건을 분명히 해라냥. '이번 주 토요일 시간 돼?'처럼.",
  },
  {
    sign: "wait",
    now: "주변 사람 말이 흐름을 바꾸는 때다냥.",
    heart: "친구들한테 너에 대해 물어보는 중일 수 있다냥.",
    advice: "공통 지인이 있는 자리를 노려라냥. 단둘이보다 자연스럽다냥.",
  },
  { sign: "go", now: "서로 끌리는 기운이 맞닿아 있다냥.", heart: "너를 의식하고 있다냥. 선택만 남았다냥.", advice: "솔직한 한마디가 이긴다냥. 돌려 말하지 마라냥." },
  { sign: "go", now: "밀어붙이면 열리는 흐름이다냥.", heart: "누가 먼저 움직이길 기다리는 중이다냥.", advice: "지금 보내라냥. 망설이면 타이밍이 지나간다냥." },
  {
    sign: "wait",
    now: "부드럽게 가야 하는 흐름이다냥. 세게 밀면 튕긴다냥.",
    heart: "마음은 있는데 조심스러운 상태다냥.",
    advice: "재촉하는 말은 빼고, 웃는 이모지 하나 붙여라냥.",
  },
  { sign: "stop", now: "그 사람이 혼자만의 동굴에 들어가 있다냥.", heart: "지금은 자기 생각할 시간이 필요하다냥.", advice: "오늘은 참아라냥. 사흘 뒤가 더 낫다냥." },
  {
    sign: "go",
    now: "흐름이 바뀌는 타이밍이다냥. 우연을 만들 때다냥.",
    heart: "마침 너를 떠올릴 일이 생긴다냥.",
    advice: "지나가다 생긴 일처럼 보내라냥. '방금 ○○ 봤는데 너 생각났어'.",
  },
  { sign: "wait", now: "주고받은 만큼 돌아오는 흐름이다냥.", heart: "누가 더 연락하는지 은근히 세고 있다냥.", advice: "마지막 메시지가 네 쪽이었다면, 한 번은 기다려라냥." },
  { sign: "stop", now: "멈춰 있는 흐름이다냥. 서두르면 꼬인다냥.", heart: "아직 마음을 정하지 못했다냥.", advice: "오늘은 보내지 마라냥. 기다림이 네 값을 올린다냥." },
  { sign: "stop", now: "하나가 끝나야 새로 시작되는 흐름이다냥.", heart: "예전 감정을 정리하는 중이다냥.", advice: "같은 얘기 반복은 그만해라냥. 새 화제로 다시 시작해라냥." },
  { sign: "wait", now: "적당히가 정답인 흐름이다냥.", heart: "천천히 알아가고 싶어 한다냥.", advice: "짧게, 한 번만 보내라냥. 답장 속도는 그 사람에게 맞춰라냥." },
  { sign: "stop", now: "끌리는데 꼬이기 쉬운 흐름이다냥.", heart: "끌리긴 하는데 가볍게 생각하는 중일 수 있다냥.", advice: "새벽 연락은 금지다냥. 낮에, 맨정신으로 보내라냥." },
  { sign: "stop", now: "갑자기 판이 흔들리는 흐름이다냥.", heart: "그 사람도 지금 정신이 없다냥.", advice: "오늘은 아니다냥. 상황이 가라앉으면 '괜찮아?' 한마디만 해라냥." },
  { sign: "go", now: "희망이 보이는 흐름이다냥.", heart: "너한테 좋은 인상이 남아 있다냥.", advice: "기분 좋은 소식이나 사진 하나로 시작해라냥." },
  { sign: "wait", now: "불확실한 흐름이다냥. 보이는 게 다가 아니다냥.", heart: "혼자 오해하거나 헷갈려 하는 중이다냥.", advice: "추측성 말은 빼라냥. 확실한 질문 하나만 해라냥." },
  { sign: "go", now: "다 잘 풀리는 밝은 흐름이다냥.", heart: "너를 떠올리면 기분이 좋아지는 상태다냥.", advice: "밝게 가라냥. 만나자고 해도 된다냥." },
  { sign: "go", now: "다시 부르는 흐름이다냥. 끊긴 연락이 되살아난다냥.", heart: "예전 일을 다시 떠올리는 중이다냥.", advice: "추억 하나를 꺼내라냥. '그때 거기 기억나?'" },
  { sign: "go", now: "한 바퀴 돌아 완성되는 흐름이다냥.", heart: "너와의 관계를 꽤 진지하게 생각한다냥.", advice: "이번엔 결론이 나는 대화를 해라냥. 만날 날짜를 잡아라냥." },
];

export type ContactQ = "send" | "heart" | "notice" | "back";

export const CONTACT_Q: { id: ContactQ; emoji: string; label: string; verdict: Record<Sign, string> }[] = [
  { id: "send", emoji: "📨", label: "선톡 보낼까 말까?", verdict: { go: "보내라냥!", wait: "하루만 더 기다려라냥", stop: "오늘은 참아라냥" } },
  { id: "heart", emoji: "💭", label: "그 사람, 지금 내 생각 할까?", verdict: { go: "꽤 자주 한다냥", wait: "가끔 떠올린다냥", stop: "지금은 자기 일로 바쁘다냥" } },
  { id: "notice", emoji: "👀", label: "내 마음, 눈치챘을까?", verdict: { go: "이미 눈치챘다냥", wait: "반쯤 눈치챘다냥", stop: "아직 모른다냥" } },
  { id: "back", emoji: "🔁", label: "그 사람한테 다시 연락 올까?", verdict: { go: "온다냥", wait: "시간이 좀 걸린다냥", stop: "먼저 오진 않는다냥" } },
];

export const POSITIONS = ["지금 흐름", "그 사람 마음", "냥신의 조언"] as const;

/** The 그 사람 card weighs 1.5; ≥ 1 go, ≤ −1 stop. */
export function verdictOf(cards: number[]): Sign {
  const v = (i: number) => ({ go: 1, wait: 0, stop: -1 })[CONTACT[i].sign];
  const s = v(cards[0]) + v(cards[1]) * 1.5 + v(cards[2]);
  return s >= 1 ? "go" : s <= -1 ? "stop" : "wait";
}
