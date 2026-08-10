# وحدة المصادقة — Auth Module

## الغرض
إدارة الهوية: تسجيل، دخول، جلسات، حراسة صفحات وAPI.

## الملفات الرئيسية

| الملف | الدور |
|---|---|
| `lib/auth/session.ts` | إنشاء/تحقق كعكة `student_guidance_session` (HMAC-SHA256) |
| `lib/auth/password.ts` | PBKDF2-SHA512 (120,000 تكرارًا، صيغة `pbkdf2:120000:salt:hash`) |
| `lib/auth/current-user.ts` | `getCurrentSessionUser()` + `getRequestDeviceInfo()` |
| `lib/auth/require-auth.ts` | `requireDashboardUser()`، `requireCompletedOnboarding()` |
| `lib/auth/session-policy.ts` | تفعيل `AUTH_SINGLE_ACTIVE_SESSION` اختياريًا |
| `lib/auth/auth-rate-limit.ts` | مفاتيح الحد (namespace:ip:...) |
| `lib/auth/dashboard-context.ts` | حراس API/صفحات، `canAccessSchool`، شروط الملكية |
| `lib/auth/dashboard-redirects.ts` | `getPostLoginRedirectPath` |
| `lib/auth/official-feature-guard.ts` | حراسة الميزات الرسمية (هوية مكتملة) |
| `lib/auth/public-registration-schema.ts` | مخطط Zod (أدوار التسجيل + نطاقات البريد) |
| `lib/auth/public-registration-service.ts` | `registerPublicAccount` (معاملة Serializable) |
| `lib/security/*` | طبقة قديمة: `getCurrentUser`، `requireUser/Role/Permission/Admin`، مصفوفة الصلاحيات |

## مسارات API

| المسار | الطريقة | الوظيفة |
|---|---|---|
| `app/api/auth/login` | POST | دخول (rate limit، تحقق، جلسة، redirectTo) |
| `app/api/auth/logout` | POST | إبطال جلسة + مسح كعكة |
| `app/api/auth/register` | POST | تسجيل (zod + نطاق بريد + إنشاء حساب/مستخدم/جلسة) |

## حراس مشتركون
- `getCurrentSessionUser()` — أساس كل مسار محمي.
- `requireDashboardUser()` / `requireDashboardApiContext()` — للصفحات/API.
- `requireRole/requirePermission` من `lib/security/guards.ts` — لبعض المسارات القديمة.

## واجهات المستخدم
`app/login`, `app/teacher/login`, `app/register`, `app/forgot-password`, `app/reset-password` (RTL عربي).
- صفحتا الاستعادة بلا باك-إند (L9).

## نقاط للتنبه
- حد المعدل في الذاكرة فقط.
- `proxy.ts` فحص سطحي.
- تفاصيل التدفق في `flows/authentication.md`؛ التناقضات في `known-inconsistencies.md`.
