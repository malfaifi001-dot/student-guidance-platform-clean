# خريطة الاعتماديات — Dependency Map

علاقات القراءة/الكتابة بين مكونات النظام الرئيسية، مشتقة من الاستخدام الفعلي.

## نواة الاعتماد: `Service → Workflow → WorkflowStep → DynamicField → DynamicFieldOption`

```mermaid
erDiagram
    Service ||--o{ Workflow : "workflows (serviceId)"
    Workflow ||--o{ WorkflowStep : "steps (workflowId)"
    WorkflowStep ||--o{ DynamicField : "fields (stepId)"
    DynamicField ||--o{ DynamicFieldOption : "options (fieldId)"
    Service ||--o{ CaseEntry : "cases (serviceId)"
    Workflow ||--o{ CaseEntry : "cases (workflowId)"
    CaseEntry ||--o{ CaseValue : "values (caseEntryId)"
    CaseEntry ||--o{ Evidence : "evidences (caseEntryId)"
    DynamicField o|--o{ CaseValue : "field (fieldId, nullable)"
    Service ||--o{ ServiceAccess : "access"
    SchoolAccount ||--o{ ServiceAccess : "access"
    SchoolAccount ||--o{ Subscription : "one-to-one"
    Plan ||--o{ Subscription : "plan"
    CaseEntry ||--o{ ActivityAssignment : "caseEntryId @unique (عند الاعتماد)"
```

## الاعتماديات عبر الوحدات

| المعتمد | على | العلاقة |
|---|---|---|
| `engine/cases` | `lib/workflows` | لقطة سير العمل عند الإدخال (`workflowSnapshot`) |
| `lib/report-2` | `engine/cases` | يقرأ حالة + قيم لبناء التقرير (`syncReportTwoFromCase`) |
| `lib/report-engine` | `lib/report-2` | المكوّنات الحية (design-renderers، smart-layout) تُستهلك من الاستوديو |
| `lib/assessment-center` | `engine/cases` | `interventions/create-case` ينشئ حالة بقيم `assessment_*` |
| `lib/activity-programs` | `engine/cases` | اعتماد المهمة ينشئ حالة بـ`saveRuntimeCase` |
| `lib/statistics` | `lib/reports` | يقرأ `guidanceReport` + `reportSnapshot` كمصادر |
| `lib/subscription` | `lib/services` | `syncSchoolServicesFromPlan` يكتب `ServiceAccess` من ميزات الخطة |
| `lib/admin` | `lib/subscription` + `lib/payments` | إدارة المستخدمين/الخطط/المدفوعات/الإنفويسات |
| `lib/surveys` | `lib/cases` | استبيان خاص يمكنه توليد حالة (غير مثبت بالكامل) |
| `lib/custom-report` | `engine/cases` | إنشاء حالة تحت خدمة `custom-report` |

## تدفق التحكم الرئيسي لطلب عمل (workflow runtime)

```mermaid
flowchart LR
    U["مستخدم (مرشد)"] -->|"POST save-draft / submit"| R["app/api/dashboard/cases/*"]
    R --> G["getCurrentSessionUser"]
    G -->|"اشتراك + وصول خدمة"| SUB["requireServiceAccess..."]
    SUB --> RES["engine/runtime/runtime-resolver.ts<br/>getRuntimeWorkflowByServiceSlug"]
    RES --> CE["engine/cases/case-runtime-engine.ts<br/>saveRuntimeCase"]
    CE --> VAL["validateRuntimeCaseValues"]
    CE --> DB[("CaseEntry + CaseValue + Evidence")]
    CE --> SNAP["buildWorkflowSnapshotForCase"]
```

## ملاحظات

- `CaseValue.fieldId` اختياري وغالبًا غير مُعيّن — العرض يعتمد على `fieldKey` (انظر `workflow-display-value.ts`).
- نماذج `UsageLimit` و`UsageRecord` غير مستخدمة في كود TypeScript إطلاقًا.
- `AssessmentInterventionWorkflowTarget` معرّف في الـ schema لكن غير مستخدم في مسارات التدخلات.
- `CustomReportEntry` معرّف لكن قراءة القوائم تتم من `CaseEntry` فعلًا.
