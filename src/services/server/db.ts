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

/** What 전체 백업 takes, in the order a restore would put them back. */
const BACKUP_TABLES = ["users", "wallets", "coin_ledger", "payments", "readings", "gifts", "pair_invites", "attendance", "coupons", "coupon_redemptions", "app_settings", "admin_actions", "withdrawn_accounts"];

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
  /** Toss paymentKey (needed to cancel); null for 냥 / test payments and rows from before it was kept */
  payment_key?: string | null;
  refunded_at?: string | null;
  refund_amount?: number | null;
  refund_coins?: number | null;
  refund_note?: string | null;
  /** 냥 a 충전 put in (with any 세일 bonus); null on older rows */
  coins?: number | null;
}

/** A payment with who paid (관리자 lists). */
export interface AdminPaymentRow extends PaymentRow {
  user: { nickname: string; email: string | null; provider: string } | null;
}

export interface Coupon {
  code: string;
  coins: number;
  max_uses: number | null;
  used: number;
  expires_at: string | null;
  social_only: boolean;
  active: boolean;
  note: string | null;
  created_at: string;
}

export interface AdminAction {
  id: number;
  created_at: string;
  action: string;
  target: string | null;
  detail: string | null;
}

/** 이용 흐름: one step of an interview (or a mini game opened). */
export interface TrackRun {
  t: "start" | "q" | "result" | "paysheet" | "paid" | "game";
  run: string;
  visit: string | null;
  product: string | null;
  status: string | null;
  n: number | null;
  total: number | null;
}

export interface Funnel {
  visits: number;
  started: number;
  firstQ: number;
  half: number;
  allQ: number;
  result: number;
  paysheet: number;
  paid: number;
  /** runs that never reached a result, by the last question answered */
  drop: Record<string, number>;
  products: { product: string; started: number; result: number; paid: number }[];
  statuses: { status: string; started: number; result: number; paid: number }[];
  games: { product: string; started: number }[];
  sources: { source: string; n: number }[];
  devices: { device: string; n: number }[];
  days: { day: string; visits: number; started: number; paid: number }[];
}

export interface ErrorLog {
  source: "client" | "server" | "api";
  fingerprint: string;
  message: string;
  path: string | null;
  detail: string | null;
  ua: string | null;
}
export interface ErrorGroup extends ErrorLog {
  count: number;
  first: string;
  last: string;
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
  /** 탈퇴 기록 (HMAC of provider:provider_id): kept a year so a re-join doesn't get the 가입 선물 again */
  markWithdrawn(key: string): Promise<void>;
  wasWithdrawn(key: string): Promise<boolean>;
  recordPayment(p: { orderId: string; userId: string | null; inputHash: string; amount: number; method: string; paymentKey?: string; coins?: number }): Promise<void>;
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
  /** newest first; by member, by order id or member name/email (q), and/or a time range */
  adminPayments(o?: { userId?: string; q?: string; from?: string; to?: string; limit?: number }): Promise<AdminPaymentRow[]>;
  /** by hand (보상 · 환불 · 회수); never below zero */
  coinAdjust(userId: string, delta: number, reason: "admin" | "refund", ref: string): Promise<{ ok: boolean; balance: number }>;
  getPayment(orderId: string): Promise<PaymentRow | null>;
  /** Marks a payment refunded; false when it already was (two clicks, two tabs). */
  markRefund(orderId: string, r: { amount: number; coins: number; note: string }): Promise<boolean>;

  /** 이용 흐름 */
  trackVisit(v: { id: string; source: string; device: string }): Promise<void>;
  trackRun(e: TrackRun): Promise<void>;
  adminFunnel(since: string, product?: string, status?: string): Promise<Funnel>;

  /** 오류 기록: true when this kind of error is new in the last day */
  logError(e: ErrorLog): Promise<boolean>;
  adminErrors(since: string): Promise<ErrorGroup[]>;
  adminClearErrors(fingerprint: string): Promise<void>;

