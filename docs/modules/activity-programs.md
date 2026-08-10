# وحدة الأنشطة — Activity Programs Module

## الغرض
إرسال مهام نشاط للمعلمين وتنفيذها عبر روابط عامة ثم مراجعتها وتحويلها إلى حالات وتقارير.

## الملفات
- `lib/activity-programs/` — `activity-program-catalog.ts` (النطاقات)، `teacher-assignment-links.ts` (روابط WhatsApp)، `activity-card-report-runtime.ts`، `activity-report-templates.ts`.
- `app/dashboard/activity-leader/` — لوحة قائد النشاط (الصفحات ومسارات `teacher-assignments`).
- `app/teacher/activity-assignment/[token]/` — الصفحة العامة.
- `app/api/teacher/activity-assignment/[token]/submit` — الإرسال.

## النطاقات (domains)
مجلدات لوحة: `activity-programs`, `activity-programs-citizenship-life`, `activity-programs-culture-arts`, `activity-programs-events-occasions`, `activity-programs-non-class-periods`, `activity-programs-science-technology`, `activity-programs-scouting`, `activity-programs-sports-health`.

## الدورة
`SENT → OPENED → SUBMITTED → APPROVED/RETURNED` (+`EXPIRED/CANCELED`). التفاصيل في `flows/activity-assignment.md`.

## الاعتماد (APPROVE)
- يتطلب `teacherSignatureUrl`.
- `saveRuntimeCase` ينشئ `CaseEntry` بقيم وأدلة و`submission_source: "TEACHER_PUBLIC_LINK_APPROVED"`.
- تقرير الحالة في `/dashboard/activity-leader/reports/activity-card/[caseId]`.

## ملاحظات
- لا QR في هذا التدفق.
- المعلم لا يحتاج حسابًا لهذه المهمة.
