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
  method: "test" | "toss" | "share" | "coins";
  paymentKey?: string;
  orderId?: string;
  amount?: number;
}

/**
 * POST /api/payment/confirm — unlock a full reading.
 * The report is rebuilt from the answers. Paid with 냥 from the 복주머니 (logged in; the same answers are charged once),
 * or directly by a guest through Toss: that payment only unlocks the answers whose hash prefixes its orderId.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ConfirmBody | null;
  // 사주·대운·재회·배우자 readings run on the chart engine; 연애 점괘 on the love engine.
  const fortune = isFortuneMode((body?.input as { mode?: unknown } | undefined)?.mode);
  const input = fortune ? validateFortune(body?.input) : validateInput(body?.input);
  if (!body || !input) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  const hashOf = fortune ? fortuneHash : inputHash;
  const reportOf = fortune ? buildFortuneReport : buildReport;

  const db = getDb();
  const uid = sessionUserId(req);
  const hash = hashOf(input);
  let coinsLeft: number | undefined;
  let spentBefore = false;

  switch (body.method) {
    case "coins": {
      if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
      const cost = productOf(input.mode).coins;
      const r = await db.coinSpend(uid, cost, `${input.mode}:${hash}`);
      if (!r.ok) return NextResponse.json({ error: `냥이 ${cost - r.balance}냥 모자라다냥.`, need: cost - r.balance, coins: r.balance }, { status: 402 });
      coinsLeft = r.balance;
      spentBefore = r.already;
      break;
    }
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
  const res: UnlockResponse = { level: "full", report, ...(coinsLeft === undefined ? {} : { coins: coinsLeft }) };

  // Keep the payment record (money only — 냥 spends are in the coin ledger) and, logged in, file the reading in
  // 내 점괘함 (once: answers already paid for with 냥 are there). Never blocks the unlock.
  if (db) {
    const orderId = body.method === "toss" ? body.orderId! : body.method === "coins" ? null : `test-${hash}-${Date.now()}`;
    try {
      if (orderId)
        await db
          .recordPayment({ orderId, userId: uid, inputHash: hash, amount: productOf(input.mode).price, method: body.method })
          .catch((e) => console.error("recording payment failed", e));
      if (uid && !spentBefore) {
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
