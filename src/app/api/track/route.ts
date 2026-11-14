import { after, type NextRequest } from "next/server";
import { getDb, type TrackRun } from "@/services/server/db";

/**
 * POST /api/track — 이용 흐름: a visit, or one step of an interview (start · q · result · paysheet · paid) or a mini
 * game opened, or a share button pressed (where · which reading · which channel). Sent with sendBeacon (plain text); nothing personal, just random ids, the product and how far it got.
 */

const ID = /^[\w-]{8,40}$/;
const PRODUCTS = new Set(["love", "solo", "couple", "newyear", "saju", "daeun", "reunion", "spouse"]);
const GAMES = new Set(["today", "daily", "tarot", "zodiac", "name", "ilju", "contact", "exam"]);
const STATUSES = new Set(["crush", "dating", "slump", "breakup"]);
const DEVICES = new Set(["mobile", "pc", "kakao-app", "in-app"]);
const STEPS = new Set<TrackRun["t"]>(["start", "q", "result", "paysheet", "paid", "game"]);
const SURFACES = new Set(["result", "handoff", "game", "invite"]);
const CHANNELS = new Set(["kakao", "story", "qr", "copy"]);

const product = (p: unknown) =>
  typeof p === "string" && (PRODUCTS.has(p) || (p.startsWith("game:") && GAMES.has(p.slice(5)))) ? p : null;
const utm = (s: unknown) => (typeof s === "string" && s.trim() ? s.trim().slice(0, 40) : null);
const small = (n: unknown) => (typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 60 ? n : null);

export async function POST(req: NextRequest) {
  const db = getDb();
  const ua = req.headers.get("user-agent") ?? "";
  let b: Record<string, unknown> | null = null;
  try {
    b = JSON.parse((await req.text()).slice(0, 2000));
  } catch {
    /* not JSON */
  }
  if (!db || !b || /bot|crawler|spider/i.test(ua)) return new Response(null, { status: 204 });

  if (b.t === "visit") {
    if (typeof b.id !== "string" || !ID.test(b.id)) return new Response(null, { status: 204 });
    const v = {
      id: b.id,
      source: typeof b.source === "string" && b.source.trim() ? b.source.trim().slice(0, 40) : "직접 방문",
      device: typeof b.device === "string" && DEVICES.has(b.device) ? b.device : "mobile",
      medium: utm(b.medium),
      campaign: utm(b.campaign),
    };
    after(() => db.trackVisit(v).catch((e) => console.error("track visit", e)));
    return new Response(null, { status: 204 });
  }

  if (b.t === "share") {
    if (typeof b.surface !== "string" || !SURFACES.has(b.surface) || typeof b.channel !== "string" || !CHANNELS.has(b.channel))
      return new Response(null, { status: 204 });
    const e = { visit: typeof b.visit === "string" && ID.test(b.visit) ? b.visit : null, surface: b.surface, channel: b.channel, mode: product(b.mode) };
    after(() => db.trackShare(e).catch((err) => console.error("track share", err)));
    return new Response(null, { status: 204 });
  }

  const t = b.t as TrackRun["t"];
  if (!STEPS.has(t) || typeof b.run !== "string" || !ID.test(b.run)) return new Response(null, { status: 204 });
  const e: TrackRun = {
    t,
    run: b.run,
    visit: typeof b.visit === "string" && ID.test(b.visit) ? b.visit : null,
    product: product(b.product),
    status: typeof b.status === "string" && STATUSES.has(b.status) ? b.status : null,
    n: small(b.n),
    total: small(b.total),
  };
  after(() => db.trackRun(e).catch((err) => console.error("track run", err)));
  return new Response(null, { status: 204 });
}
