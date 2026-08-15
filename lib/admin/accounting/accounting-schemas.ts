import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().default("");
const optionalDate = z.union([z.string().date(), z.literal("")]).optional().default("");
const money = z.coerce.number().finite().min(0).max(999_999_999_999.99);

export const expenseInputSchema = z
  .object({
    title: z.string().trim().min(1, "عنوان المصروف مطلوب.").max(190),
    vendor: optionalText(190),
    categoryId: z.string().trim().min(1, "اختر التصنيف."),
    amountBeforeTax: money,
    taxAmount: money.default(0),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("SAR"),
    invoiceNumber: optionalText(190),
    invoiceDate: optionalDate,
    dueDate: optionalDate,
    status: z.enum(["DUE", "CANCELED"]).default("DUE"),
    isRecurring: z.boolean().default(false),
    recurrenceInterval: z
      .enum(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"])
      .nullable()
      .optional(),
    nextRenewalDate: optionalDate,
    notes: optionalText(10_000),
  })
  .superRefine((value, context) => {
    if (value.isRecurring && !value.recurrenceInterval) {
      context.addIssue({
        code: "custom",
        path: ["recurrenceInterval"],
        message: "اختر دورة التكرار.",
      });
    }
    if (value.isRecurring && !value.nextRenewalDate) {
      context.addIssue({
        code: "custom",
        path: ["nextRenewalDate"],
        message: "حدد تاريخ التجديد القادم.",
      });
    }
  });

export const markExpensePaidSchema = z.object({
  paymentSourceId: z.string().trim().min(1, "اختر مصدر الدفع."),
  paymentMethod: z.enum([
    "BANK_TRANSFER",
    "CARD",
    "CASH",
    "WALLET",
    "DIRECT_DEBIT",
    "OTHER",
  ]),
  paidDate: z.string().date(),
  reference: optionalText(190),
});

export const expenseCategoryInputSchema = z.object({
  name: z.string().trim().min(2, "اسم التصنيف قصير.").max(100),
});

export const paymentSourceInputSchema = z.object({
  name: z.string().trim().min(2, "اسم مصدر الدفع قصير.").max(120),
  type: z.enum(["BANK_ACCOUNT", "CARD", "CASH", "WALLET", "OTHER"]),
  institutionName: optionalText(120),
  maskedIdentifier: optionalText(80),
  notes: optionalText(2000),
});

export const expenseFilterSchema = z.object({
  search: optionalText(190),
  status: z.enum(["ALL", "DUE", "PAID", "OVERDUE", "CANCELED"]).default("ALL"),
  categoryId: optionalText(191),
  paymentSourceId: optionalText(191),
  vendor: optionalText(190),
  recurring: z.enum(["ALL", "YES", "NO"]).default("ALL"),
  dateFrom: optionalDate,
  dateTo: optionalDate,
});
