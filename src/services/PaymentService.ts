import { PRODUCT, TOSS_CLIENT_KEY, isTestMode as defaultTestMode } from "@/lib/config";
import { loadScript } from "@/lib/loadScript";
import type { PaymentMethod, QuestionnaireInput, UnlockResponse } from "@/models/types";
import { api } from "./apiClient";

// Minimal typing for the Toss Payments v2 standard SDK (window.TossPayments).
interface TossPaymentsV2 {
  payment(opts: { customerKey: string }): {
    requestPayment(opts: Record<string, unknown>): Promise<void>;
  };
}
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsV2;
  }
}

const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";

export type PaymentResult =
  | { status: "unlocked"; unlock: UnlockResponse }
  | { status: "redirecting" } // real PG flow: browser leaves for Toss, returns to /payment/success
  | { status: "failed"; message: string };

export class PaymentService {
  constructor(public readonly isTestMode: boolean = defaultTestMode) {}

  /** orderId starts with the server-issued hash of the answers, binding the payment to them. */
  static makeOrderId(inputHash: string): string {
    return `${inputHash}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  async purchase(input: QuestionnaireInput, inputHash: string, method: PaymentMethod): Promise<PaymentResult> {
    try {
      if (this.isTestMode) return await this.mockPurchase(input);
      await this.requestTossPayment(inputHash, method);
      return { status: "redirecting" };
    } catch (e) {
      return { status: "failed", message: e instanceof Error ? e.message : "결제 중 오류가 발생했어요." };
    }
  }

  /** Test mode: skip the PG and ask the server (which must also be in test mode) to unlock. */
  private async mockPurchase(input: QuestionnaireInput): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 900)); // feels like a payment
    return { status: "unlocked", unlock: await api.unlock({ input, method: "test" }) };
  }

  /**
   * Real flow hook — Toss Payments JS SDK v2 (결제창 호출).
   * Kakao Pay is routed through Toss's easy-pay (간편결제) option.
   */
  private async requestTossPayment(inputHash: string, method: PaymentMethod): Promise<void> {
    if (!TOSS_CLIENT_KEY) throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았어요.");
    await loadScript(TOSS_SDK_URL);
    if (!window.TossPayments) throw new Error("Toss Payments SDK를 불러오지 못했어요.");

    const payment = window.TossPayments(TOSS_CLIENT_KEY).payment({ customerKey: `guest_${inputHash}` });
    const origin = window.location.origin;
    await payment.requestPayment({
      method: "CARD",
      amount: { currency: "KRW", value: PRODUCT.price },
      orderId: PaymentService.makeOrderId(inputHash),
      orderName: PRODUCT.orderName,
      successUrl: `${origin}/payment/success`,
      failUrl: `${origin}/payment/fail`,
      ...(method === "kakaopay" ? { card: { flowMode: "DIRECT", easyPay: "KAKAOPAY" } } : {}),
    });
  }

  /** Called from /payment/success after Toss redirects back with paymentKey/orderId/amount. */
  confirmRedirect(params: { input: QuestionnaireInput; paymentKey: string; orderId: string; amount: number }) {
    return api.unlock({ ...params, method: "toss" });
  }

  /** Viral unlock: sharing opens the hidden-mind section only. */
  unlockByShare(input: QuestionnaireInput) {
    return api.unlock({ input, method: "share" });
  }
}

export const paymentService = new PaymentService();
