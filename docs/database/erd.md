# ERD — مخطط العلاقات

مخطط العلاقات الكيانية حسب `prisma/schema.prisma`. يُعرض هنا بالنطاقات الأهم؛ القائمة الكاملة في `models-reference.md`.

## 1) النواة: الخدمات → سير العمل → الحالات

```mermaid
erDiagram
    SchoolAccount ||--o{ ServiceAccess : "access"
    Service ||--o{ ServiceAccess : "access"
    SchoolAccount ||--o{ CaseEntry : "cases"
    Service ||--o{ Workflow : "workflows"
    Service ||--o{ CaseEntry : "cases"
    Workflow ||--o{ WorkflowStep : "steps"
    WorkflowStep ||--o{ DynamicField : "fields"
    DynamicField ||--o{ DynamicFieldOption : "options"
    CaseEntry ||--o{ CaseValue : "values"
    CaseEntry ||--o{ Evidence : "evidences"
    CaseEntry ||--o{ CaseEvidence : "caseEvidences"
    DynamicField o|--o{ CaseValue : "field? (nullable)"
    Workflow o|--o{ CaseEntry : "workflow?"
    Student o|--o{ CaseEntry : "student?"
    User o|--o{ CaseEntry : "createdBy?"
```

## 2) الاشتراكات والفوترة

```mermaid
erDiagram
    Plan ||--o{ PlanFeature : "features"
    SchoolAccount ||--o| Subscription : "one subscription"
    Plan ||--o{ Subscription : "plan"
    Subscription ||--o{ PaymentTransaction : "transactions"
    PaymentProvider o|--o{ PaymentTransaction : "provider?"
    PaymentTransaction |o--o| Invoice : "invoice"
    Invoice ||--o| CreditNote : "refund"
    SchoolAccount ||--o{ BankTransferRequest : "bank transfers"
    SchoolAccount ||--o{ ManualActivation : "activations"
    SchoolAccount ||--o{ ActivationCode : "codes"
    SchoolAccount |o--|| SchoolProfile : "profile"
```

## 3) الطلاب والاستيراد

```mermaid
erDiagram
    SchoolAccount ||--o{ Student : "students"
    Student o|--o| Guardian : "guardian?"
    SchoolAccount ||--o{ StudentImportSession : "sessions"
    StudentImportSession ||--o{ StudentImportFile : "files"
    StudentImportSession ||--o{ StudentImportRow : "rows"
    StudentImportSession ||--o{ StudentImportChange : "changes"
    SchoolAccount ||--o{ NoorImportCycle : "cycles"
    NoorImportCycle ||--o{ StudentImportSession : "sessions"
```

## 4) التقارير

```mermaid
erDiagram
    CaseEntry ||--o{ GuidanceReport : "guidanceReports"
    CaseEntry ||--o| ReportTwoActive : "one report-2 active"
    ReportTwoActive ||--o{ ReportSnapshot : "snapshots"
    CaseEntry o|--o{ ReportSnapshot : "snapshot source"
    CaseEntry ||--o{ ReportEvidence : "evidence"
    SchoolAccount ||--o{ ReportTemplate : "templates"
    CaseEntry o|--o{ ReportTemplate : "createdFromCase?"
```

## 5) التقييمات والاستبيانات

```mermaid
erDiagram
    SchoolAccount ||--o{ AssessmentAnalysis : "analyses"
    SchoolAccount ||--o{ AssessmentInterventionRule : "rules"
    Service ||--o{ AssessmentInterventionWorkflowTarget : "targets"
    SchoolAccount ||--o{ Survey : "surveys"
    Service o|--o{ Survey : "service?"
    Survey ||--o{ SurveyQuestion : "questions"
    SurveyQuestion ||--o{ SurveyOption : "options"
    Survey ||--o{ SurveyResponse : "responses"
    SurveyResponse ||--o{ SurveyAnswer : "answers"
```

## 6) النشاط والجدول

```mermaid
erDiagram
    SchoolAccount ||--o{ ActivityAssignment : "assignments"
    Service ||--o{ ActivityAssignment : "service"
    Workflow ||--o{ ActivityAssignment : "workflow"
    CaseEntry |o--o| ActivityAssignment : "caseEntryId @unique"

    SchoolAccount ||--o{ TimetableProject : "projects"
    TimetableProject ||--o{ TimetableTeacher : "teachers"
    TimetableProject ||--o{ TimetableClass : "classes"
    TimetableProject ||--o{ TimetableSubject : "subjects"
    TimetableClass ||--o{ TimetableClassSubject : "classSubjects"
    TimetableProject ||--o{ TimetableConstraint : "constraints"
    TimetableConstraint ||--o{ TimetableConstraintTeacher : "teacherLinks"
    TimetableConstraint ||--o{ TimetableConstraintClass : "classLinks"
    TimetableProject ||--o{ TimetableSchedule : "schedules"
    TimetableSchedule ||--o{ TimetableScheduleEntry : "entries"
```

## ملاحظات إبرازية

- **`Subscription.schoolAccountId` فريد** — اشتراك واحد لكل مدرسة، upsert بدل create.
- **`ActivityAssignment.caseEntryId` فريد** — مهمة نشاط تعتمد حالةً واحدة فقط عند الموافقة.
- **`Workflow.activeKey` فريد (اختياري)** — يضمن سير عمل نشطًا واحدًا لكل فتحة خدمة.
- **`CaseValue.fieldId` قابل للـ null** — عمليًا لا يُعيّن؛ القيم تُربط بـ`fieldKey`.
- **`Survey.audienceType` نص حر** وليس enum.
- **`WebhookEvent.providerId` يقصد `IntegrationProvider`** وليس `PaymentProvider` (M13).
