import { NextResponse, after, type NextRequest } from "next/server";
import { coinLots } from "@/lib/coinLots";
import { reportError } from "@/services/server/errors";
import { INVITE_LIMIT, PAYMENT_CLOSED_MESSAGE, chargeTag } from "@/lib/config";
import { sellPack, type SellPack } from "@/lib/pricing";
import { getSettings } from "@/services/server/settings";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";
import { confirmTossPayment, serverPaymentClosed, serverTestMode } from "@/services/server/tossConfirm";

/**
 * GET /api/coins — 복주머니: balance, recent history, how many friends joined through my link, and what is left of
 * each 충전 with the day it lapses (충전일부터 1년; 무료 냥은 기한 없음).
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const [balance, history, invites, ledger] = await Promise.all([db.coins(uid), db.coinHistory(uid), db.inviteCount(uid), db.coinLedgerAll(uid)]);
  const { free, lots } = coinLots(ledger);
  const paid = lots.filter((l) => l.left > 0).map(({ coins, left, at, expiresAt }) => ({ coins, left, at, expiresAt }));
  return NextResponse.json({ balance, history, invites, inviteLimit: INVITE_LIMIT, free, paid });
}

interface ChargeBody {
  packId?: string;
  method?: "test" | "toss";
  paymentKey?: string;
  orderId?: string;
  amount?: number;
}

/**
 * POST /api/coins — 충전. Toss: the orderId is `c{coins}-{user tag}-…`, so a payment only fills the 복주머니 of the
 * person who started it, with the pack it was for; the ledger takes each orderId once (a reloaded success page is safe).
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as ChargeBody | null;
  // the pack as it sells now (관리자 가격 + 세일); a page that showed a just-changed price gets a fresh read
  const live = async (fresh: boolean): Promise<SellPack | null> => {
    const s = await getSettings(fresh);
    const p = s.pricing.packs.find((x) => x.id === body?.packId);
    return p ? sellPack(p, s.sale) : null;
  };
  let pack = await live(false);
  if (body?.method === "toss" && (!pack || body.amount !== pack.price)) pack = await live(true);
  if (!body || !pack) return NextResponse.json({ error: "충전 상품이 바뀌었어요. 화면을 새로고침해 주세요." }, { status: 400 });

  let orderId: string;
  if (body.method === "test") {
    if (!serverTestMode) return NextResponse.json({ error: "테스트 결제가 비활성화되어 있습니다." }, { status: 403 });
    orderId = `test-c${pack.coins}-${chargeTag(uid)}-${Date.now().toString(36)}`;
  } else if (body.method === "toss") {
    if (serverPaymentClosed) return NextResponse.json({ error: PAYMENT_CLOSED_MESSAGE }, { status: 403 });
    if (!body.paymentKey || !body.orderId || body.amount !== pack.price || !body.orderId.startsWith(`c${pack.coins}-${chargeTag(uid)}-`)) {
      return NextResponse.json({ error: "가격이 방금 바뀌었어요. 화면을 새로고침한 뒤 다시 충전해 주세요. (결제는 되지 않았어요)" }, { status: 400 });
    }
    const result = await confirmTossPayment({ paymentKey: body.paymentKey, orderId: body.orderId, amount: body.amount });
    if (!result.ok) {
      after(() => reportError({ source: "server", message: `냥 충전 결제 승인 실패: ${result.message}`, path: "/api/coins", detail: `orderId ${body.orderId}`, ua: req.headers.get("user-agent") }));
      return NextResponse.json({ error: result.message }, { status: 402 });
    }
    orderId = body.orderId;
  } else {
    return NextResponse.json({ error: "지원하지 않는 결제 방식입니다." }, { status: 400 });
  }

  await db
    .recordPayment({ orderId, userId: uid, inputHash: `charge:${pack.id}`, amount: pack.price, method: body.method, paymentKey: body.method === "toss" ? body.paymentKey : undefined, coins: pack.total })
    .catch((e) => {
      console.error("recording payment failed", e);
      after(() => reportError({ source: "server", message: "결제 기록 저장 실패", path: "/api/coins", detail: `${orderId}\n${String(e).slice(0, 500)}`, ua: null }));
    });
  try {
    const { balance } = await db.coinAdd(uid, pack.total, "charge", orderId);
    return NextResponse.json({ balance, added: pack.total });
  } catch (e) {
    // Paid but not credited: the orderId is in payments, so this can be fixed by hand from 고객문의.
    console.error("crediting coins failed", orderId, e);
    after(() => reportError({ source: "server", message: "결제됐는데 냥 지급 실패", path: "/api/coins", detail: `${orderId}\n${String(e).slice(0, 500)}`, ua: null }));
    return NextResponse.json({ error: `결제는 됐는데 냥을 넣지 못했어요. 주문번호 ${orderId}로 고객문의 주세요.` }, { status: 500 });
  }
}
