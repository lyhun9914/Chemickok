import "server-only";
import { INVITE_COINS, INVITE_LIMIT, WELCOME_COINS } from "@/lib/config";
import type { Db, DbUser } from "./db";

/** Set in the browser when someone arrives through a friend's link (?ref=code); read when their account is made. */
export const REF_COOKIE = "nyang_ref";

/**
 * A brand-new account: the welcome coins, and — if a friend's link brought them — the 친구 초대 coins for both.
 * Gifts go only to Kakao / Naver / Google accounts (one per real person, more or less); an email account is free to make
 * a thousand of. Returns what was given, for the welcome notice. Never throws: a gift must not block a login.
 */
export async function giftNewUser(db: Db, user: DbUser, refCode: string | undefined): Promise<{ welcome: number; invited: number }> {
  const given = { welcome: 0, invited: 0 };
  try {
    const referrer = refCode && /^[\w-]{4,16}$/.test(refCode) ? await db.userByRef(refCode) : null;
    if (referrer && referrer.id !== user.id) await db.setReferredBy(user.id, referrer.id);
    if (user.provider === "email") return given;
    if (WELCOME_COINS > 0 && (await db.coinAdd(user.id, WELCOME_COINS, "bonus", "welcome")).applied) given.welcome = WELCOME_COINS;
    if (referrer && referrer.id !== user.id && INVITE_COINS > 0 && (await db.inviteCount(referrer.id)) < INVITE_LIMIT) {
      if ((await db.coinAdd(user.id, INVITE_COINS, "bonus", "joined")).applied) given.invited = INVITE_COINS;
      await db.coinAdd(referrer.id, INVITE_COINS, "bonus", `invite:${user.id}`);
    }
  } catch (e) {
    console.error("gifts failed", e);
  }
  return given;
}

/** ?gift=… on the redirect home, so the page can say what landed in the 복주머니. */
export const giftQuery = (g: { welcome: number; invited: number }) => (g.welcome + g.invited ? `&gift=${g.welcome + g.invited}${g.invited ? "&invited=1" : ""}` : "");
