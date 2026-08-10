# توثيق منصة توجيه الطلاب — Student Guidance Platform

> دليل معماري مطوّر من الكود الفعلي للمشروع. جميع الملفات المذكورة حقيقية ومتحقَّقة من المستودع، وجميع الأسماء (نماذج، دوال، مسارات، تعدّدات) منقولة حرفيًا دون ترجمة.

## المكدس التقني

| الطبقة | التقنية |
|---|---|
| إطار العمل | Next.js 16 (`proxy.ts` بدل `middleware.ts`) |
| الواجهة | React 19 + Tailwind CSS + RTL عربي |
| قاعدة البيانات | MySQL / MariaDB عبر Prisma 7 (`datasource db { provider = "mysql" }`) |
| ORM | `@prisma/client` 7.8.0 — `prisma generate` في `postinstall` وقبل `next build` |
| التحقق | `zod` 4.4.3 |
| كلمات المرور | PBKDF2-SHA512 (120,000 تكرارًا) — لا bcrypt |
| جلسات | كعكة `student_guidance_session` بتوقيع HMAC-SHA256 + جدول `UserSession` |
| التصدير/الطباعة | `exceljs` و`xlsx` و`jspdf` و`pdf-lib` و`puppeteer` و`playwright` |
| الرسوم البيانية | `recharts` |
| AI | `lib/ai/` (DeepSeek عبر `callDeepSeekChat`) في التقييمات، الجداول، التحليلات، التقارير |

## أوامر المشروع

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | التطوير |
| `npm run build` | `prisma generate` ثم `next build` |
| `npm run lint` | الفحص |
| `npm run start` | الإنتاج |
| `npm run postinstall` | `prisma generate` |

## أهم الملفات في الجذر (لا تُعدَّل إلا لضرورة)

- `prisma/schema.prisma` — 2767 سطرًا، مصدر الحقيقة لكل نماذج البيانات (تحت `database/`).
- `proxy.ts` — فحص كعكة الجلسة على `/dashboard/*` و `/api/dashboard/*`.
- `prisma.config.ts` و`next.config.ts` و`components.json` و`eslint.config.mjs` — إعدادات.
- `AGENTS.md` — قاعدة: اقرأ أدلة Next.js المحلية في `node_modules/next/dist/docs/` قبل كتابة أي كود.

## هيكل الدليل المرجعي

```
docs/
├── README.md                    ← أنت هنا
├── architecture/                ← نظرة عامة، سياق، حاويات، وحدات، تبعيات، دورة الطلب، تناقضات
├── database/                    ← نظرة على قاعدة البيانات، ERD، مرجع النماذج
├── roles/                       ← الأدوار وخريطة الصلاحيات
├── flows/                       ← تدفقات الأنظمة (مصادقة، اشتراكات، حالات، تقارير...)
├── modules/                     ← شرح كل وحدة بالتفصيل
├── api/                         ← خريطة مسارات API
├── development/                 ← أدلة عمليّة للتعديل والإضافة
└── adr/                         ← قرارات معمارية مسجلة (001–005)
```

## أدوار مستخدمي المنصة

تعدّد `UserRole`: `ADMIN`، `COUNSELOR`، `ACTIVITY_LEADER`، `TEACHER`، `PRINCIPAL`، `SCHOOL_OWNER`، `STAFF`.
التفاصيل الكاملة في `roles/roles-overview.md`.

## خرائط سريعة

- خريطة النماذج: `database/models-reference.md`
- خريطة مسارات API: `api/api-map.md`
- من أين أبدأ التعديل: `development/where-do-i-change-this.md`
- أين أخفي دالة أو مسارًا: `api/api-by-module.md` + `development/debugging-map.md`
- أهم التناقضات المعروفة (لا تُصلَح تلقائيًا): `architecture/known-inconsistencies.md`

## المبادئ المسجَّلة (ADR)

- ADR-001: قاعدة بيانات MySQL فقط — ممنوع SQLite أو تغيير `provider`.
- ADR-002: `prisma generate` جزء إلزامي من `build` و`postinstall`.
- ADR-003: لا نلمس `app/(dashboard)` — لا يوجد مجلد group، المسارات منشورة في الجذر.
- ADR-004: لا تشغيل `prisma db push`/`migrate reset`/`migrate dev` — الهجرات يدوية وموثقة.
- ADR-005: الوثائق من الكود وليس من الافتراض — أي معلومة غير مؤكدة تُكتب كغير متوفرة.

راجع `adr/README.md`.

## ملاحظة توافق

هذه الوثائق لا تُعدِّل أي ملف خارج `docs/`. أي تعديلات متبقية في المستودع (مثل `lib/portfolio/*`) تخصّ عملًا آخر غير موثّق هنا.
