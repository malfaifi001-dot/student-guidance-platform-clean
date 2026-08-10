# خريطة تصحيح الأخطاء — Debugging Map

أين تبحث عند مشكلة شائعة.

## "الخدمة لا تظهر / لا تُفتح"
1. هل صف `Service` موجود؟ → `lib/admin/workflows/ensure-dashboard-workflow-services.ts` و`engine/services/service-workspace-engine.ts`.
2. هل الخدمة في كتالوج الواجهة؟ → `lib/constants/services.ts`.
3. هل سير العمل نشط؟ → فحص `Workflow.isActive + status + activeKey` عبر `buildActiveWorkflowSlotQuery`.
4. هل الاشتراك/الوصول يسمح؟ → `requireServiceAccessForCurrentUser` (رسائل 402/plans).
5. خطأ عرض → انظر "النموذج لا يظهر".

## "النموذج لا يظهر / الحقول مفقودة"
- `engine/runtime/runtime-resolver.ts` — هل يعيد سير العمل؟ (نوع `workflowType` ومطابقة الفتحة).
- `components/workflow/dynamic-form-renderer.tsx` — هل يُعرض؟ (فحص `isEvidenceStep`/بطاقة الطالب).
- `components/workflow/dynamic-field-renderer.tsx` — "نوع الحقل غير مدعوم" لأنواع `PARENT_PICKER/STAFF_PICKER/SIGNATURE`.
- الشرطية: `isConditionalWorkflowFieldVisible` مقابل `shouldShowField` (H5) — جرّب تعطيل `dependsOnFieldKey`.

## "الحالة تُحفظ دون بعض القيم"
- `validateRuntimeCaseValues` في `engine/cases/case-runtime-engine.ts` — مفاتيح مرفوضة؟ (`RUNTIME_SYSTEM_VALUE_KEYS`).
- `serializeCaseValues` — مصفوفة/كائن يدخل `jsonValue`، البدائي `value`؛ العارض يقرأ `jsonValue ?? value`.
- `restoreCaseDraft` — ما يُعرض من اللقطة.

## "التقرير فارغ أو ناقص"
1. `smart-report-payload-builder.ts` — هل الحمولة تُبنى من القيم؟
2. `syncReportTwoFromCase` — هل أُعيدت المزامنة بعد تعديل الحالة؟
3. قالب التقرير: `ReportTemplate` بـ`serviceSlug` صحيح؟
4. العارض: structured مقابل `snapshotHtml` (M8).
5. الأدلة: `collectEvidence` في `report-two-structured-data.ts`.

## "الدفع لا يكتمل"
- `lib/payments/moyasar.ts` + `app/api/payments/moyasar/callback` — سجل المزود.
- `applyPaidElectronicPaymentTransaction` — هل أنشأ Subscription + Invoice؟
- ويب هوك: `app/api/payments/webhooks/[provider]` — تحقق `secret_token` + idempotency عبر `WebhookEvent`.

## "الاستيراد يفشل"
- تنسيق Excel: `lib/noor/excel-parser.ts` (أوراق/أسماء أعمدة).
- حالة الصفوف: `ImportRowStatus` (PENDING/VALID/INVALID) — انظر `[sessionId]/rows`.
- المطابقة: nationalId ثم `fullName+grade+classroom`.

## "مشكلة جلسة"
- `getCurrentSessionUser()` — HMAC + `UserSession` (revokedAt/expiresAt).
- `proxy.ts` — فحص سطحي (لا يحجب فعليًا).
- معدّل: `lib/auth/auth-rate-limit.ts` في الذاكرة (يُعاد عند إعادة التشغيل).

## أدوات
- `npm run lint` — فحص سريع.
- `npm run build` — يشمل `prisma generate`؛ أخطاء Prisma تظهر هنا.
- طباعة PDF: جرّب `app/pdf-preview` و`app/print` وصفحة `report-2-export-preview/[token]`.
- ملفات scan في جذر المستودع (`.txt`) أرشيفات تشخيص سابقة.

## رسائل 402 (الاشتراك)
| الرمز | المعنى |
|---|---|
| `SUBSCRIPTION_INACTIVE` | لا اشتراك قابل للاستخدام |
| `SERVICE_NOT_INCLUDED` | الخدمة خارج الخطة |
| `NO_SERVICE_RULES_YET` | لا قواعد وصول بعد (وصول مفتوح) — M12 |
