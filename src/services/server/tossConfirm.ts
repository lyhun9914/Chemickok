import "server-only";

/** Server-side test-mode gate. Must be explicitly "false" in production to require real payments. */
export const serverTestMode = process.env.PAYMENT_TEST_MODE !== "false";

/**
 * Confirms a Toss Payments transaction (승인 API). Called after Toss redirects to successUrl.
 * https://docs.tosspayments.com/reference#결제-승인
 */
export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return { ok: false, message: "TOSS_SECRET_KEY가 설정되지 않았습니다." };
  const auth = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(params),
    cache: "no-store",
  });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  // Confirmed already (the success page was reloaded, or the first answer got lost): look the payment up instead.
  if (body.code === "ALREADY_PROCESSED_PAYMENT") {
    const got = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(params.paymentKey)}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const p = (await got.json().catch(() => ({}))) as { status?: string; orderId?: string; totalAmount?: number };
    if (got.ok && p.status === "DONE" && p.orderId === params.orderId && p.totalAmount === params.amount) return { ok: true };
  }
  return { ok: false, message: body.message ?? `결제 승인 실패 (${res.status})` };
}

/**
 * Cancels (refunds) a Toss Payments transaction, in full or in part (결제 취소 API). The Idempotency-Key makes a
 * second click on the same refund a no-op at Toss instead of a second cancel.
 * https://docs.tosspayments.com/reference#결제-취소
 */
export async function cancelTossPayment(params: {
  paymentKey: string;
  orderId: string;
  reason: string;
  amount?: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return { ok: false, message: "TOSS_SECRET_KEY가 설정되지 않았습니다." };
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(params.paymentKey)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `refund-${params.orderId}`,
    },
    body: JSON.stringify({ cancelReason: params.reason.slice(0, 200) || "고객 요청 환불", ...(params.amount ? { cancelAmount: params.amount } : {}) }),
    cache: "no-store",
  });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  if (body.code === "ALREADY_CANCELED_PAYMENT") return { ok: true };
  return { ok: false, message: body.message ?? `결제 취소 실패 (${res.status})` };
}
