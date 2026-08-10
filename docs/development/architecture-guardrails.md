# حراس المعمارية — Architecture Guardrails

قواعد إلزامية لأي تعديل على هذا المستودع، مستخرجة من الكود والملفات الموجودة.

## ممنوعات صريحة

| # | القاعدة | المصدر |
|---|---|---|
| G1 | **لا تغيّر `prisma/schema.prisma` إلا بهجرة يدوية** — ممنوع `prisma db push`/`migrate reset`/`migrate dev` | `docs/MYSQL_MIGRATIONS_WORKFLOW.md` + ADR-004 |
| G2 | **MySQL فقط** — لا تحوّل `provider` إلى SQLite (يوجد `dev.db` قديم في الجذر لا يُمثّل النظام) | ADR-001 |
| G3 | **لا تنشئ مجلد `app/(dashboard)`** — التوجيه منشور في الجذر (`app/dashboard/*`) | ADR-003 |
| G4 | **لا تعدّل ملفات الإعداد** (`package.json`، env files، `next.config.ts`، `prisma.config.ts`) دون طلب صريح | — |
| G5 | **لا تصلح التناقضات المسجلة** في `architecture/known-inconsistencies.md` تلقائيًا — صنّف فقط | هذا المستند |
| G6 | **لا تحذف الأنظمة القديمة** (`lib/report-engine-legacy`، `lib/reports-legacy`، مسارات `reports/*`) — تُسجَّل وتُترك | H6 |
| G7 | **لا تكتب كودًا عربيًا في الشيفرة** — الأسماء باللغة الإنجليزية؛ العربية محتوى/واجهات فقط | توافق الكود |

## إلزاميات

| # | القاعدة | السبب |
|---|---|---|
| R1 | كل بيانات معزولة بمدرسة عبر `schoolAccountId` — لا قراءة/كتابة عبر المدارس | نموذج البيانات |
| R2 | المسارات API تستخدم دوال `engine/`/`lib/` وليس Prisma مباشرة (حيثما أمكن) | النمط السائد |
| R3 | قبل كتابة كود Next.js اقرأ أدلة `node_modules/next/dist/docs/` | `AGENTS.md` |
| R4 | بعد أي تعديل شيفرة: `npm run lint` ثم `npm run build` | أدوات المشروع |
| R5 | طبقة `lib/security/*` قديمة لكن حيّة — استخدمها بحذر أو أضف الحراسة في `lib/auth/*` الجديدة | الطبقتان |
| R6 | توثيق كل مسار API جديد في `docs/api/` | هذا الدليل |
| R7 | عند إضافة ميزة استهلاك (UsageLimit/UsageRecord وغيرها من النماذج المعرّفة بلا استهلاك) — حدّث `known-inconsistencies.md` | توثيق الحقيقة |

## نمط الملفات الذي يجب الحفاظ عليه

- **Route Handler**: `app/api/<module>/route.ts` — تحقق جلسة + حراسة + منطق مجال.
- **Server Component**: صفحات `app/dashboard/<module>/page.tsx` تقرأ عبر دوال `lib/`.
- **مكوّنات**: `components/<module>/` (client components للتفاعل).
- **منطق**: `engine/` للمحركات التنفيذية، `lib/` للمجال العام.
- **الكتالوج**: أي خدمة جديدة تبدأ من `lib/constants/services.ts`.

## قائمة تحقق قبل الالتزام (commit)

- [ ] لا تعديل في schema بدون هجرة.
- [ ] لا تعديل في `app/(dashboard)`.
- [ ] `npm run lint` نظيف.
- [ ] `npm run build` ينجح (يشمل `prisma generate`).
- [ ] الوثائق محدّثة (`docs/`).
- [ ] لا أسرار/مفاتيح مضافة.
