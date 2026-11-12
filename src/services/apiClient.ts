import { reportClientError } from "@/lib/track";
import type { AnalyzeResponse, FortuneAnalyzeResponse, FortuneTeaser, FullReport, Gender, Mode, PairResult, PersonInput, QuestionnaireInput, RelationshipStatus, TeaserReport, UnlockResponse } from "@/models/types";

async function post<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) failed(`${method} ${url}`, res.status, data);
  return data as T;
}

/** A failed call: server errors and rejected input (400) also go to the 관리자 오류 기록, then it throws. */
function failed(what: string, status: number, data: unknown): never {
  const msg = (data as { error?: string }).error;
  if (status >= 500 || status === 400) reportClientError("api", `${what.split("?")[0]} → ${status}`, msg);
  throw new Error(msg ?? `요청 실패 (${status})`);
}

export const api = {
  analyze: (input: QuestionnaireInput) => post<AnalyzeResponse>("/api/analyze", { input }),
  fortune: (input: QuestionnaireInput) => post<FortuneAnalyzeResponse>("/api/fortune", { input }),

  unlock: (body: {
    input: QuestionnaireInput;
    method: "test" | "toss" | "share" | "coins";
    paymentKey?: string;
    orderId?: string;
    amount?: number;
  }) => post<UnlockResponse>("/api/payment/confirm", body),
};

export interface DailyFortuneResponse {
  date: string;
  score: number;
  title: string;
  line: string;
  color: string;
  time: string;
}

export interface TodayFortuneResponse {
  date: string;
  ganji: string;
  score: number;
  title: string;
  line: string;
  cats: { key: string; label: string; score: number; line: string }[];
  do: string;
  dont: string;
  color: string;
  direction: string;
  number: string;
  time: string;
  slots: { label: string; score: number; line: string }[];
  outfit: string;
  food: string;
  bloodLine: string | null;
}

export interface ZodiacTodayResponse {
  date: string;
  ganji: string;
  list: { animal: string; score: number; line: string }[];
}

export interface IljuResponse {
  no: number;
  ganji: string;
  hanja: string;
  name: string;
  icon: string;
  keys: string[];
  trait: string;
  love: string;
  labels: string[];
  labelLine: string | null;
  rank: number;
  rankLine: string;
  match: { ganji: string; name: string };
}

export interface ExamDayResponse {
  date: string;
  ganji: string;
  god: string;
  score: number;
  title: string;
  line: string;
  tip: string;
  color: string;
  item: string;
  time: string;
  food: string;
}

export const todayApi = {
  ilju: (birthdate: string) => post<{ ilju: IljuResponse }>("/api/today", { kind: "ilju", birthdate }).then((r) => r.ilju),
  exam: (birthdate: string, date: string) => post<{ exam: ExamDayResponse }>("/api/today", { kind: "exam", birthdate, date }).then((r) => r.exam),
  fortune: (birthdate: string, blood = "") => post<{ fortune: TodayFortuneResponse }>("/api/today", { birthdate, blood }).then((r) => r.fortune),
  zodiac: () => post<{ zodiac: ZodiacTodayResponse }>("/api/today", {}).then((r) => r.zodiac),
};

export const dailyApi = {
  get: (birthdate: string) => post<DailyFortuneResponse>("/api/daily", { birthdate }),
};

// ───────────── 회원 ─────────────

export type LoginProvider = "kakao" | "naver" | "google" | "email" | "dev";

export interface Me {
  id: string;
  provider: string;
  nickname: string;
  profile: PersonInput | null;
  /** 복주머니 balance (냥) */
  coins: number;
  /** for 친구 초대 links */
  refCode: string;
  email: string | null;
}

export interface CoinHistoryRow {
  delta: number;
  reason: "charge" | "spend" | "bonus" | "refund" | "admin" | "gift" | "expire";
  ref: string;
  balance_after: number;
  created_at: string;
}

/** What is left of one 충전, and when it lapses (충전일부터 1년). */
export interface PaidLeft {
  coins: number;
  left: number;
  at: string;
  expiresAt: string;
}

export interface Wallet {
  balance: number;
  history: CoinHistoryRow[];
  invites: number;
  inviteLimit: number;
  /** 무료로 받은 냥 (기한 없음) */
  free?: number;
  /** 충전한 냥 still left, oldest first */
  paid?: PaidLeft[];
}

