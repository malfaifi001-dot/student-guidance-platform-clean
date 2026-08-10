# دورة حياة الطلب — Request Lifecycle

كيف ينتقل الطلب من المتصفح إلى قاعدة البيانات ثم يعود، مع نقاط الحراسة.

## 1) طلب صفحة داخل `/dashboard/*`

```mermaid
sequenceDiagram
    participant B as المتصفح
    participant P as proxy.ts
    participant R as Route Handler / Server Component
    participant A as lib/auth
    participant S as lib/subscription
    participant D as Prisma/MySQL

    B->>P: GET /dashboard/...
    P->>A: فحص أولي لكعكة student_guidance_session<br/>(يحتوي '.' && length>40)
    alt كعكة غائبة
        P-->>B: Redirect /login
    end
    B->>R: الصفحة تُقدَّم
    R->>A: getCurrentSessionUser()<br/>HMAC + فحص UserSession في DB
    alt جلسة منتهية
        A-->>B: Redirect /login
    end
    R->>S: requireActiveSubscriptionForCurrentUser<br/>+ requireServiceAccessForCurrentUser
    alt بلا اشتراك/خدمة
        S-->>B: Redirect /dashboard/plans?reason=...
    end
    R->>D: قراءة بيانات
    D-->>R: النتائج
    R-->>B: HTML (RTL عربي)
```

## 2) طلب API ضمن `app/api/dashboard/*`

```mermaid
sequenceDiagram
    participant B as المتصفح
    participant P as proxy.ts
    participant R as Route Handler
    participant CTX as lib/auth/dashboard-context.ts
    participant G as lib/security/guards.ts (قديم)
    participant S as @/bin/require-auth أو lib/subscription
    participant D as Prisma

    B->>P: POST /api/dashboard/...
    P->>R: تمرير
    R->>CTX: requireDashboardApiContext() / requireSchoolDashboardApiContext()
    alt PRINCIPAL على API عام
        CTX-->>B: 403 (PRINCIPAL محجوب على معظم API)
    end
    R->>G: requireUser / requireRole / requirePermission
    R->>S: requireActiveSubscriptionForCurrentUser (يردّ 402 JSON)
    R->>D: معالجة
    D-->>R: نتيجة
    R-->>B: JSON
```

## 3) حراسة وصول الخدمة (خدمة إرشادية)

1. `getRuntimeWorkflowByServiceSlug(slug)` في `engine/runtime/runtime-resolver.ts`:
   - يبحث عن `Service` ثم `Workflow` النشط عبر `buildActiveWorkflowSlotQuery` (`lib/workflows/active-workflow-resolver.ts`).
   - الشروط: `workflow.isActive = true` + `status = ACTIVE` + (`activeKey` مطابق **أو** `workflowType` اسم مستعار للفتحة).
   - يبني `RuntimeWorkflow/RuntimeStep/RuntimeField/RuntimeOption` ثم `sortRuntimeWorkflow` و`normalizeConditionalWorkflow`.

2. عند الحفظ: `validateRuntimeCaseValues` في `engine/cases/case-runtime-engine.ts` يتحقق من القيم مقابل لقطة سير العمل.

## 4) تدفق الدفع (Moyasar)

```mermaid
sequenceDiagram
    participant B as المتصفح
    participant CO as POST /api/payments/checkout
    participant MO as Moyasar
    participant CB as GET /api/payments/moyasar/callback
    participant EP as lib/payments/electronic-payments.ts
    participant DB as Prisma

    B->>CO: اختيار خطة
    CO->>DB: PaymentTransaction PENDING (CARD)
    CO-->>B: checkoutUrl
    B->>MO: دفع خارجي
    MO-->>CB: redirect (id)
    CB->>MO: إعادة جلب الدفعة Server-side
    CB->>EP: applyPaidElectronicPaymentTransaction
    EP->>DB: Subscription ACTIVE + Invoice + Transaction PAID
    CB-->>B: إعادة توجيه للوحة
```

## ملاحظات

- `proxy.ts` لا يتحقق تشفيريًا من الكعكة — الفحص الحقيقي داخل الصفحات/API عبر `getCurrentSessionUser`.
- مسار `/reset-password` ليس ضمن `PUBLIC_PATHS` في `proxy.ts` لكنه غير مطابق للـ matcher أصلًا.
- مسارات `app/api/dashboard/report/*` مجرد shims تعيد التوجيه إلى `reports/*`.
