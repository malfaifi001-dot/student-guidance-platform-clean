# وحدة المسؤول — Admin Module

## الغرض
إدارة المنصة: مستخدمون، مدارس/مشتركون، خطط، مدفوعات، سير عمل، قوالب تقارير، مكتبة مرجعية، صحة النظام.

## الملفات
- `lib/admin/` — `admin-api-guard`, `admin-page-guard`, `activity-log`, `activity-events`, `payments`, `invoices`, `bank-transfer-payments`, `system-health-service`, `workflows/` (ensure-dashboard-workflow-services, workflow-board-helpers).
- `app/dashboard/admin/` — صفحات اللوحة.
- `app/api/dashboard/admin/*` — مسارات API.

## أقسام لوحة المسؤول
`users`, `subscribers`, `subscriptions`, `activations`, `payments`, `system-health`, `workflows`, `workflow-builder`, `activity`, `surveys`, `reports`, `report-templates`, `report-texts`, `document-designs`, `counselor-reference-library`.

## مسارات API (الملخص)

| المجموعة | الوظيفة |
|---|---|
| `admin/users` | CRUD مستخدمين + كلمة مرور + impersonate |
| `admin/subscriptions` | إنشاء/تبديل/تمديد/إلغاء خطط + toggle-service-access + حفظ الخطة المجانية |
| `admin/subscribers` | قائمة المشتركين بحالات محسوبة |
| `admin/activations` | أكواد (`codes`)، تفعيل يدوي (`manual`)، إلغاء (`cancel`)، موافقة/رفض تحويل بنكي |
| `admin/payments` | قائمة، تصدير، إنفويسات (`invoices` + PDF + settings + providers)، تسوية، إلغاء/استرداد |
| `admin/workflows` | upload, draft, publish, activate, delete, rename, student-picker-mode, evidence-mode, original-file |
| `admin/activity` + `metrics` | سجل النشاط والقياسات |
| `admin/system-health` + `operational-alerts` | فحص الصحة والتنبيهات |
| `admin/counselor-reference-library` | إدارة المكتبة المرجعية |

## أدوار تفاعلية
- خطط ← `syncSchoolServicesFromPlan` يحدّث `ServiceAccess`.
- تفعيل ← `lib/activation/activation-service.ts`.
- إنفويسات ← `lib/admin/invoices.ts` + PDF عبر Puppeteer.
- سير عمل ← `lib/admin/workflows/ensure-dashboard-workflow-services.ts`.

## ملاحظات
- `requireAdmin` من `lib/admin/admin-api-guard.ts` — يسمح `ADMIN` فقط.
- `PRINCIPAL` مرفوض من مسارات اللوحة عبر `dashboard-context`.