export interface ReadingSummary {
  id: string;
  mode: Mode;
  title: string;
  created_at: string;
}

export interface SavedReading {
  id: string;
  mode: Mode;
  title: string;
  names: { me: string; partner: string };
  teaser: TeaserReport | FortuneTeaser;
  report: FullReport;
  created_at: string;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) failed(`GET ${url}`, res.status, data);
  return data as T;
}

export const accountApi = {
  me: () => get<{ user: Me | null; providers: LoginProvider[] }>("/api/me"),
  saveProfile: (profile: PersonInput) => post<{ profile: PersonInput }>("/api/me", { profile }, "PUT"),
  withdraw: () => post<{ ok: true }>("/api/me", undefined, "DELETE"),
  logout: () => post<{ ok: true }>("/api/auth/logout", undefined),
  readings: () => get<{ readings: ReadingSummary[] }>("/api/readings"),
  reading: (id: string) =>
    get<{ reading: SavedReading }>(`/api/readings/${id}`),
  deleteReading: (id: string) => post<{ ok: true }>(`/api/readings/${id}`, undefined, "DELETE"),
  email: (body: { action: "signup" | "login" | "reset-request" | "reset"; email?: string; password?: string; nickname?: string; token?: string }) =>
    post<{ ok: true; created?: boolean }>("/api/auth/email", body),
  /** Full-page redirect to the provider; `pay` reopens the payment sheet on return. */
  loginUrl: (p: LoginProvider, next: "pay" | "" = "") => `/api/auth/${p}/login${next ? `?next=${next}` : ""}`,
};

export const coinApi = {
  wallet: () => get<Wallet>("/api/coins"),
  charge: (body: { packId: string; method: "test" | "toss"; paymentKey?: string; orderId?: string; amount?: number }) =>
    post<{ balance: number; added: number }>("/api/coins", body),
  coupon: (code: string) => post<{ coins: number; balance: number }>("/api/coupons", { code }),
};

// ───────────── 맞궁합 초대장 ─────────────

export interface PairView {
  from: string;
  fromGender: Gender;
  /** the sender's 썸 · 연애 중 · 권태기 · 이별 후: the invited person answers the same questions */
  status: RelationshipStatus;
  to: string;
  answered: boolean;
  result: PairResult | null;
}

export const pairApi = {
  create: (input: QuestionnaireInput) => post<{ id: string }>("/api/pair", { input }),
  get: (id: string) => get<PairView>(`/api/pair/${encodeURIComponent(id)}`),
  answer: (id: string, input: QuestionnaireInput) => post<PairView>(`/api/pair/${encodeURIComponent(id)}`, { input }),
};

// ───────────── 냥 선물 · 출석 ─────────────

export interface SentGift {
  id: string;
  coins: number;
  message: string;
  status: "open" | "claimed" | "cancelled";
  created_at: string;
  claimed_at: string | null;
}

export interface GiftView {
  from: string;
  coins: number;
  message: string;
  status: "open" | "claimed" | "cancelled";
  mine: boolean;
  claimedByMe: boolean;
}

export const giftApi = {
  sent: () => get<{ gifts: SentGift[] }>("/api/gifts"),
  send: (coins: number, message: string, name: string) => post<{ id: string; balance: number }>("/api/gifts", { coins, message, name }),
  get: (id: string) => get<GiftView>(`/api/gifts/${encodeURIComponent(id)}`),
  claim: (id: string) => post<{ ok: true; coins: number; balance?: number }>(`/api/gifts/${encodeURIComponent(id)}`, { action: "claim" }),
  cancel: (id: string) => post<{ ok: true; balance: number }>(`/api/gifts/${encodeURIComponent(id)}`, { action: "cancel" }),
};

export const checkinApi = {
  stamp: () => post<{ streak: number; rewarded: boolean; every: number; coins: number; balance?: number }>("/api/checkin", {}),
};

// ───────────── 재미 기능: 단톡방 케미표 · 나를 얼마나 아냥? · 고양이 도감 모으기 ─────────────

