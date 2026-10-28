import type { AnalyzeResponse, FortuneAnalyzeResponse, FortuneTeaser, FullReport, Mode, PersonInput, QuestionnaireInput, TeaserReport, UnlockResponse } from "@/models/types";

async function post<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return data as T;
}

export const api = {
  analyze: (input: QuestionnaireInput) => post<AnalyzeResponse>("/api/analyze", { input }),
  fortune: (input: QuestionnaireInput) => post<FortuneAnalyzeResponse>("/api/fortune", { input }),

  unlock: (body: {
    input: QuestionnaireInput;
    method: "test" | "toss" | "share";
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

export const dailyApi = {
  get: (birthdate: string) => post<DailyFortuneResponse>("/api/daily", { birthdate }),
};

// ───────────── 회원 ─────────────

export type LoginProvider = "kakao" | "naver" | "google" | "dev";

export interface Me {
  id: string;
  provider: string;
  nickname: string;
  profile: PersonInput | null;
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
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `요청 실패 (${res.status})`);
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
  /** Full-page redirect to the provider; `pay` reopens the payment sheet on return. */
  loginUrl: (p: LoginProvider, next: "pay" | "" = "") => `/api/auth/${p}/login${next ? `?next=${next}` : ""}`,
};
