import { NextResponse } from "next/server";
import { buildReport, inputHash, validateInput } from "@/engine/analyze";
import { PRODUCT } from "@/lib/config";
import type { UnlockResponse } from "@/models/types";
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
  const input = validateInput(body?.input);
  if (!body || !input) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  switch (body.method) {
    case "share": {
      const res: UnlockResponse = { level: "share", report: buildReport(input, "share") };
      return NextResponse.json(res);
    }
    case "test":
      if (!serverTestMode) {
        return NextResponse.json({ error: "테스트 결제가 비활성화되어 있습니다." }, { status: 403 });
      }
      break;
    case "toss": {
      if (!body.paymentKey || !body.orderId || body.amount !== PRODUCT.price) {
        return NextResponse.json({ error: "결제 정보가 올바르지 않습니다." }, { status: 400 });
      }
      if (!body.orderId.startsWith(inputHash(input))) {
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

  const res: UnlockResponse = { level: "full", report: buildReport(input, "full") };
  return NextResponse.json(res);
}