export interface ChemMemberView {
  name: string;
  cat: string;
  icon: string;
  animal: string;
  role: string;
}
export interface ChemPairView {
  a: number;
  b: number;
  score: number;
  label: string;
  line: string;
}
export interface RoomView {
  title: string;
  createdAt: string;
  expiresAt: string;
  /** this visitor made the room (may delete it) */
  creator: boolean;
  max: number;
  /** index of the member this browser's key belongs to, or -1 */
  me: number;
  members: ChemMemberView[];
  pairs: ChemPairView[];
  best: ChemPairView | null;
  rival: ChemPairView | null;
  mood: { member: number; avg: number } | null;
  carer: { member: number; count: number } | null;
}
export const roomApi = {
  create: (title: string, name: string, birthdate: string) => post<{ id: string; key: string }>("/api/room", { title, name, birthdate }),
  get: (id: string, key?: string | null) => get<RoomView>(`/api/room/${encodeURIComponent(id)}${key ? `?key=${encodeURIComponent(key)}` : ""}`),
  join: (id: string, name: string, birthdate: string) => post<RoomView & { key: string }>(`/api/room/${encodeURIComponent(id)}`, { name, birthdate }),
  /** 나 빼기 (by key, else by the logged-in account); `all` = the maker deletes the room */
  leave: (id: string, key: string | null, all = false) => post<{ ok: true; deleted?: boolean }>(`/api/room/${encodeURIComponent(id)}`, { key, all }, "DELETE"),
};

export interface QuizView {
  owner: string;
  total: number;
  questions: { q: string; options: string[] }[];
  ranking: { name: string; score: number }[];
  plays: number;
  hardest: { index: number; q: string; missed: number } | null;
  /** how many friends got each question right */
  correct: number[];
  createdAt: string;
  expiresAt: string;
  /** this visitor made the quiz (their account or the key this browser kept) */
  isOwner?: boolean;
  /** the maker's own answers (only to the maker) */
  myAnswers?: number[];
}
export interface QuizResult extends QuizView {
  mine: { name: string; score: number; right: boolean[]; answers: number[]; picked?: number[]; verdict: string };
}
export const quizApi = {
  create: (name: string, items: { q: string; a: number }[]) => post<{ id: string; key: string }>("/api/quiz", { name, items }),
  get: (id: string, key?: string | null) => get<QuizView>(`/api/quiz/${encodeURIComponent(id)}${key ? `?key=${encodeURIComponent(key)}` : ""}`),
  remove: (id: string, key: string | null) => post<{ ok: true }>(`/api/quiz/${encodeURIComponent(id)}`, { key }, "DELETE"),
  play: (id: string, name: string, answers: number[]) => post<QuizResult>(`/api/quiz/${encodeURIComponent(id)}`, { name, answers }),
};

export interface AlbumCard {
  no: number;
  ganji: string;
  hanja: string;
  name: string;
  icon: string;
  keys: string[];
  trait: string;
  rank: number;
  day?: string;
}
export interface AlbumView {
  size: number;
  cards: AlbumCard[];
  drawnToday: boolean;
  milestones: { at: number; coins: number; done: boolean }[];
  rewards: boolean;
  mine: number | null;
  balance: number;
}
export const albumApi = {
  get: () => get<AlbumView>("/api/album"),
  /** a 409 (already drawn today) still carries the album and today's card */
  draw: async (): Promise<AlbumView & { card: AlbumCard | null; reward?: number; first?: boolean; error?: string }> => {
    const res = await fetch("/api/album", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 409) failed("POST /api/album", res.status, data);
    return data;
  },
};

/** 내 점괘함 · 친구랑 놀기 (logged in, any device) */
export interface MineQuiz {
  id: string;
  owner: string;
  total: number;
  plays: number;
  leader: { name: string; score: number } | null;
  createdAt: string;
  expiresAt: string;
}
export interface MineRoom {
  id: string;
  title: string;
  count: number;
  me: string | null;
  creator: boolean;
  best: { a: string; b: string; score: number } | null;
  createdAt: string;
  expiresAt: string;
}
export interface Mine {
  quizzes: MineQuiz[];
  rooms: MineRoom[];
  album: { count: number; size: number; drawnToday: boolean };
}
export const mineApi = {
  get: () => get<Mine>("/api/mine"),
};
