# من أين أبدأ التعديل؟ — Where Do I Change This

دليل عملي: أين تعدّل عند مواجهة مهمة شائعة.

## "أريد تغيير ما يظهر في نموذج خدمة"
- تعريف الحقول/الخطوات: سير العمل في قاعدة البيانات (`Workflow/WorkflowStep/DynamicField`) — حرّره عبر واجهة المسؤول (رفع Excel أو JSON draft) أو مباشرة في DB إن اضطررت.
- العارض: `components/workflow/dynamic-form-renderer.tsx` + `components/workflow/dynamic-field-renderer.tsx`.
- المنطق الشرطي: `engine/runtime/workflow-conditional-logic.ts` و`engine/runtime/field-dependency-engine.ts`.

## "أريد تعديل ما يُعرض في تقرير (report-2)"
- هيكل التقرير/القوالب: `ReportTemplate` (واجهة `app/dashboard/admin/report-templates`).
- الاستوديو/البلوكات: `components/report-2/report-two-studio-runtime.tsx`.
- العارض الحديث: `components/report-engine/` (design-renderers، smart-layout).
- بناء الحمولة: `lib/report-engine/smart-report-payload-builder.ts`.
- اللقطات: `lib/report-2/report-snapshot-service.ts`.

## "أريد تغيير نص رسالة/عربي في النظام"
- أسماء الخدمات: `lib/constants/services.ts`.
- عناوين الحالات: `lib/cases/resolve-arabic-case-report-title.ts` + `getSmartRuntimeCaseTitle`.
- وصف خطوات سير العمل المضمّن: `lib/workflows/workflow-runtime-copy.ts`.
- قوالب الاستبيانات: `lib/surveys/survey-templates.ts`.
- مهام النشاط (نصوص/روابط): `lib/activity-programs/teacher-assignment-links.ts`.

## "أريد تغيير قواعد الاشتراك/الوصول"
- `lib/subscription/subscription-service.ts` (فحص الوصول، مزامنة الخدمات).
- `lib/subscription/subscription-guard.ts` / `subscription-api-guard.ts`.
- الخطة المجانية: `lib/subscription/default-free-plan.ts`.
- دور `ADMIN`/المدارس: `lib/admin/*` + `lib/activation/activation-service.ts`.

## "أريد إضافة نوع حقل جديد في سير العمل"
1. أضف القيمة في تعدّد `FieldType` في `prisma/schema.prisma`.
2. أضف العارض في `components/workflow/dynamic-field-renderer.tsx`.
3. أضف النوع المسموح في `engine/workflow-upload/workflow-upload-engine.ts` (تحقق الـ 16 نوعًا).
4. حدّث `normalizeWorkflowFieldType` إن لزم.
> تنبيه: أي تغيير في `schema.prisma` يتطلب هجرة يدوية (لا `db push`) — راجع `adr/004` و`docs/MYSQL_MIGRATIONS_WORKFLOW.md`.

## "أريد تغيير سلوك حفظ الحالات"
- `engine/cases/case-runtime-engine.ts` (`saveRuntimeCase`, `updateRuntimeCase`).
- التحقق: `validateRuntimeCaseValues`.
- التسلسل: `lib/cases/case-values.ts`.

## "أريد تغيير صفحة أو لوحة"
- بنية الصفحات: `app/dashboard/<module>`.
- القوائم الجانبية: `components/layout/dashboard-sidebar.tsx`.
- لوحات الأدوار: `app/dashboard/principal`، `app/dashboard/teacher`، `app/dashboard/activity-leader`.

## "أريد تغيير طريقة الدفع"
- `lib/payments/moyasar.ts` (العمليات)، `lib/payments/electronic-payments.ts` (الاعتماد).
- `lib/subscription/payment-provider-contract.ts` (واجهة رمي — للاستبدال بمزوّد حقيقي).

## "أريد إضافة تحليل/تصدير"
- انظر `adding-new-api.md` لبناء المسار، و`adding-new-service.md` لخدمة جديدة.
