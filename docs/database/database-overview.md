# قاعدة البيانات — نظرة عامة

MySQL عبر Prisma ORM. ملف النموذج الوحيد: `prisma/schema.prisma` (2767 سطرًا، 80 `model` + 30 `enum`).

> قاعدة أساسية: `provider = "mysql"` فقط. ممنوع تحويل المشروع إلى SQLite (انظر `adr/001`). لا تشغّل `prisma db push`/`migrate reset`/`migrate dev` — الهجرات اليدوية موثقة في `docs/MYSQL_MIGRATIONS_WORKFLOW.md`.

## جدول النماذج (حسب الموقع في الملف)

| النطاق | السطور | النماذج |
|---|---|---|
| التعدّدات المشتركة | 9–189 | `UserRole`, `ReferenceLibraryItemType/Status/AudienceType`, `ImportSessionStatus`, `ImportRowStatus`, `Gender`, `ServiceStatus`, `StudentPickerMode`, `WorkflowEvidenceMode`, `WorkflowStatus`, `FieldType`, `ActivityAssignmentStatus`, `CaseStatus`, `EvidenceType`, `CalendarReminderStatus/Priority/LinkType`, `SubscriptionStatus`, `PaymentStatus`, `PaymentMethod`, `IntegrationStatus`, `SurveyStatus`, `SurveyQuestionType` |
| الهوية والمدارس | 191–372 | `SchoolAccount`, `User`, `UserSession`, `SchoolProfile`, `Guardian`, `Student`, `StaffMember` |
| المكتبة المرجعية | 390–474 | `ReferenceLibraryItem`, `ReferenceLibraryAudience` |
| نواة الخدمات والحالات | 475–770 | `Service`, `Workflow`, `WorkflowStep`, `DynamicField`, `DynamicFieldOption`, `CaseEntry`, `CaseValue`, `Evidence`, `ActivityAssignment`, `CalendarReminder` |
| الاشتراكات والفوترة | 776–1024 | `ExportTemplate`, `Plan`, `PlanFeature`, `Subscription`, `ServiceAccess`, `FeatureFlag`, `UsageLimit`, `UsageRecord`, `PaymentProvider`, `PaymentTransaction`, `BankTransferRequest`, `ManualActivation`, `IntegrationProvider`, `ApiCredential`, `WebhookEvent`, `ExternalSyncLog` |
| التقييم والنتائج | 1026–1077 | `AssessmentAnalysis`, `ResultsAnalysis` |
| التقارير | 1078–1258 | `GuidanceReport`, `ReportSnapshot`, `ReportTwoActive`, `ReportEvidence`, `ReportTemplate` |
| استيراد الطلاب | 1259–1437 | `StudentImportSession`, `StudentImportFile`, `StudentImportRow`, `CaseEvidence`, `ActivationCode`, `PlatformActivityLog`, `StudentImportChange` |
| دورات Noor | 1438–1561 | `NoorImportCycle`, `InvoiceSettings`, `InvoiceNumberSequence`, `Invoice`, `CreditNote` |
| التدخلات والاستبيانات | 1562–1741 | `AssessmentInterventionRule`, `AssessmentInterventionWorkflowTarget`, `Survey`, `SurveyQuestion`, `SurveyOption`, `SurveyResponse`, `SurveyAnswer` |
| الشهادات والمحفظة | 1742–2054 | `CertificateTemplate`, `CertificateBatch`, `IssuedCertificate`, `CertificateAttachment`, `CustomReportTemplate`, `CustomReportEntry`, `DashboardResourceLink`, `AchievementPortfolio`, `PortfolioSnapshot`, `AchievementPortfolioSection`, `AchievementPortfolioItem` |
| الإحصائيات | 2055–2092 | `StatisticalReport` |
| الجداول المدرسية | 2093–2767 | `TimetableProject`، `TimetableTeacher`، `TimetableClass`، `TimetableSubject`، `TimetableClassSubject`، `TimetableSubjectBankEntry`، `TimetableCurriculumTemplate(+Item)`، `TimetableAssignment`، `TimetableWaitingPolicy`، `TimetableDailyAbsence`، `TimetableSubstitution`، `TimetableSupervisionDuty(+Assignment)`، `TimetableConstraint(+Teacher/Subject/Class/Day/Period/Slot)`، `TimetableSchedule(+Entry)` |

## النماذج الأساسية (ما ستلمسه غالبًا)

- **`SchoolAccount`** — مؤسسة تعليمية؛ كل البيانات المعزولة بمدرسة عبر `schoolAccountId`.
- **`User`** — مستخدم بدور `UserRole`؛ مربوط بمدرسة.
- **`Student`** — طالب تابع لمدرسة (لا يوجد ربط مباشر بـ`User`)، `guardianId` اختياري.
- **`Service` / `Workflow` / `WorkflowStep` / `DynamicField` / `DynamicFieldOption`** — سلسلة الخدمات الديناميكية.
- **`CaseEntry` / `CaseValue` / `Evidence`** — الحالة وقيمها وأدلتها.
- **`Subscription` / `ServiceAccess`** — اشتراك المدرسة (واحد لكل مدرسة) ووصول الخدمات.

## دوال Prisma الشائعة

- `getCurrentSessionUser()` في `lib/auth/current-user.ts` — جلبة جلسة.
- `requireActiveSubscriptionForCurrentUser` و`requireServiceAccessForCurrentUser` — حراسة الاشتراك/الخدمة.
- `saveRuntimeCase`/`updateRuntimeCase` في `engine/cases/case-runtime-engine.ts` — الكتابة الآمنة للحالات.
- `buildActiveWorkflowSlotQuery` في `lib/workflows/active-workflow-resolver.ts` — حلّ سير العمل النشط.

## معلومات إضافية

- التعدّد `FieldType` يضم 16 نوعًا: `TEXT, TEXTAREA, NUMBER, DATE, SELECT, MULTI_SELECT, CHECKBOX, RADIO, FILE_UPLOAD, IMAGE_UPLOAD, STUDENT_PICKER, PARENT_PICKER, STAFF_PICKER, REPEATER, SIGNATURE, RICH_TEXT`.
- النماذج `UsageLimit`/`UsageRecord` غير مستخدمة في الكود (انظر `architecture/known-inconsistencies.md` M3).
- يوجد `dev.db` في الجذر (بقايا SQLite قديمة) لكن **ليس** هو قاعدة البيانات النشطة — النشطة MySQL.
