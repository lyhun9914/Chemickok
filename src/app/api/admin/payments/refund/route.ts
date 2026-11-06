import { randomBytes } from "node:crypto";
import { NextResponse, after, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { audit } from "@/services/server/audit";
import { getDb } from "@/services/server/db";
import { reportError } from "@/services/server/errors";
import { cancelTossPayment } from "@/services/server/tossConfirm";

interface Body {
  orderId?: string;
  /** 원, default the whole payment */
  amount?: number;
  /** 냥 to take back (a 충전), default what the charge gave (in proportion to a partial refund) */
  coins?: number;
  note?: string;
  /** already cancelled in the Toss 상점관리자: only record it here */
  manual?: boolean;
}

/** The 냥 a payment put in the 복주머니: a 충전 (`charge:<pack>`), else none (a reading paid directly). */
function coinsOf(p: { input_hash: string; order_id: string; coins?: number | null }): number {
  if (!p.input_hash.startsWith("charge:")) return 0;
  return p.coins ?? Number(/(?:^|-)c(\d+)-/.exec(p.order_id)?.[1] ?? 0);
}

/**
 * POST /api/admin/payments/refund — 환불: takes the 냥 back first (so a refund never leaves 냥 that were paid back),
 * then cancels the payment at Toss, then marks it refunded. If Toss refuses, the 냥 go back in.
 */
export async function POST(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Body | null;
  const p = body?.orderId ? await db.getPayment(body.orderId) : null;
  if (!body || !p) return NextResponse.json({ error: "결제를 찾지 못했어요." }, { status: 404 });
  if (p.refunded_at) return NextResponse.json({ error: "이미 환불된 결제예요." }, { status: 409 });

  const amount = body.amount === undefined ? p.amount : Math.trunc(Number(body.amount));
  if (!(amount >= 1 && amount <= p.amount)) return NextResponse.json({ error: `환불 금액은 1~${p.amount}원 사이로 넣어 주세요.` }, { status: 400 });
  const full = coinsOf(p);
  const coins = body.coins === undefined ? Math.round((full * amount) / p.amount) : Math.trunc(Number(body.coins));
  if (!(coins >= 0 && coins <= full)) return NextResponse.json({ error: `회수할 냥은 0~${full}냥 사이로 넣어 주세요.` }, { status: 400 });
  if (coins > 0 && !p.user_id) return NextResponse.json({ error: "회원이 없는 결제라 냥을 회수할 수 없어요." }, { status: 400 });
  const note = String(body.note ?? "").trim().slice(0, 100);
  const tag = randomBytes(3).toString("hex");

  // 1. 냥 회수
  let balance: number | undefined;
  if (coins > 0) {
    const r = await db.coinAdjust(p.user_id!, -coins, "refund", `refund:${p.order_id}#${tag}`);
    if (!r.ok) {
      return NextResponse.json(
        { error: `회원에게 남은 냥이 ${r.balance}냥이라 ${coins}냥을 회수할 수 없어요. 회수할 냥(과 금액)을 줄여서 부분 환불하세요.`, balance: r.balance },
        { status: 409 },
      );
    }
    balance = r.balance;
  }
  const undo = async () => {
    if (coins > 0) await db.coinAdjust(p.user_id!, coins, "admin", `refund-undo:${p.order_id}#${tag}`).catch(() => null);
  };

  // 2. 토스 결제 취소 (test payments have nothing to cancel)
  if (p.method === "toss" && !body.manual) {
    if (!p.payment_key) {
      await undo();
      return NextResponse.json(
        { error: "이 결제는 토스 결제 키가 저장되기 전에 결제됐어요. 토스페이먼츠 상점관리자에서 직접 취소한 뒤, '토스에서 이미 취소함'을 체크하고 다시 눌러 주세요.", needManual: true },
        { status: 409 },
      );
    }
    const c = await cancelTossPayment({ paymentKey: p.payment_key, orderId: p.order_id, reason: note || "고객 요청 환불", amount: amount < p.amount ? amount : undefined });
    if (!c.ok) {
      await undo();
      after(() => reportError({ source: "server", message: `토스 결제 취소 실패: ${c.message}`, path: "/api/admin/payments/refund", detail: p.order_id, ua: null }));
      return NextResponse.json({ error: `토스 결제 취소 실패: ${c.message} (회수한 냥은 되돌렸어요)` }, { status: 502 });
    }
  }

  // 3. 기록
  if (!(await db.markRefund(p.order_id, { amount, coins, note }))) {
    await undo(); // a second click lost the race: its 냥 go back (Toss already ignored the repeat cancel)
    return NextResponse.json({ error: "방금 다른 곳에서 환불 처리됐어요." }, { status: 409 });
  }
  after(() => audit("환불", p.order_id, `${amount.toLocaleString("ko-KR")}원 / 결제 ${p.amount.toLocaleString("ko-KR")}원 · 냥 ${coins} 회수 · ${p.method === "toss" ? (body.manual ? "토스에서 직접 취소(기록만)" : "토스 결제 취소") : p.method}${note ? ` · ${note}` : ""}`));
  return NextResponse.json({ ok: true, amount, coins, balance });
}
