# وحدة الاشتراكات والفوترة — Subscriptions Module

## الغرض
إدارة الخطط، الاشتراكات، وصول الخدمات، الدفعات (Moyasar/تحويل/يدوي)، أكواد التفعيل، الإنفويسات.

## الملفات الرئيسية

| الملف | الدور |
|---|---|
| `lib/subscription/subscription-service.ts` | `isServiceAllowedForSchool`, `syncSchoolServicesFromPlan`, `assignPlanToSchool` |
| `lib/subscription/subscription-guard.ts` | حراسة صفحات (redirect) |
| `lib/subscription/subscription-api-guard.ts` | إعادة تصدير حراسة الـ API |
| `lib/subscription/plan-audience.ts` | `targetAudience` (GUIDANCE/ACTIVITY/ALL) |
| `lib/subscription/default-free-plan.ts` | خطة `default-free-auto` 14 يومًا |
| `lib/payments/moyasar.ts` | استدعاءات Moyasar |
| `lib/payments/electronic-payments.ts` | `applyPaidElectronicPaymentTransaction` |
| `lib/activation/activation-service.ts` | أكواد التفعيل + `activateSchoolAccount` |
| `lib/admin/invoices.ts` | إنشاء الإنفويسات |
| `lib/admin/bank-transfer-payments.ts` | اعتماد التحويل البنكي |
| `lib/admin/payment-operations.ts` | إلغاء/استرداد/تسوية |

## الاشتراك
- اشتراك واحد لكل مدرسة (upsert على `schoolAccountId` الفريد).
- الخطط → الخدمات عبر ميزة `service:<slug>`.
- تفاصيل الدورة في `flows/subscriptions.md`.

## الفوترة
- `InvoiceSettings` (مفردة) + `InvoiceNumberSequence` + `Invoice` + `CreditNote`.
- PDF للإنفويسات عبر Puppeteer.

## مسارات رئيسية
- `app/api/payments/*` — checkout، moyasar callback، apple-pay، webhooks.
- `app/api/dashboard/subscription/*` — نظرة، تحويل بنكي، استبدال كود.
- `app/api/dashboard/admin/subscriptions|subscribers|activations|payments` — إدارة المسؤول.
- `app/dashboard/plans` + `app/pricing` — عرض الخطط وشراؤها.

## نقاط للتنبه
- `NO_SERVICE_RULES_YET` وصول مفتوح (M12).
- `UsageLimit`/`UsageRecord` غير مستخدمة (M3).
- mojibake في افتراضيات `InvoiceSettings` (L1).
- `payment-provider-contract.ts` واجهة رمي دائم (L5).
