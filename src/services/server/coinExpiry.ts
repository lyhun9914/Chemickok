import { coinLots, dueLots } from "@/lib/coinLots";
import type { Db } from "./db";

/**
 * 유효기간이 지난 충전 냥 정리 (매일 아침 cron). Each 충전 whose year is over loses what is left of it, recorded as
 * 'expire' once per 충전, so running it twice changes nothing.
 */
export async function expireDueCoins(db: Db, now = new Date()): Promise<{ users: number; coins: number }> {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const users = await db.chargeUsersBefore(cutoff.toISOString());
  let people = 0;
  let coins = 0;
  for (const uid of users) {
    const due = dueLots(coinLots(await db.coinLedgerAll(uid)), now.getTime());
    let took = 0;
    for (const l of due) {
      const r = await db.coinExpire(uid, l.left, `expire:${l.ref}`);
      if (r.applied) took += r.taken;
    }
    if (took) {
      people += 1;
      coins += took;
    }
  }
  return { users: people, coins };
}
