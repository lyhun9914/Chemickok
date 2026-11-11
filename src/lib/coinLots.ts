/**
 * 충전한 냥의 유효기간 (약관 제4조 ②·④): 충전일(결제일)부터 1년이 지나면 남은 충전 냥은 사라진다. 무료로 받은 냥
 * (가입·초대·출석·쿠폰·선물·관리자 지급)에는 유효기간이 없다. 쓸 때는 무료 냥을 먼저 쓰고, 충전한 냥은 먼저 충전한
 * 것부터 쓴 것으로 본다. The ledger is replayed oldest first to find what is left of each 충전; a refund or an
 * expiry takes from its own 충전 first.
 */
export interface LedgerEntry {
  delta: number;
  reason: string;
  ref: string;
  created_at: string;
}

/** One 충전 (a paid lot): its orderId, when, how many 냥 it gave, how many are left, and when they lapse. */
export interface PaidLot {
  ref: string;
  at: string;
  coins: number;
  left: number;
  expiresAt: string;
}

export interface CoinLots {
  /** 무료로 받은 냥 still in the 복주머니 */
  free: number;
  /** every 충전, oldest first */
  lots: PaidLot[];
}

/** 충전일부터 1년: the same moment a year later (a 2월 29일 충전 lapses on 3월 1일). */
export function lotExpiry(at: string): string {
  const d = new Date(at);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

/** "refund:ORDER#ab12" / "refund-undo:ORDER#ab12" / "expire:ORDER" → "ORDER" (a 충전's ref is its orderId). */
const orderOf = (ref: string) => ref.replace(/^(refund|refund-undo|expire):/, "").replace(/#[0-9a-f]+$/, "");

export function coinLots(entries: LedgerEntry[]): CoinLots {
  const rows = [...entries].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  let free = 0;
  const lots: PaidLot[] = [];
  const fromLots = (n: number) => {
    for (const l of lots) {
      if (n <= 0) break;
      const k = Math.min(l.left, n);
      l.left -= k;
      n -= k;
    }
    return n;
  };
  const fromFree = (n: number) => {
    const k = Math.min(free, n);
    free -= k;
    return n - k;
  };
  for (const r of rows) {
    if (r.delta > 0) {
      const own = r.reason === "admin" && r.ref.startsWith("refund-undo:") ? lots.find((l) => l.ref === orderOf(r.ref)) : undefined;
      if (r.reason === "charge") lots.push({ ref: r.ref, at: r.created_at, coins: r.delta, left: r.delta, expiresAt: lotExpiry(r.created_at) });
      else if (own) own.left += r.delta; // a refund that Toss refused puts the 냥 back where they came from
      else free += r.delta;
      continue;
    }
    let n = -r.delta;
    if (r.reason === "refund" || r.reason === "expire") {
      const own = lots.find((l) => l.ref === orderOf(r.ref));
      if (own) {
        const k = Math.min(own.left, n);
        own.left -= k;
        n -= k;
      }
      fromFree(fromLots(n)); // what its own 충전 could not cover comes off the rest
    } else {
      fromLots(fromFree(n)); // 점괘·선물·회수: 무료 냥 먼저, then the oldest 충전
    }
  }
  return { free, lots };
}

/** 충전 whose year is over and that still hold 냥: what the daily job takes away. */
export const dueLots = (c: CoinLots, now = Date.now()) => c.lots.filter((l) => l.left > 0 && Date.parse(l.expiresAt) <= now);
