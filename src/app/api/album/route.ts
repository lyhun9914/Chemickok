import { randomInt } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { allIlju, iljuCard, type IljuCard } from "@/engine/ilju";
import { ALBUM_MILESTONES, ALBUM_SIZE } from "@/lib/catAlbum";
import { kstDay } from "@/lib/kst";
import { getDb, type CatCardRow, type Db, type DbUser } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";

/** what the album shows of a cat */
const brief = (c: IljuCard) => ({ no: c.no, ganji: c.ganji, hanja: c.hanja, name: c.name, icon: c.icon, keys: c.keys, trait: c.trait, rank: c.rank });
/** 무료 냥 only for accounts that can't be mass-made (같은 기준: 가입 선물 · 쿠폰) */
const rewardable = (u: DbUser) => u.provider !== "email";

async function albumOf(db: Db, uid: string, user: DbUser, cards: CatCardRow[]) {
  const all = allIlju();
  const today = kstDay();
  return {
    size: ALBUM_SIZE,
    cards: cards.map((c) => ({ ...brief(all[c.no - 1]), day: c.got_day })),
    drawnToday: cards.some((c) => c.got_day === today),
    milestones: ALBUM_MILESTONES.map((m) => ({ ...m, done: cards.length >= m.at })),
    rewards: rewardable(user),
    mine: user.profile?.birthdate ? (iljuCard(user.profile.birthdate)?.no ?? null) : null,
    balance: await db.coins(uid),
  };
}

/** GET /api/album — 내 고양이 도감: the cats collected so far and whether today's card is drawn. */
export async function GET(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  const user = db && uid ? await db.getUser(uid) : null;
  if (!db || !uid || !user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  return NextResponse.json(await albumOf(db, uid, user, await db.catCards(uid)));
}

/**
 * POST /api/album — 오늘의 고양이 뽑기 (KST 하루 한 장). Never a cat already in the album; the first card is the member's own
 * 일주 cat when the profile has a birthday. Reaching 10 · 30 · 60 cats adds 냥 (once each).
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  const user = db && uid ? await db.getUser(uid) : null;
  if (!db || !uid || !user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const owned = await db.catCards(uid);
  const today = kstDay();
  const done = owned.find((c) => c.got_day === today);
  if (done) return NextResponse.json({ ...(await albumOf(db, uid, user, owned)), error: "오늘은 이미 뽑았다냥. 내일 또 와라냥 🐾", card: brief(allIlju()[done.no - 1]) }, { status: 409 });
  if (owned.length >= ALBUM_SIZE) return NextResponse.json({ ...(await albumOf(db, uid, user, owned)), error: "60마리를 다 모았다냥! 🎉" }, { status: 409 });

  const have = new Set(owned.map((c) => c.no));
  const left = Array.from({ length: ALBUM_SIZE }, (_, i) => i + 1).filter((n) => !have.has(n));
  const own = user.profile?.birthdate ? iljuCard(user.profile.birthdate)?.no : undefined;
  const pick = !owned.length && own && !have.has(own) ? own : left[randomInt(left.length)];
  const r = await db.catDraw(uid, today, pick);
  const after = await db.catCards(uid);
  if (!r.ok) {
    const t = after.find((c) => c.got_day === today);
    return NextResponse.json({ ...(await albumOf(db, uid, user, after)), error: "오늘은 이미 뽑았다냥. 내일 또 와라냥 🐾", card: t ? brief(allIlju()[t.no - 1]) : null }, { status: 409 });
  }
  let reward = 0;
  if (rewardable(user))
    for (const m of ALBUM_MILESTONES)
      if (after.length >= m.at && (await db.coinAdd(uid, m.coins, "bonus", `album:${m.at}`)).applied) reward += m.coins;
  return NextResponse.json({ ...(await albumOf(db, uid, user, after)), card: brief(allIlju()[pick - 1]), first: pick === own && owned.length === 0, reward });
}
