import "server-only";
import { randomUUID } from "node:crypto";
import type { FortuneTeaser, FullReport, PersonInput, RelationshipStatus, TeaserReport } from "@/models/types";

export interface DbUser {
  id: string;
  provider: string;
  provider_id: string;
  nickname: string;
  email: string | null;
  profile: PersonInput | null;
  /** email accounts only — never send to the browser */
  password_hash?: string | null;
  /** in 친구 초대 links */
  ref_code: string;
  referred_by?: string | null;
  created_at: string;
}

export type CoinReason = "charge" | "spend" | "bonus" | "refund" | "admin" | "gift";
export interface LedgerRow {
  delta: number;
  reason: CoinReason;
  ref: string;
  balance_after: number;
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

export interface GiftRow {
  id: string;
  from_user: string | null;
  from_name: string;
  coins: number;
  message: string;
  claimed_by: string | null;
  claimed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

/** 맞궁합 초대장: the sender's own answers (and what they said about the other), then the other side's. */
export interface PairRow {
  id: string;
  from_user: string | null;
  from_name: string;
  from_person: PersonInput;
  from_self: Record<string, string>;
  from_obs: Record<string, string>;
  to_name: string;
  /** 썸 · 연애 중 · 권태기 · 이별 후, as the sender answered: both sides answer the same questions */
  status: RelationshipStatus;
  to_person: PersonInput | null;
  to_self: Record<string, string> | null;
  to_obs: Record<string, string> | null;
  answered_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface PaymentRow {
  order_id: string;
  user_id: string | null;
  input_hash: string;
  amount: number;
  method: string;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  provider: string;
  nickname: string;
  email: string | null;
  created_at: string;
  balance: number;
}

export interface Db {
  upsertUser(u: { provider: string; providerId: string; nickname: string; email: string | null }): Promise<DbUser>;
  findUser(provider: string, providerId: string): Promise<DbUser | null>;
  /** fails if (provider, providerId) exists */
  createUser(u: { provider: string; providerId: string; nickname: string; email: string | null; passwordHash?: string }): Promise<DbUser>;
  setPassword(id: string, hash: string): Promise<void>;
  userByRef(code: string): Promise<DbUser | null>;
  setReferredBy(id: string, referrer: string): Promise<void>;
  getUser(id: string): Promise<DbUser | null>;
  updateProfile(id: string, profile: PersonInput): Promise<void>;
  deleteUser(id: string): Promise<void>;
  recordPayment(p: { orderId: string; userId: string | null; inputHash: string; amount: number; method: string }): Promise<void>;
  saveReading(r: Omit<ReadingRow, "id" | "created_at">): Promise<string>;
  listReadings(userId: string): Promise<ReadingSummary[]>;
  getReading(userId: string, id: string): Promise<ReadingRow | null>;
  deleteReading(userId: string, id: string): Promise<void>;
  // 복주머니
  coins(userId: string): Promise<number>;
  /** once per (user, reason, ref) */
  coinAdd(userId: string, delta: number, reason: Exclude<CoinReason, "spend">, ref: string): Promise<{ balance: number; applied: boolean }>;
  /** the same ref spent before is free; ok=false when the balance is short */
  coinSpend(userId: string, cost: number, ref: string): Promise<{ ok: boolean; balance: number; already: boolean }>;
  coinHistory(userId: string): Promise<LedgerRow[]>;
  /** friends who joined through this user's link (rewards given) */
  inviteCount(userId: string): Promise<number>;
  /** stamps `day` (KST yyyy-mm-dd); every `every`-th day in a row pays `coins` */
  checkin(userId: string, day: string, every: number, coins: number): Promise<{ streak: number; rewarded: boolean }>;
  // 냥 선물
  giftSend(userId: string, id: string, coins: number, name: string, message: string): Promise<{ ok: boolean; balance: number }>;
  giftClaim(id: string, userId: string): Promise<{ ok: boolean; reason?: string; coins?: number; balance?: number }>;
  giftCancel(id: string, userId: string): Promise<{ ok: boolean; balance?: number }>;
  giftGet(id: string): Promise<GiftRow | null>;
  giftsFrom(userId: string): Promise<GiftRow[]>;
  // 맞궁합 초대장 (expired ones read as missing)
  pairCreate(row: Pick<PairRow, "id" | "from_user" | "from_name" | "from_person" | "from_self" | "from_obs" | "to_name" | "status">): Promise<void>;
  pairGet(id: string): Promise<PairRow | null>;
  /** false if someone already answered */
  pairAnswer(id: string, to: Pick<PairRow, "to_person" | "to_self" | "to_obs">): Promise<boolean>;
  // 관리자
  adminStats(): Promise<Record<string, number | boolean>>;
  adminUsers(q: string): Promise<AdminUserRow[]>;
  adminPayments(userId?: string): Promise<PaymentRow[]>;
  /** by hand (보상 · 환불 · 회수); never below zero */
  coinAdjust(userId: string, delta: number, reason: "admin" | "refund", ref: string): Promise<{ ok: boolean; balance: number }>;
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
    async findUser(provider, providerId) {
      const rows = await rest<DbUser[]>(`users?provider=${eq(provider)}&provider_id=${eq(providerId)}&select=*`);
      return rows[0] ?? null;
    },
    async createUser(u) {
      const [row] = await rest<DbUser[]>("users", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify({ provider: u.provider, provider_id: u.providerId, nickname: u.nickname, email: u.email, password_hash: u.passwordHash ?? null }),
      });
      return row;
    },
    async setPassword(id, hash) {
      await rest(`users?id=${eq(id)}`, { method: "PATCH", body: JSON.stringify({ password_hash: hash }) });
    },
    async userByRef(code) {
      const rows = await rest<DbUser[]>(`users?ref_code=${eq(code)}&select=id,provider,nickname,ref_code,created_at`);
      return rows[0] ?? null;
    },
    async setReferredBy(id, referrer) {
      await rest(`users?id=${eq(id)}`, { method: "PATCH", body: JSON.stringify({ referred_by: referrer }) });
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
    async coins(userId) {
      const rows = await rest<{ balance: number }[]>(`wallets?user_id=${eq(userId)}&select=balance`);
      return rows[0]?.balance ?? 0;
    },
    async coinAdd(userId, delta, reason, ref) {
      return rest("rpc/coin_add", { method: "POST", body: JSON.stringify({ p_user: userId, p_delta: delta, p_reason: reason, p_ref: ref }) });
    },
    async coinSpend(userId, cost, ref) {
      return rest("rpc/coin_spend", { method: "POST", body: JSON.stringify({ p_user: userId, p_cost: cost, p_ref: ref }) });
    },
    async coinHistory(userId) {
      return rest<LedgerRow[]>(`coin_ledger?user_id=${eq(userId)}&select=delta,reason,ref,balance_after,created_at&order=id.desc&limit=30`);
    },
    async inviteCount(userId) {
      const rows = await rest<unknown[]>(`coin_ledger?user_id=${eq(userId)}&reason=eq.bonus&ref=like.invite:*&select=id`);
      return rows.length;
    },
    async checkin(userId, day, every, coins) {
      return rest("rpc/checkin", { method: "POST", body: JSON.stringify({ p_user: userId, p_day: day, p_every: every, p_coins: coins }) });
    },
    async giftSend(userId, id, coins, name, message) {
      return rest("rpc/gift_send", { method: "POST", body: JSON.stringify({ p_user: userId, p_id: id, p_coins: coins, p_name: name, p_message: message }) });
    },
    async giftClaim(id, userId) {
      return rest("rpc/gift_claim", { method: "POST", body: JSON.stringify({ p_id: id, p_user: userId }) });
    },
    async giftCancel(id, userId) {
      return rest("rpc/gift_cancel", { method: "POST", body: JSON.stringify({ p_id: id, p_user: userId }) });
    },
    async giftGet(id) {
      const rows = await rest<GiftRow[]>(`gifts?id=${eq(id)}&select=*`);
      return rows[0] ?? null;
    },
    async giftsFrom(userId) {
      return rest<GiftRow[]>(`gifts?from_user=${eq(userId)}&select=*&order=created_at.desc&limit=20`);
    },
    async pairCreate(row) {
      await rest(`pair_invites?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, { method: "DELETE" }).catch(() => null);
      await rest("pair_invites", { method: "POST", body: JSON.stringify(row) });
    },
    async pairGet(id) {
      const rows = await rest<PairRow[]>(`pair_invites?id=${eq(id)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=*`);
      return rows[0] ?? null;
    },
    async pairAnswer(id, to) {
      const rows = await rest<PairRow[]>(`pair_invites?id=${eq(id)}&answered_at=is.null`, {
        method: "PATCH",
        prefer: "return=representation",
        body: JSON.stringify({ ...to, answered_at: new Date().toISOString() }),
      });
      return rows.length > 0;
    },
    async adminStats() {
      return rest("rpc/admin_stats", { method: "POST", body: "{}" });
    },
    async adminUsers(q) {
      const term = q.replace(/[,()*%\\]/g, "").trim().slice(0, 60);
      const uuid = /^[0-9a-f-]{36}$/i.test(term);
      const filter = term
        ? `&or=${encodeURIComponent(`(email.ilike.*${term}*,nickname.ilike.*${term}*,ref_code.eq.${term}${uuid ? `,id.eq.${term}` : ""})`)}`
        : "";
      const rows = await rest<(Omit<AdminUserRow, "balance"> & { wallets: { balance: number } | { balance: number }[] | null })[]>(
        `users?select=id,provider,nickname,email,created_at,wallets(balance)${filter}&order=created_at.desc&limit=30`,
      );
      return rows.map(({ wallets, ...u }) => ({ ...u, balance: (Array.isArray(wallets) ? wallets[0]?.balance : wallets?.balance) ?? 0 }));
    },
    async adminPayments(userId) {
      return rest<PaymentRow[]>(`payments?select=*${userId ? `&user_id=${eq(userId)}` : ""}&order=created_at.desc&limit=50`);
    },
    async coinAdjust(userId, delta, reason, ref) {
      return rest("rpc/coin_adjust", { method: "POST", body: JSON.stringify({ p_user: userId, p_delta: delta, p_reason: reason, p_ref: ref }) });
    },
  };
}

// ───────────── In-memory (local dev only) ─────────────

function memory(): Db {
  type Mem = {
    users: DbUser[];
    readings: ReadingRow[];
    payments: PaymentRow[];
    wallets: Map<string, number>;
    ledger: (LedgerRow & { user_id: string })[];
    attendance: Set<string>;
    gifts: GiftRow[];
    pairs: PairRow[];
  };
  const g = globalThis as unknown as { __nyangDb?: Mem };
  const m: Mem = (g.__nyangDb ??= { users: [], readings: [], payments: [], wallets: new Map(), ledger: [], attendance: new Set(), gifts: [], pairs: [] });
  const newUser = (u: { provider: string; providerId: string; nickname: string; email: string | null; passwordHash?: string }): DbUser => ({
    id: randomUUID(),
    provider: u.provider,
    provider_id: u.providerId,
    nickname: u.nickname,
    email: u.email,
    profile: null,
    password_hash: u.passwordHash ?? null,
    ref_code: randomUUID().slice(0, 8),
    created_at: new Date().toISOString(),
  });
  const log = (userId: string, delta: number, reason: CoinReason, ref: string) => {
    const balance = (m.wallets.get(userId) ?? 0) + delta;
    m.wallets.set(userId, balance);
    m.ledger.push({ user_id: userId, delta, reason, ref, balance_after: balance, created_at: new Date().toISOString() });
    return balance;
  };
  const logged = (userId: string, reason: CoinReason, ref: string) => m.ledger.some((x) => x.user_id === userId && x.reason === reason && x.ref === ref);
  return {
    async upsertUser(u) {
      let row = m.users.find((x) => x.provider === u.provider && x.provider_id === u.providerId);
      if (!row) {
        row = newUser(u);
        m.users.push(row);
      }
      return row;
    },
    async findUser(provider, providerId) {
      return m.users.find((x) => x.provider === provider && x.provider_id === providerId) ?? null;
    },
    async createUser(u) {
      if (m.users.some((x) => x.provider === u.provider && x.provider_id === u.providerId)) throw new Error("db 409: duplicate");
      const row = newUser(u);
      m.users.push(row);
      return row;
    },
    async setPassword(id, hash) {
      const u = m.users.find((x) => x.id === id);
      if (u) u.password_hash = hash;
    },
    async userByRef(code) {
      return m.users.find((x) => x.ref_code === code) ?? null;
    },
    async setReferredBy(id, referrer) {
      const u = m.users.find((x) => x.id === id);
      if (u) u.referred_by = referrer;
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
      m.wallets.delete(id);
      m.ledger = m.ledger.filter((x) => x.user_id !== id);
    },
    async recordPayment(p) {
      if (!m.payments.some((x) => x.order_id === p.orderId))
        m.payments.push({ order_id: p.orderId, user_id: p.userId, input_hash: p.inputHash, amount: p.amount, method: p.method, created_at: new Date().toISOString() });
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
    async coins(userId) {
      return m.wallets.get(userId) ?? 0;
    },
    async coinAdd(userId, delta, reason, ref) {
      if (logged(userId, reason, ref)) return { balance: m.wallets.get(userId) ?? 0, applied: false };
      return { balance: log(userId, delta, reason, ref), applied: true };
    },
    async coinSpend(userId, cost, ref) {
      const b = m.wallets.get(userId) ?? 0;
      if (logged(userId, "spend", ref)) return { ok: true, balance: b, already: true };
      if (b < cost) return { ok: false, balance: b, already: false };
      return { ok: true, balance: log(userId, -cost, "spend", ref), already: false };
    },
    async coinHistory(userId) {
      return m.ledger
        .filter((x) => x.user_id === userId)
        .reverse()
        .slice(0, 30)
        .map(({ delta, reason, ref, balance_after, created_at }) => ({ delta, reason, ref, balance_after, created_at }));
    },
    async inviteCount(userId) {
      return m.ledger.filter((x) => x.user_id === userId && x.reason === "bonus" && x.ref.startsWith("invite:")).length;
    },
    async checkin(userId, day, every, coins) {
      m.attendance.add(`${userId}|${day}`);
      let n = 0;
      const d = new Date(`${day}T00:00:00Z`);
      while (m.attendance.has(`${userId}|${d.toISOString().slice(0, 10)}`)) {
        n++;
        d.setUTCDate(d.getUTCDate() - 1);
      }
      let rewarded = false;
      if (every > 0 && coins > 0 && n % every === 0 && !logged(userId, "bonus", `streak:${day}`)) {
        log(userId, coins, "bonus", `streak:${day}`);
        rewarded = true;
      }
      return { streak: n, rewarded };
    },
    async giftSend(userId, id, coins, name, message) {
      const b = m.wallets.get(userId) ?? 0;
      if (b < coins) return { ok: false, balance: b };
      m.gifts.push({ id, from_user: userId, from_name: name, coins, message, claimed_by: null, claimed_at: null, cancelled_at: null, created_at: new Date().toISOString() });
      return { ok: true, balance: log(userId, -coins, "gift", `send:${id}`) };
    },
    async giftClaim(id, userId) {
      const gift = m.gifts.find((x) => x.id === id);
      if (!gift) return { ok: false, reason: "none" };
      if (gift.cancelled_at) return { ok: false, reason: "cancelled" };
      if (gift.claimed_by) return { ok: gift.claimed_by === userId, reason: gift.claimed_by === userId ? "mine" : "taken", coins: gift.coins };
      if (gift.from_user === userId) return { ok: false, reason: "self" };
      gift.claimed_by = userId;
      gift.claimed_at = new Date().toISOString();
      return { ok: true, coins: gift.coins, balance: log(userId, gift.coins, "gift", `recv:${id}`) };
    },
    async giftCancel(id, userId) {
      const gift = m.gifts.find((x) => x.id === id);
      if (!gift || gift.from_user !== userId || gift.claimed_by || gift.cancelled_at) return { ok: false };
      gift.cancelled_at = new Date().toISOString();
      return { ok: true, balance: log(userId, gift.coins, "gift", `cancel:${id}`) };
    },
    async giftGet(id) {
      return m.gifts.find((x) => x.id === id) ?? null;
    },
    async giftsFrom(userId) {
      return m.gifts.filter((x) => x.from_user === userId).reverse();
    },
    async pairCreate(row) {
      const now = Date.now();
      m.pairs = m.pairs.filter((x) => Date.parse(x.expires_at) > now);
      m.pairs.push({ ...row, to_person: null, to_self: null, to_obs: null, answered_at: null, created_at: new Date().toISOString(), expires_at: new Date(now + 30 * 864e5).toISOString() });
    },
    async pairGet(id) {
      return m.pairs.find((x) => x.id === id && Date.parse(x.expires_at) > Date.now()) ?? null;
    },
    async pairAnswer(id, to) {
      const p = m.pairs.find((x) => x.id === id);
      if (!p || p.answered_at) return false;
      Object.assign(p, to, { answered_at: new Date().toISOString() });
      return true;
    },
    async adminStats() {
      const toss = m.payments.filter((x) => x.method === "toss");
      return { users: m.users.length, usersToday: m.users.length, users7d: m.users.length, salesToday: 0, sales7d: 0, sales30d: 0, salesAll: toss.reduce((a, x) => a + x.amount, 0), paidCount30d: toss.length, coinsOut: [...m.wallets.values()].reduce((a, v) => a + v, 0), coinsSpent30d: -m.ledger.filter((x) => x.reason === "spend").reduce((a, x) => a + x.delta, 0), readings: m.readings.length, pairs: m.pairs.length, pairsAnswered: m.pairs.filter((x) => x.answered_at).length, gifts: m.gifts.length, testMode: m.payments.some((x) => x.method === "test") };
    },
    async adminUsers(q) {
      const t = q.trim().toLowerCase();
      return m.users
        .filter((u) => !t || u.email?.toLowerCase().includes(t) || u.nickname.toLowerCase().includes(t) || u.ref_code === t || u.id === t)
        .reverse()
        .slice(0, 30)
        .map((u) => ({ id: u.id, provider: u.provider, nickname: u.nickname, email: u.email, created_at: u.created_at, balance: m.wallets.get(u.id) ?? 0 }));
    },
    async adminPayments(userId) {
      return m.payments.filter((x) => !userId || x.user_id === userId).reverse().slice(0, 50);
    },
    async coinAdjust(userId, delta, reason, ref) {
      const b = m.wallets.get(userId) ?? 0;
      if (b + delta < 0) return { ok: false, balance: b };
      return { ok: true, balance: log(userId, delta, reason, ref) };
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
