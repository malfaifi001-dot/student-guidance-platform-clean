export type PaymentProviderCode =
  | "MANUAL_BANK_TRANSFER"
  | "MOYASAR"
  | "HYPERPAY"
  | "TAP"
  | "STRIPE";

export type BillingCycle = "monthly" | "yearly" | "custom";

export type CreateCheckoutInput = {
  provider: PaymentProviderCode;
  schoolAccountId: string;
  userId: string;
  planId: string;
  amount: number;
  currency: "SAR";
  billingCycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export type CreateCheckoutResult = {
  provider: PaymentProviderCode;
  checkoutId: string;
  checkoutUrl: string;
  paymentTransactionId?: string;
};

export type VerifyWebhookInput = {
  provider: PaymentProviderCode;
  headers: Headers;
  rawBody: string;
};

export type VerifiedWebhookResult = {
  ok: boolean;
  eventId: string;
  eventType: string;
  providerPaymentId?: string;
  paymentTransactionId?: string;
  status?: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  raw?: unknown;
};

export type PaymentProviderAdapter = {
  code: PaymentProviderCode;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhookResult>;
};

/*
  هذه واجهة مستقبلية فقط.
  لاحقًا نضيف:
  - MoyasarPaymentProvider
  - HyperPayPaymentProvider
  - TapPaymentProvider

  النظام الحالي لا يعتمد على اسم مزود الدفع.
  هو يتعامل مع createCheckout و verifyWebhook فقط.
*/
export function getPaymentProviderAdapter(
  provider: PaymentProviderCode
): PaymentProviderAdapter {
  if (provider === "MANUAL_BANK_TRANSFER") {
    throw new Error("التحويل البنكي اليدوي لا يستخدم Checkout إلكتروني.");
  }

  throw new Error(`مزود الدفع ${provider} غير مفعّل بعد.`);
}
