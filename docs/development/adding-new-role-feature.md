# إضافة ميزة/صفحة لدور — Adding a New Role Feature

## الأدوار المتاحة
`ADMIN`, `COUNSELOR`, `ACTIVITY_LEADER`, `TEACHER`, `PRINCIPAL`, `SCHOOL_OWNER`, `STAFF`.

## الخطوات

### 1) الصفحة
- ضعها أسفل `app/dashboard/<module>/` (أو `/principal` أو `/teacher` عند الاختصاص).
- لوحة الدور المخصصة للعرض: `getPostLoginRedirectPath` في `lib/auth/dashboard-redirects.ts` لا يتطلب تعديلًا إلا إذا أضفت مسارًا جديدًا للدور.

### 2) حراسة الصفحة
- عمومي: `requireDashboardUser()` ثم `requireCompletedOnboarding()`.
- خاص بدور: 
  - `requireRole(...)` من `lib/security/guards.ts`، أو
  - فحص مباشر `user.role === "..."`، أو
  - `requireDashboardApiContext()` للـ API (مع `allowPrincipal` عند الحاجة).
- ميزة رسمية: `requireOfficialFeatureAccess` (هوية مكتملة).

### 3) حراسة الاشتراك/الخدمة
- إن كانت الميزة ضمن خدمة: `requireServiceAccessForCurrentUser`.
- إن كانت عامة للمدرسة: `requireActiveSubscriptionForCurrentUser`.
- مسارات الصفحات → redirect إلى `/dashboard/plans`؛ الـ API → 402.

### 4) الواجهة/المنطق
- منطق المجال في `lib/<module>/` أو `engine/<module>/`.
- المكوّنات في `components/<module>/`.

### 5) التنقل
- أضف الرابط في `components/layout/dashboard-sidebar.tsx` (إن كان شائعًا).
- أو استخدم `DashboardResourceLink` لإضافة روابط ديناميكية (`app/api/dashboard/resource-links`).

### 6) تحقق
- `npm run lint` ثم `npm run build` (يشمل `prisma generate`).
- جرّب بدورين: المستفيد + المستخدم غير المصرح.

## جدول قرارات

| حالة | الاستخدام |
|---|---|
| دور صارم (مثل ADMIN) | `requireRole("ADMIN")` أو `requireAdmin` |
| كل المدرسة | `requireActiveSubscriptionForCurrentUser` |
| ضمن خدمة | `requireServiceAccessForCurrentUser` |
| صفحة/API عام | لا حراسة جلسة (مثل روابط token) |
| خاص بالمدير (PRINCIPAL) | `allowPrincipal` أو مسار `/principal` |

## تنبيه
- `PRINCIPAL` محجوب من معظم `/api/dashboard/*` — عند إضافة ميزة له انتبه إلى `dashboard-context.ts`.
- مصفوفة `permissions.ts` قديمة جزئيًا — لا تعتمد عليها وحدها.
