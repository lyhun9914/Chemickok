import { NextResponse } from "next/server";
import { buildReport, buildTeaser, inputHash, validateInput } from "@/engine/analyze";
import { buildFortuneReport, buildFortuneTeaser, fortuneHash, fortuneTitle, isFortuneMode, validateFortune } from "@/engine/fortune";
import { productOf } from "@/lib/config";
import type { UnlockResponse } from "@/models/types";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";
import { confirmTossPayment, serverTestMode } from "@/services/server/tossConfirm";

interface ConfirmBody {
  input: unknown;
  method: "test" | "toss" | "share";
  paymentKey?: string;
  orderId?: string;
  amount?: number;
}

/**
 * POST /api/payment/confirm — stateless unlock.
 * The report is rebuilt from the answers; a Toss payment only unlocks the answers whose hash
 * prefixes its orderId, and Toss refuses to confirm the same payment twice.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ConfirmBody | null;
  // 사주·대운·재회·배우자 readings run on the chart engine; 연애 점괘 on the love engine.
  const fortune = isFortuneMode((body?.input as { mode?: unknown } | undefined)?.mode);
  const input = fortune ? validateFortune(body?.input) : validateInput(body?.input);
  if (!body || !input) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  const hashOf = fortune ? fortuneHash : inputHash;
  const reportOf = fortune ? buildFortuneReport : buildReport;

  switch (body.method) {
    case "share": {
      const res: UnlockResponse = { level: "share", report: reportOf(input, "share") };
      return NextResponse.json(res);
    }
    case "test":
      if (!serverTestMode) {
        return NextResponse.json({ error: "테스트 결제가 비활성화되어 있습니다." }, { status: 403 });
      }
      break;
    case "toss": {
      if (!body.paymentKey || !body.orderId || body.amount !== productOf(input.mode).price) {
        return NextResponse.json({ error: "결제 정보가 올바르지 않습니다." }, { status: 400 });
      }
      if (!body.orderId.startsWith(hashOf(input))) {
        return NextResponse.json({ error: "주문 정보가 응답 내용과 일치하지 않습니다." }, { status: 400 });
      }
      const result = await confirmTossPayment({
        paymentKey: body.paymentKey,
        orderId: body.orderId,
        amount: body.amount,
      });
      if (!result.ok) return NextResponse.json({ error: result.message }, { status: 402 });
      break;
    }
    default:
      return NextResponse.json({ error: "지원하지 않는 결제 방식입니다." }, { status: 400 });
  }

  const report = reportOf(input, "full");
  const res: UnlockResponse = { level: "full", report };

  // Logged in: keep the payment record and file the reading in 내 점괘함. Never blocks the unlock.
  const db = getDb();
  const uid = sessionUserId(req);
  if (db) {
    const hash = hashOf(input);
    const orderId = body.method === "toss" ? body.orderId! : `test-${hash}-${Date.now()}`;
    try {
      await db
        .recordPayment({ orderId, userId: uid, inputHash: hash, amount: productOf(input.mode).price, method: body.method })
        .catch((e) => console.error("recording payment failed", e));
      if (uid) {
        // First paid reading of a user who logged in before the interview: keep their 기본 정보 too.
        const user = await db.getUser(uid);
        if (user && !user.profile) await db.updateProfile(uid, input.me);
        const title = fortune ? fortuneTitle(input) : input.mode === "solo" ? `${input.me.name}의 연애 팔자` : `${input.me.name} 💞 ${input.partner.name} 궁합`;
        const teaser = fortune ? buildFortuneTeaser(input) : buildTeaser(input);
        res.readingId = await db.saveReading({ user_id: uid, mode: input.mode, title, names: { me: input.me.name, partner: input.partner.name }, teaser, report, order_id: orderId });
      }
    } catch (e) {
      console.error("saving payment/reading failed", e);
    }
  }
  return NextResponse.json(res);
}
