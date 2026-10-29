import { NextResponse, type NextRequest } from "next/server";
import { INVITE_LIMIT, chargeTag, packOf } from "@/lib/config";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";
import { confirmTossPayment, serverTestMode } from "@/services/server/tossConfirm";

/** GET /api/coins — 복주머니: balance, recent history, how many friends joined through my link. */
export async function GET(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const [balance, history, invites] = await Promise.all([db.coins(uid), db.coinHistory(uid), db.inviteCount(uid)]);
  return NextResponse.json({ balance, history, invites, inviteLimit: INVITE_LIMIT });
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
  const pack = packOf(body?.packId);
  if (!body || !pack) return NextResponse.json({ error: "충전 상품이 올바르지 않아요." }, { status: 400 });

  let orderId: string;
  if (body.method === "test") {
    if (!serverTestMode) return NextResponse.json({ error: "테스트 결제가 비활성화되어 있습니다." }, { status: 403 });
    orderId = `test-c${pack.coins}-${chargeTag(uid)}-${Date.now().toString(36)}`;
  } else if (body.method === "toss") {
    if (!body.paymentKey || !body.orderId || body.amount !== pack.price || !body.orderId.startsWith(`c${pack.coins}-${chargeTag(uid)}-`)) {
      return NextResponse.json({ error: "결제 정보가 올바르지 않아요." }, { status: 400 });
    }
    const result = await confirmTossPayment({ paymentKey: body.paymentKey, orderId: body.orderId, amount: body.amount });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 402 });
    orderId = body.orderId;
  } else {
    return NextResponse.json({ error: "지원하지 않는 결제 방식입니다." }, { status: 400 });
  }

  await db
    .recordPayment({ orderId, userId: uid, inputHash: `charge:${pack.id}`, amount: pack.price, method: body.method })
    .catch((e) => console.error("recording payment failed", e));
  try {
    const { balance } = await db.coinAdd(uid, pack.coins, "charge", orderId);
    return NextResponse.json({ balance, added: pack.coins });
  } catch (e) {
    // Paid but not credited: the orderId is in payments, so this can be fixed by hand from 고객문의.
    console.error("crediting coins failed", orderId, e);
    return NextResponse.json({ error: `결제는 됐는데 냥을 넣지 못했어요. 주문번호 ${orderId}로 고객문의 주세요.` }, { status: 500 });
  }
}
