import type { AnalyzeResponse, QuestionnaireInput, UnlockResponse } from "@/models/types";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return data as T;
}

export const api = {
  analyze: (input: QuestionnaireInput) => post<AnalyzeResponse>("/api/analyze", { input }),

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
