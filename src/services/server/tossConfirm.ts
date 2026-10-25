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

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, message: body.message ?? `결제 승인 실패 (${res.status})` };
  }
  return { ok: true };
}
