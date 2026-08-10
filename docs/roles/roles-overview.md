# الأدوار والصلاحيات — Roles Overview

## تعدّد `UserRole` (`prisma/schema.prisma:9`)

`ADMIN`, `COUNSELOR`, `ACTIVITY_LEADER`, `TEACHER`, `PRINCIPAL`, `SCHOOL_OWNER`, `STAFF`

## جدول الأدوار

| الدور | التسجيل الذاتي | اللوحة الرئيسية | أمثلة المسارات |
|---|---|---|---|
| `ADMIN` | لا (غير مسموح في `public-registration-schema.ts`) | `app/dashboard/admin` | إدارة مستخدمين، خطط، مدفوعات، سير عمل، قوالب |
| `COUNSELOR` | نعم | `app/dashboard` (المرشد) | حالات، تقارير، مكتبة مرجعية، تقييمات، استبيانات |
| `ACTIVITY_LEADER` | نعم | `app/dashboard/activity-leader` | مهام نشاط للمعلمين، تقارير نشاط |
| `TEACHER` | نعم | `app/dashboard/teacher` | مساحات عمل 25+ قسمًا، مهام نشاط |
| `PRINCIPAL` | نعم | `app/dashboard/principal` | لوحة مدرسية فقط — محجوب عن معظم API |
| `SCHOOL_OWNER` | لا | غير محدد | (مرشح مالك المدرسة) |
| `STAFF` | لا | غير محدد | (دور عام) |

## إعادة التوجيه بعد الدخول — `lib/auth/dashboard-redirects.ts`

- `ADMIN` → `/dashboard/admin`
- `TEACHER` → `/dashboard/teacher`
- `PRINCIPAL` → `/dashboard/principal`
- `COUNSELOR` → `/dashboard` (بعد استكمال/تخطي الإعداد)
- `ACTIVITY_LEADER` → `/dashboard/activity-leader`

## حراسة الأدوار في الطبقتين

### الطبقة الحديثة — `lib/auth`
- `getCurrentSessionUser()` — جلسة فقط.
- `requireDashboardUser()` — يوجّه إلى `/login`.
- `requireCompletedOnboarding()` — يوجّه إلى `/dashboard/onboarding?required=true`.
- `requireOfficialFeatureAccess` — يوجّه إلى `/dashboard/onboarding?required=official-feature` عند غياب الهوية الرسمية (انظر `official-feature-guard.ts`).
- `dashboard-context.ts`:
  - `requireDashboardApiContext()` — 401/403؛ **يحجب `PRINCIPAL`** عن معظم API.
  - `requireSchoolDashboardApiContext()` — يتطلب `SCHOOL_ACCOUNT_REQUIRED`.
  - `canAccessSchool`، `requireSameSchoolApi/Page`، builders لشروط الملكية.

### الطبقة القديمة — `lib/security`
- `requireUser` / `requireRole` / `requirePermission` / `requireAdmin` في `guards.ts`.
- مصفوفة الدور→الصلاحيات في `permissions.ts` (ملاحظة: `PRINCIPAL` يملك `dashboard:read` فقط).
- `getCurrentUser()` في `auth.ts` بمرادفات `tenantId`/`schoolId`.

## ملاحظات

- `SCHOOL_OWNER` و`STAFF` لا يملكان لوحات مخصصة أو تسجيلًا ذاتيًا.
- معلم النشاط لا يحتاج حسابًا أصلًا — يستخدم `ActivityAssignment.token` (انظر `flows/activity-assignment.md`).
- المسؤول يتجاوز حراسة الاشتراك والخدمة في معظم المسارات (`requireActiveSubscriptionForCurrentUser` تستثني `ADMIN`).
