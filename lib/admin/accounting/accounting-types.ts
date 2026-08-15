export const EXPENSE_STATUS_LABELS = {
  DUE: "مستحق",
  PAID: "مدفوع",
  OVERDUE: "متأخر",
  CANCELED: "ملغي",
} as const;

export const EXPENSE_PAYMENT_METHOD_LABELS = {
  BANK_TRANSFER: "تحويل بنكي",
  CARD: "بطاقة",
  CASH: "نقدًا",
  WALLET: "محفظة رقمية",
  DIRECT_DEBIT: "خصم مباشر",
  OTHER: "أخرى",
} as const;

export const EXPENSE_PAYMENT_SOURCE_TYPE_LABELS = {
  BANK_ACCOUNT: "حساب بنكي",
  CARD: "بطاقة",
  CASH: "نقد",
  WALLET: "محفظة",
  OTHER: "أخرى",
} as const;

export const EXPENSE_RECURRENCE_LABELS = {
  MONTHLY: "شهري",
  QUARTERLY: "ربع سنوي",
  SEMIANNUAL: "نصف سنوي",
  ANNUAL: "سنوي",
} as const;

export type ExpenseStatusKey = keyof typeof EXPENSE_STATUS_LABELS;
export type ExpensePaymentMethodKey = keyof typeof EXPENSE_PAYMENT_METHOD_LABELS;
export type ExpensePaymentSourceTypeKey = keyof typeof EXPENSE_PAYMENT_SOURCE_TYPE_LABELS;
export type ExpenseRecurrenceKey = keyof typeof EXPENSE_RECURRENCE_LABELS;

export type AccountingDashboardData = Awaited<
  ReturnType<typeof import("./accounting-service").getAccountingDashboardData>
>;
