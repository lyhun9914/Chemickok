import { TOSS_CLIENT_KEY, type CoinPack, chargeTag, productOf, isTestMode as defaultTestMode } from "@/lib/config";
import { loadScript } from "@/lib/loadScript";
import type { PaymentMethod, QuestionnaireInput, UnlockResponse } from "@/models/types";
import { api, coinApi } from "./apiClient";

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
/** Toss v2: a customer without an account. */
const ANONYMOUS = "@@ANONYMOUS";

/**
 * How each choice opens Toss's window. 토스페이 · 카카오페이 go straight to the pay app (자체창, flowMode DIRECT);
 * "card" opens Toss's own window with every card company and the other pay apps.
 */
const METHOD: Record<PaymentMethod, Record<string, unknown>> = {
  tosspay: { method: "CARD", card: { flowMode: "DIRECT", easyPay: "TOSSPAY" } },
  kakaopay: { method: "CARD", card: { flowMode: "DIRECT", easyPay: "KAKAOPAY" } },
  card: { method: "CARD" },
};

export type PaymentResult =
  | { status: "unlocked"; unlock: UnlockResponse }
  | { status: "redirecting" } // real PG flow: browser leaves for Toss, returns to /payment/success
  | { status: "failed"; message: string };

export type ChargeResult = { status: "charged"; balance: number } | { status: "redirecting" } | { status: "failed"; message: string };

const failed = (e: unknown) => ({ status: "failed" as const, message: e instanceof Error ? e.message : "결제 중 오류가 발생했어요." });

async function tossPayment(customerKey: string) {
  if (!TOSS_CLIENT_KEY) throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았어요.");
  await loadScript(TOSS_SDK_URL);
  if (!window.TossPayments) throw new Error("Toss Payments SDK를 불러오지 못했어요.");
  return window.TossPayments(TOSS_CLIENT_KEY).payment({ customerKey });
}

/** Toss closes its window without redirecting when the buyer backs out; that isn't an error worth showing. */
const cancelled = (e: unknown) => /USER_CANCEL|취소/.test(String((e as { code?: string })?.code ?? (e as Error)?.message ?? ""));

export class PaymentService {
  constructor(public readonly isTestMode: boolean = defaultTestMode) {}

  /** orderId starts with the server-issued hash of the answers, binding the payment to them. */
  static makeOrderId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  /** A guest buys this one reading on the spot. */
  async purchase(input: QuestionnaireInput, inputHash: string, method: PaymentMethod): Promise<PaymentResult> {
    try {
      if (this.isTestMode) {
        await new Promise((r) => setTimeout(r, 900)); // feels like a payment
        return { status: "unlocked", unlock: await api.unlock({ input, method: "test" }) };
      }
      const product = productOf(input.mode);
      const payment = await tossPayment(ANONYMOUS);
      await payment.requestPayment({
        ...METHOD[method],
        amount: { currency: "KRW", value: product.price },
        orderId: PaymentService.makeOrderId(inputHash),
        orderName: product.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
      return { status: "redirecting" };
    } catch (e) {
      return cancelled(e) ? { status: "failed", message: "" } : failed(e);
    }
  }

  /** A logged-in visitor opens the reading with 냥 from the 복주머니. */
  async spend(input: QuestionnaireInput): Promise<PaymentResult> {
    try {
      return { status: "unlocked", unlock: await api.unlock({ input, method: "coins" }) };
    } catch (e) {
      return failed(e);
    }
  }

  /** 복주머니 채우기. With Toss the browser leaves and comes back to /payment/success?kind=charge. */
  async charge(pack: CoinPack, method: PaymentMethod, userId: string): Promise<ChargeResult> {
    try {
      if (this.isTestMode) {
        await new Promise((r) => setTimeout(r, 700));
        return { status: "charged", balance: (await coinApi.charge({ packId: pack.id, method: "test" })).balance };
      }
      const tag = chargeTag(userId);
      const payment = await tossPayment(`u_${tag}`);
      await payment.requestPayment({
        ...METHOD[method],
        amount: { currency: "KRW", value: pack.price },
        orderId: PaymentService.makeOrderId(`c${pack.coins}-${tag}`),
        orderName: `냥신 점괘 · 복채 ${pack.coins}냥`,
        successUrl: `${window.location.origin}/payment/success?kind=charge&pack=${pack.id}`,
        failUrl: `${window.location.origin}/payment/fail?kind=charge`,
      });
      return { status: "redirecting" };
    } catch (e) {
      return cancelled(e) ? { status: "failed", message: "" } : failed(e);
    }
  }

  /** Called from /payment/success after Toss redirects back with paymentKey/orderId/amount. */
  confirmRedirect(params: { input: QuestionnaireInput; paymentKey: string; orderId: string; amount: number }) {
    return api.unlock({ ...params, method: "toss" });
  }

  confirmCharge(params: { packId: string; paymentKey: string; orderId: string; amount: number }) {
    return coinApi.charge({ ...params, method: "toss" });
  }

  /** Viral unlock: sharing opens the hidden-mind section only. */
  unlockByShare(input: QuestionnaireInput) {
    return api.unlock({ input, method: "share" });
  }
}

export const paymentService = new PaymentService();