  /** 설정 (pricing · sale · banner) */
  getSettings(): Promise<Record<string, unknown>>;
  setSetting(key: string, value: unknown): Promise<void>;
  /** 관리 작업 기록 */
  audit(action: string, target: string | null, detail: string | null): Promise<void>;
  adminActions(limit: number): Promise<AdminAction[]>;
  /** 전체 백업: every table that holds members, money and readings, row by row (not the anonymous 이용 흐름 or 오류 logs) */
  backupTables(): Promise<Record<string, unknown[]>>;
  /** 쿠폰 */
  couponCreate(c: Pick<Coupon, "code" | "coins" | "max_uses" | "expires_at" | "social_only" | "note">): Promise<boolean>;
  couponList(): Promise<Coupon[]>;
  couponSetActive(code: string, active: boolean): Promise<void>;
  couponRedeem(code: string, userId: string): Promise<{ ok: boolean; reason?: string; coins?: number; balance?: number }>;
  /** 하루 요약 (KST day yyyy-mm-dd) */
  adminDay(day: string): Promise<Record<string, number | string>>;
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
    async markWithdrawn(key) {
      await rest("withdrawn_accounts?on_conflict=key", {
        method: "POST",
        prefer: "resolution=merge-duplicates",
        body: JSON.stringify({ key, withdrawn_at: new Date().toISOString() }),
      });
      await rest(`withdrawn_accounts?withdrawn_at=lt.${encodeURIComponent(new Date(Date.now() - 365 * 864e5).toISOString())}`, { method: "DELETE" }).catch(() => null);
    },
    async wasWithdrawn(key) {
      const since = new Date(Date.now() - 365 * 864e5).toISOString();
      const rows = await rest<unknown[]>(`withdrawn_accounts?key=${eq(key)}&withdrawn_at=gt.${encodeURIComponent(since)}&select=key`);
      return rows.length > 0;
    },
    async recordPayment(p) {
      await rest("payments?on_conflict=order_id", {
        method: "POST",
        prefer: "resolution=ignore-duplicates",
        body: JSON.stringify({ order_id: p.orderId, user_id: p.userId, input_hash: p.inputHash, amount: p.amount, method: p.method, payment_key: p.paymentKey ?? null, coins: p.coins ?? null }),
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
    async adminPayments(o = {}) {
      const f: string[] = [];
      if (o.userId) f.push(`user_id=${eq(o.userId)}`);
      if (o.from) f.push(`created_at=gte.${encodeURIComponent(o.from)}`);
      if (o.to) f.push(`created_at=lt.${encodeURIComponent(o.to)}`);
      const term = (o.q ?? "").replace(/[,()*%\\]/g, "").trim().slice(0, 60);
      if (term) {
        const ids = (await this.adminUsers(term)).map((u) => u.id);
        const ors = [`order_id.ilike.*${term}*`, ...(ids.length ? [`user_id.in.(${ids.join(",")})`] : [])];
        f.push(`or=${encodeURIComponent(`(${ors.join(",")})`)}`);
      }
      const rows = await rest<(PaymentRow & { users: AdminPaymentRow["user"] })[]>(
        `payments?select=*,users(nickname,email,provider)${f.map((x) => `&${x}`).join("")}&order=created_at.desc&limit=${Math.min(o.limit ?? 50, 5000)}`,
      );
      return rows.map(({ users, ...p }) => ({ ...p, user: users ?? null }));
    },
    async coinAdjust(userId, delta, reason, ref) {
      return rest("rpc/coin_adjust", { method: "POST", body: JSON.stringify({ p_user: userId, p_delta: delta, p_reason: reason, p_ref: ref }) });
    },
    async getPayment(orderId) {
      const rows = await rest<PaymentRow[]>(`payments?order_id=${eq(orderId)}&select=*`);
      return rows[0] ?? null;
    },
    async markRefund(orderId, r) {
      const rows = await rest<PaymentRow[]>(`payments?order_id=${eq(orderId)}&refunded_at=is.null`, {
        method: "PATCH",
        prefer: "return=representation",
        body: JSON.stringify({ refunded_at: new Date().toISOString(), refund_amount: r.amount, refund_coins: r.coins, refund_note: r.note || null }),
      });
      return rows.length > 0;
    },
    async trackVisit(v) {
      await rest("visits?on_conflict=id", { method: "POST", prefer: "resolution=ignore-duplicates", body: JSON.stringify(v) });
    },
    async trackRun(e) {
      await rest("rpc/track_run", {
        method: "POST",
        body: JSON.stringify({ p_t: e.t, p_run: e.run, p_visit: e.visit, p_product: e.product, p_status: e.status, p_n: e.n, p_total: e.total }),
      });
    },
    async adminFunnel(since, product, status) {
      return rest("rpc/admin_funnel", { method: "POST", body: JSON.stringify({ p_since: since, p_product: product ?? null, p_status: status ?? null }) });
    },
    async logError(e) {
      return rest("rpc/log_error", {
        method: "POST",
        body: JSON.stringify({ p_source: e.source, p_fp: e.fingerprint, p_message: e.message, p_path: e.path, p_detail: e.detail, p_ua: e.ua }),
      });
    },
    async adminErrors(since) {
      return rest("rpc/admin_errors", { method: "POST", body: JSON.stringify({ p_since: since }) });
    },
    async adminClearErrors(fingerprint) {
      await rest(`error_logs?fingerprint=${eq(fingerprint)}`, { method: "DELETE" });
    },
    async getSettings() {
      const rows = await rest<{ key: string; value: unknown }[]>("app_settings?select=key,value");
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    },
    async setSetting(key, value) {
      await rest("app_settings?on_conflict=key", {
        method: "POST",
        prefer: "resolution=merge-duplicates",
        body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
      });
    },
    async audit(action, target, detail) {
      await rest("admin_actions", { method: "POST", body: JSON.stringify({ action, target, detail }) });
    },
    async adminActions(limit) {
      return rest<AdminAction[]>(`admin_actions?select=*&order=id.desc&limit=${limit}`);
    },
    async backupTables() {
      const out: Record<string, unknown[]> = {};
      for (const t of BACKUP_TABLES) {
        const rows: unknown[] = [];
        for (let from = 0; ; from += 1000) {
          const page = await rest<unknown[]>(`${t}?select=*&limit=1000&offset=${from}`);
          rows.push(...page);
          if (page.length < 1000) break;
        }
        out[t] = rows;
      }
      return out;
    },
    async couponCreate(c) {
      try {
        await rest("coupons", { method: "POST", body: JSON.stringify(c) });
        return true;
      } catch (e) {
        if (/db 409/.test(String(e))) return false;
        throw e;
      }
    },
    async couponList() {
      return rest<Coupon[]>("coupons?select=*&order=created_at.desc&limit=100");
    },
    async couponSetActive(code, active) {
      await rest(`coupons?code=${eq(code)}`, { method: "PATCH", body: JSON.stringify({ active }) });
    },
    async couponRedeem(code, userId) {
      return rest("rpc/coupon_redeem", { method: "POST", body: JSON.stringify({ p_code: code, p_user: userId }) });
    },
    async adminDay(day) {
      return rest("rpc/admin_day", { method: "POST", body: JSON.stringify({ p_day: day }) });
    },
  };
}

// ───────────── In-memory (local dev only) ─────────────

const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

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
    visits: { id: string; day: string; source: string; device: string }[];
    runs: { id: string; visit_id: string | null; day: string; product: string; status: string | null; total_q: number; max_q: number; result_at: string | null; paysheet_at: string | null; paid_at: string | null }[];
    errors: (ErrorLog & { created_at: string })[];
    settings: Record<string, unknown>;
    withdrawn: Map<string, number>;
    actions: AdminAction[];
    coupons: Coupon[];
    redemptions: { code: string; user_id: string; created_at: string }[];
  };
  const g = globalThis as unknown as { __nyangDb?: Mem };
  const m: Mem = (g.__nyangDb ??= { users: [], readings: [], payments: [], wallets: new Map(), ledger: [], attendance: new Set(), gifts: [], pairs: [], visits: [], runs: [], errors: [], settings: {}, withdrawn: new Map(), actions: [], coupons: [], redemptions: [] });
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
    async markWithdrawn(key) {
      m.withdrawn.set(key, Date.now());
    },
    async wasWithdrawn(key) {
      return Date.now() - (m.withdrawn.get(key) ?? 0) < 365 * 864e5;
    },
    async deleteUser(id) {
      m.users = m.users.filter((x) => x.id !== id);
      m.readings = m.readings.filter((x) => x.user_id !== id);
      m.wallets.delete(id);
      m.ledger = m.ledger.filter((x) => x.user_id !== id);
    },
    async recordPayment(p) {
      if (!m.payments.some((x) => x.order_id === p.orderId))
        m.payments.push({ order_id: p.orderId, user_id: p.userId, input_hash: p.inputHash, amount: p.amount, method: p.method, created_at: new Date().toISOString(), payment_key: p.paymentKey ?? null, coins: p.coins ?? null });
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
      return { users: m.users.length, usersToday: m.users.length, users7d: m.users.length, salesToday: 0, sales7d: 0, sales30d: 0, salesAll: toss.reduce((a, x) => a + x.amount - (x.refund_amount ?? 0), 0), paidCount30d: toss.length, refunds30d: toss.reduce((a, x) => a + (x.refund_amount ?? 0), 0), errors24h: m.errors.length, coinsOut: [...m.wallets.values()].reduce((a, v) => a + v, 0), coinsSpent30d: -m.ledger.filter((x) => x.reason === "spend").reduce((a, x) => a + x.delta, 0), readings: m.readings.length, pairs: m.pairs.length, pairsAnswered: m.pairs.filter((x) => x.answered_at).length, gifts: m.gifts.length, testMode: m.payments.some((x) => x.method === "test") };
    },
    async adminUsers(q) {
      const t = q.trim().toLowerCase();
      return m.users
        .filter((u) => !t || u.email?.toLowerCase().includes(t) || u.nickname.toLowerCase().includes(t) || u.ref_code === t || u.id === t)
        .reverse()
        .slice(0, 30)
        .map((u) => ({ id: u.id, provider: u.provider, nickname: u.nickname, email: u.email, created_at: u.created_at, balance: m.wallets.get(u.id) ?? 0 }));
    },
    async adminPayments(o = {}) {
      const t = (o.q ?? "").trim().toLowerCase();
      const ids = t ? new Set((await this.adminUsers(t)).map((u) => u.id)) : null;
      return m.payments
        .filter((x) => (!o.userId || x.user_id === o.userId) && (!o.from || x.created_at >= o.from) && (!o.to || x.created_at < o.to))
        .filter((x) => !ids || x.order_id.toLowerCase().includes(t) || (x.user_id && ids.has(x.user_id)))
        .reverse()
        .slice(0, o.limit ?? 50)
        .map((x) => {
          const u = m.users.find((y) => y.id === x.user_id);
          return { ...x, user: u ? { nickname: u.nickname, email: u.email, provider: u.provider } : null };
        });
    },
    async coinAdjust(userId, delta, reason, ref) {
      const b = m.wallets.get(userId) ?? 0;
      if (b + delta < 0) return { ok: false, balance: b };
      return { ok: true, balance: log(userId, delta, reason, ref) };
    },
    async getPayment(orderId) {
      return m.payments.find((x) => x.order_id === orderId) ?? null;
    },
    async markRefund(orderId, r) {
      const p = m.payments.find((x) => x.order_id === orderId);
      if (!p || p.refunded_at) return false;
      Object.assign(p, { refunded_at: new Date().toISOString(), refund_amount: r.amount, refund_coins: r.coins, refund_note: r.note || null });
      return true;
    },
    async trackVisit(v) {
      if (!m.visits.some((x) => x.id === v.id)) m.visits.push({ ...v, day: kstDay() });
    },
    async trackRun(e) {
      let r = m.runs.find((x) => x.id === e.run);
      if (!r) {
        r = { id: e.run, visit_id: e.visit, day: kstDay(), product: e.product ?? "love", status: e.status, total_q: e.total ?? 0, max_q: 0, result_at: null, paysheet_at: null, paid_at: null };
        m.runs.push(r);
      }
      const now = new Date().toISOString();
      if (e.product) r.product = e.product;
      if (e.status) r.status = e.status;
      if (e.total) r.total_q = e.total;
      r.max_q = Math.max(r.max_q, e.n ?? 0);
      if (e.t === "result") r.result_at ??= now;
      if (e.t === "paysheet") r.paysheet_at ??= now;
      if (e.t === "paid") r.paid_at ??= now;
    },
    async adminFunnel(since, product, status) {
      const game = (x: { product: string }) => x.product.startsWith("game:");
      const all = m.runs.filter((x) => x.day >= since);
      const r = all.filter((x) => !game(x) && (!product || x.product === product) && (!status || x.status === status));
      const v = m.visits.filter((x) => x.day >= since);
      const count = <T,>(xs: T[], key: (x: T) => string) => xs.reduce<Record<string, T[]>>((a, x) => ((a[key(x)] ??= []).push(x), a), {});
      const drop: Record<string, number> = {};
      for (const x of r) if (!x.result_at) drop[x.max_q] = (drop[x.max_q] ?? 0) + 1;
      const tally = (xs: typeof r) => ({ started: xs.length, result: xs.filter((x) => x.result_at).length, paid: xs.filter((x) => x.paid_at).length });
      const days: Funnel["days"] = [];
      for (let d = since; d <= kstDay(); d = new Date(Date.parse(d) + 864e5).toISOString().slice(0, 10))
        days.push({ day: d, visits: m.visits.filter((x) => x.day === d).length, started: m.runs.filter((x) => x.day === d && !game(x)).length, paid: m.runs.filter((x) => x.day === d && x.paid_at).length });
      return {
        visits: v.length,
        started: r.length,
        firstQ: r.filter((x) => x.max_q >= 1).length,
        half: r.filter((x) => x.total_q > 0 && x.max_q * 2 >= x.total_q).length,
        allQ: r.filter((x) => x.total_q > 0 && x.max_q >= x.total_q).length,
        result: r.filter((x) => x.result_at).length,
        paysheet: r.filter((x) => x.paysheet_at).length,
        paid: r.filter((x) => x.paid_at).length,
        drop,
        products: Object.entries(count(all.filter((x) => !game(x)), (x) => x.product)).map(([p, xs]) => ({ product: p, ...tally(xs) })).sort((a, b) => b.started - a.started),
        statuses: Object.entries(count(all.filter((x) => x.product === "couple" && x.status), (x) => x.status!)).map(([st, xs]) => ({ status: st, ...tally(xs) })).sort((a, b) => b.started - a.started),
        games: Object.entries(count(all.filter(game), (x) => x.product)).map(([p, xs]) => ({ product: p, started: xs.length })).sort((a, b) => b.started - a.started),
        sources: Object.entries(count(v, (x) => x.source)).map(([source, xs]) => ({ source, n: xs.length })).sort((a, b) => b.n - a.n).slice(0, 10),
        devices: Object.entries(count(v, (x) => x.device)).map(([device, xs]) => ({ device, n: xs.length })).sort((a, b) => b.n - a.n),
        days,
      };
    },
    async logError(e) {
      const now = Date.now();
      const recent = (ms: number) => m.errors.filter((x) => now - Date.parse(x.created_at) < ms);
      if (recent(600e3).length >= 300) return false;
      const same = m.errors.filter((x) => x.fingerprint === e.fingerprint);
      if (same.filter((x) => now - Date.parse(x.created_at) < 600e3).length >= 50) return false;
      // at most 20 new kinds mail the 관리자 in a day (same caps as log_error in 0008)
      const fresh = !same.some((x) => now - Date.parse(x.created_at) < 864e5) && new Set(recent(864e5).map((x) => x.fingerprint)).size < 20;
      m.errors.push({ ...e, created_at: new Date().toISOString() });
      return fresh;
    },
    async adminErrors(since) {
      const groups = new Map<string, ErrorGroup>();
      for (const x of m.errors.filter((x) => x.created_at >= since)) {
        const g = groups.get(x.fingerprint);
        if (!g) groups.set(x.fingerprint, { ...x, count: 1, first: x.created_at, last: x.created_at });
        else Object.assign(g, { ...x, count: g.count + 1, first: g.first, last: x.created_at });
      }
      return [...groups.values()].sort((a, b) => b.last.localeCompare(a.last));
    },
    async adminClearErrors(fingerprint) {
      m.errors = m.errors.filter((x) => x.fingerprint !== fingerprint);
    },
    async getSettings() {
      return { ...m.settings };
    },
    async setSetting(key, value) {
      m.settings[key] = value;
    },
    async audit(action, target, detail) {
      m.actions.push({ id: m.actions.length + 1, created_at: new Date().toISOString(), action, target, detail });
    },
    async adminActions(limit) {
      return [...m.actions].reverse().slice(0, limit);
    },
    async backupTables() {
      return {
        users: m.users,
        wallets: [...m.wallets].map(([user_id, balance]) => ({ user_id, balance })),
        coin_ledger: m.ledger,
        payments: m.payments,
        readings: m.readings,
        gifts: m.gifts,
        pair_invites: m.pairs,
        attendance: [...m.attendance],
        coupons: m.coupons,
        coupon_redemptions: m.redemptions,
        app_settings: Object.entries(m.settings).map(([key, value]) => ({ key, value })),
        admin_actions: m.actions,
        withdrawn_accounts: [...m.withdrawn].map(([key, at]) => ({ key, at })),
      };
    },
    async couponCreate(c) {
      if (m.coupons.some((x) => x.code === c.code)) return false;
      m.coupons.push({ ...c, used: 0, active: true, created_at: new Date().toISOString() });
      return true;
    },
    async couponList() {
      return [...m.coupons].reverse();
    },
    async couponSetActive(code, active) {
      const c = m.coupons.find((x) => x.code === code);
      if (c) c.active = active;
    },
    async couponRedeem(code, userId) {
      const c = m.coupons.find((x) => x.code === code.trim().toUpperCase());
      if (!c) return { ok: false, reason: "none" };
      if (m.redemptions.some((x) => x.code === c.code && x.user_id === userId)) return { ok: false, reason: "used" };
      if (!c.active) return { ok: false, reason: "off" };
      if (c.expires_at && Date.parse(c.expires_at) < Date.now()) return { ok: false, reason: "expired" };
      if (c.max_uses !== null && c.used >= c.max_uses) return { ok: false, reason: "full" };
      const u = m.users.find((x) => x.id === userId);
      if (c.social_only && (!u || u.provider === "email" || u.provider === "dev")) return { ok: false, reason: "social" };
      m.redemptions.push({ code: c.code, user_id: userId, created_at: new Date().toISOString() });
      c.used++;
      return { ok: true, coins: c.coins, balance: log(userId, c.coins, "bonus", `coupon:${c.code}`) };
    },
    async adminDay(day) {
      const a = new Date(`${day}T00:00:00+09:00`).toISOString();
      const b = new Date(Date.parse(a) + 864e5).toISOString();
      const inDay = (t?: string | null) => Boolean(t && t >= a && t < b);
      const toss = m.payments.filter((x) => x.method === "toss");
      const r = m.runs.filter((x) => x.day === day);
      return {
        day,
        visits: m.visits.filter((x) => x.day === day).length,
        started: r.filter((x) => !x.product.startsWith("game:")).length,
        results: r.filter((x) => x.result_at).length,
        games: r.filter((x) => x.product.startsWith("game:")).length,
        paidCount: toss.filter((x) => inDay(x.created_at)).length,
        sales: toss.filter((x) => inDay(x.created_at)).reduce((s, x) => s + x.amount, 0),
        refunds: toss.filter((x) => inDay(x.refunded_at)).reduce((s, x) => s + (x.refund_amount ?? 0), 0),
        refundCount: toss.filter((x) => inDay(x.refunded_at)).length,
        newUsers: m.users.filter((x) => x.provider !== "dev" && inDay(x.created_at)).length,
        coinsSpent: -m.ledger.filter((x) => x.reason === "spend" && inDay(x.created_at)).reduce((s, x) => s + x.delta, 0),
        coupons: m.redemptions.filter((x) => inDay(x.created_at)).length,
        errors: m.errors.filter((x) => inDay(x.created_at)).length,
        errorKinds: new Set(m.errors.filter((x) => inDay(x.created_at)).map((x) => x.fingerprint)).size,
      };
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
