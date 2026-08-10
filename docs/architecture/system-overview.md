# نظرة عامة على النظام — System Overview

منصة توجيه طلاب (إرشاد مدرسي) عربية RTL تستضيف المدرسة والمرشد والأنشطة الطلابية، مبنية كتطبيق Next.js واحد (monolith) مع قاعدة MySQL.

## الركائز الأساسية

1. **الخدمات الديناميكية** (`Service`) — كل خدمة إرشادية (برامج إرشادية، متابعة طلاب، استدعاء ولي أمر، اجتماعات لجان، تواصل أسري، خدمات توجيه، مؤشرات تقييم) تملك **سير عمل نشطًا واحدًا** (`Workflow`).
2. **محرك سير العمل** (`engine/runtime` + `lib/workflows`) — يعرّف خطوات (`WorkflowStep`) وحقولًا (`DynamicField`) بمستوياتها وقوائم خياراتها (`DynamicFieldOption`)، مع إظهار شرطي وتصفية خيارات.
3. **الحالات** (`CaseEntry` + `CaseValue` + `Evidence`) — كل حفلة إدخال تُحفظ كـ "حالة" تحت ملكية مدرسة، مع لقطة (`workflowSnapshot`) لسير العمل وقت الإدخال.
4. **نظام التقارير من الجيل الثاني** (`report-2` + `lib/report-engine`) — محرّر استوديو، لقطات موافق عليها (`ReportSnapshot`)، تصدير PDF عبر طباعة المتصفح/Playwright.
5. **الاشتراكات والفوترة** — خطط (`Plan`) تملك خدمات (`ServiceAccess`)، اشتراك واحد لكل مدرسة (`Subscription`)، دفعات عبر Moyasar/تحويل بنكي/تفعيل يدوي/أكواد تفعيل.

## الطبقات

```mermaid
flowchart TD
    subgraph UI["طبقة الواجهة (app/)"]
        P["app/login, app/register, app/services, app/pricing"]
        D["app/dashboard/* — لوحات الأدوار"]
        M["app/mobile/counselor — تطبيق المرشد"]
        T["app/teacher/* — بوابة المعلم"]
        S["app/survey/* — استبيانات عامة"]
        R["app/report-2-export-preview, app/print, app/pdf-preview"]
    end

    subgraph API["طبقة API (app/api/)"]
        A1["app/api/auth — تسجيل دخول/خروج/تسجيل"]
        A2["app/api/dashboard/* — واجهات اللوحات"]
        A3["app/api/payments/* — دفع وردّات"]
        A4["app/api/teacher/* — إرسالات المعلم العامة"]
        A5["app/api/survey/* — إرسال استبيان عام"]
    end

    subgraph DOMAIN["طبقة المجال (lib/ + engine/)"]
        E["engine/runtime — محرك سير العمل"]
        C["engine/cases — محرك الحالات"]
        RPT["lib/report-engine + lib/report-2"]
        SUB["lib/subscription + lib/payments"]
        IMP["lib/noor-import + lib/data-center"]
        TT["lib/timetable-v2"]
    end

    subgraph DATA["طبقة البيانات (Prisma)"]
        DB[("MySQL — prisma/schema.prisma")]
    end

    UI --> API
    UI --> DOMAIN
    API --> DOMAIN
    DOMAIN --> DATA
    D --> A2
```

## مبادئ عامة اكتُشفت من الكود

- **Guard في الدوال + في الصفحات**: حراسة الموارد مكرّرة على مستويين — `lib/auth/current-user.ts` للجلسة، و`lib/subscription/*` للاشتراك، و`lib/security/*` للصلاحيات (طبقة قديمة ما زالت مستخدمة).
- **مسارات متوازية متعددة**: نظامان لحفظ سير العمل (توليد JSON + رفع Excel)، ونظامان للحالات/الأدلة (`Evidence` و`CaseEvidence`)، وأجيال متعددة من التقارير.
- **محرك واحد متعدد الاستخدامات**: `engine/cases/case-runtime-engine.ts` يُستخدم لتوليد حالات التقييمات والاستبيانات والتقارير المخصصة وحالات النشاط المعتمدة.

## حدود معرفية

- لا يوجد `README` جذر أصلي سوى هذه الوثائق؛ تاريخ القرارات غير موثق في المستودع.
- مجلدات `lib/report-engine-legacy` و`lib/reports-legacy` كود ميت غير مستورد.
