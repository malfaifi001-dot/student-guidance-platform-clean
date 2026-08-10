# سجل القرارات المعمارية — ADR

سجل Architecture Decision Records لهذا المشروع. كل قرار يُوثَّق اختياريًا ويُقرأ قبل أي نقاش معماري.

| الرقم | العنوان | الحالة |
|---|---|---|
| [ADR-001](001-mysql-only.md) | قاعدة بيانات MySQL فقط | مقبول |
| [ADR-002](002-prisma-generate-in-build.md) | `prisma generate` إلزامي في `build` و`postinstall` | مقبول |
| [ADR-003](003-flat-dashboard-routing.md) | توجيه لوحات منشور في الجذر (لا `app/(dashboard)`) | مقبول |
| [ADR-004](004-manual-migrations.md) | هجرات يدوية — ممنوع `db push`/`migrate reset`/`migrate dev` | مقبول |
| [ADR-005](005-docs-from-code.md) | الوثائق من الكود الفعلي وليس الافتراض | مقبول |

## كيفية إضافة قرار جديد
1. أنشئ `NNN-slug.md` حسب النموذج القياسي (الحالة/القرار/السياق/النتائج).
2. أضف صفًا في الجدول أعلاه.
3. اربطه من `docs/README.md` عند الحاجة.

## ارتباطات
- التناقضات المسجلة (غير المصنفة كقرارات): `docs/architecture/known-inconsistencies.md`.
- أدلة التطوير: `docs/development/architecture-guardrails.md`.
