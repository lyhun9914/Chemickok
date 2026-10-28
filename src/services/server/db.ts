import "server-only";
import { randomUUID } from "node:crypto";
import type { FortuneTeaser, FullReport, PersonInput, TeaserReport } from "@/models/types";

export interface DbUser {
  id: string;
  provider: string;
  provider_id: string;
  nickname: string;
  email: string | null;
  profile: PersonInput | null;
  created_at: string;
}

export interface ReadingRow {
  id: string;
  user_id: string;
  mode: string;
  title: string;
  names: { me: string; partner: string };
  teaser: TeaserReport | FortuneTeaser;
  report: FullReport;
  order_id: string | null;
  created_at: string;
}

export type ReadingSummary = Pick<ReadingRow, "id" | "mode" | "title" | "created_at">;

export interface Db {
  upsertUser(u: { provider: string; providerId: string; nickname: string; email: string | null }): Promise<DbUser>;
  getUser(id: string): Promise<DbUser | null>;
  updateProfile(id: string, profile: PersonInput): Promise<void>;
  deleteUser(id: string): Promise<void>;
  recordPayment(p: { orderId: string; userId: string | null; inputHash: string; amount: number; method: string }): Promise<void>;
  saveReading(r: Omit<ReadingRow, "id" | "created_at">): Promise<string>;
  listReadings(userId: string): Promise<ReadingSummary[]>;
  getReading(userId: string, id: string): Promise<ReadingRow | null>;
  deleteReading(userId: string, id: string): Promise<void>;
}

// ───────────── Supabase (PostgREST over fetch) ─────────────

function supabase(url: string, key: string): Db {
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys go in apikey only.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

  async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers, ...(init.prefer ? { Prefer: init.prefer } : {}) },
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`db ${res.status}: ${text}`);
    // Writes without return=representation answer 201/204 with an empty body.
    return (text ? JSON.parse(text) : null) as T;
  }
  const eq = (v: string) => `eq.${encodeURIComponent(v)}`;

  return {
    async upsertUser(u) {
      const [row] = await rest<DbUser[]>("users?on_conflict=provider,provider_id", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: JSON.stringify({
          provider: u.provider,
          provider_id: u.providerId,
          nickname: u.nickname,
          email: u.email,
          last_login_at: new Date().toISOString(),
        }),
      });
      return row;
    },
    async getUser(id) {
      const rows = await rest<DbUser[]>(`users?id=${eq(id)}&select=*`);
      return rows[0] ?? null;
    },
    async updateProfile(id, profile) {
      await rest(`users?id=${eq(id)}`, { method: "PATCH", body: JSON.stringify({ profile }) });
    },
    async deleteUser(id) {
      await rest(`users?id=${eq(id)}`, { method: "DELETE" });
    },
    async recordPayment(p) {
      await rest("payments?on_conflict=order_id", {
        method: "POST",
        prefer: "resolution=ignore-duplicates",
        body: JSON.stringify({ order_id: p.orderId, user_id: p.userId, input_hash: p.inputHash, amount: p.amount, method: p.method }),
      });
    },
    async saveReading(r) {
      const [row] = await rest<ReadingRow[]>("readings", { method: "POST", prefer: "return=representation", body: JSON.stringify(r) });
      return row.id;
    },
    async listReadings(userId) {
      return rest<ReadingSummary[]>(`readings?user_id=${eq(userId)}&select=id,mode,title,created_at&order=created_at.desc&limit=100`);
    },
    async getReading(userId, id) {
      const rows = await rest<ReadingRow[]>(`readings?user_id=${eq(userId)}&id=${eq(id)}&select=*`);
      return rows[0] ?? null;
    },
    async deleteReading(userId, id) {
      await rest(`readings?user_id=${eq(userId)}&id=${eq(id)}`, { method: "DELETE" });
    },
  };
}

// ───────────── In-memory (local dev only) ─────────────

function memory(): Db {
  const g = globalThis as unknown as { __nyangDb?: { users: DbUser[]; readings: ReadingRow[]; payments: object[] } };
  const m = (g.__nyangDb ??= { users: [], readings: [], payments: [] });
  return {
    async upsertUser(u) {
      let row = m.users.find((x) => x.provider === u.provider && x.provider_id === u.providerId);
      if (!row) {
        row = { id: randomUUID(), provider: u.provider, provider_id: u.providerId, nickname: u.nickname, email: u.email, profile: null, created_at: new Date().toISOString() };
        m.users.push(row);
      }
      return row;
    },
    async getUser(id) {
      return m.users.find((x) => x.id === id) ?? null;
    },
    async updateProfile(id, profile) {
      const u = m.users.find((x) => x.id === id);
      if (u) u.profile = profile;
    },
    async deleteUser(id) {
      m.users = m.users.filter((x) => x.id !== id);
      m.readings = m.readings.filter((x) => x.user_id !== id);
    },
    async recordPayment(p) {
      m.payments.push(p);
    },
    async saveReading(r) {
      const row = { ...r, id: randomUUID(), created_at: new Date().toISOString() };
      m.readings.push(row);
      return row.id;
    },
    async listReadings(userId) {
      return m.readings
        .filter((x) => x.user_id === userId)
        .reverse()
        .map(({ id, mode, title, created_at }) => ({ id, mode, title, created_at }));
    },
    async getReading(userId, id) {
      return m.readings.find((x) => x.user_id === userId && x.id === id) ?? null;
    },
    async deleteReading(userId, id) {
      m.readings = m.readings.filter((x) => !(x.user_id === userId && x.id === id));
    },
  };
}

// Never on a Vercel production deploy, even if the flag is set by mistake.
export const devLoginEnabled = () => process.env.AUTH_DEV_LOGIN === "1" && process.env.VERCEL_ENV !== "production";

/** null when accounts aren't configured — the app then runs exactly as before (no login, nothing stored). */
export function getDb(): Db | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url && key) return supabase(url.replace(/\/$/, ""), key);
  return devLoginEnabled() ? memory() : null;
}
