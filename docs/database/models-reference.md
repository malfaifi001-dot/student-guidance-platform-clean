# مرجع نماذج قاعدة البيانات — Models Reference

مرجع لكل `model` في `prisma/schema.prisma` (رقم السطر بين قوسين). الحقول الأهم فقط؛ الخلفية الكاملة في ملف الـ schema.

## الهوية والمدارس

### SchoolAccount (191)
مؤسسة تعليمية. حقول أساسية: `name`, `slug` (فريد), `status`, `planTier`?, `subscription` (واحد), `users`, `students`, `profiles`.
- يملك كل شيء تقريبًا عبر `schoolAccountId`.

### User (225)
مستخدم. حقول: `name`, `email` (فريد), `phone`, `passwordHash`, `role` (`UserRole`), `gender`, `schoolAccountId`, `onboardingCompleted`, `onboardingSkippedAt`, `officialName`, `jobTitle`, `isActive`.
- لا يوجد ربط مباشر بـ`Student` أو `StaffMember`.

### UserSession (270)
جلسة مفحوصة من قاعدة البيانات. حقول: `tokenId` (فريد), `userId`, `isActive`, `expiresAt`, `lastSeenAt`, `revokedAt`, `userAgent`, `ipAddress`.

### SchoolProfile (294)
بيانات المدرسة الموسعة: `schoolAccountId` (فريد), `schoolName`, `educationDepartment`, `academicYear`, `currentSemester`, `logoUrl`, `officialStampUrl`?

### Guardian (328)
ولي أمر. حقول: `schoolAccountId`, `name`, `phone`, `email`?, `relationType`? — مستقل عن `User`، يُنشأ أحيانًا من أسماء الطلاب أثناء الاستيراد.

### Student (345)
طالب. حقول: `schoolAccountId`, `guardianId`?, `nationalId`, `fullName`, `gender` (`Gender`), `gradeLevel`?, `classroom`?, `section`?, `isActive`.
- معرف الاستيراد: `nationalId` مع خيار `fullName + gradeLevel + classroom`.

### StaffMember (373)
موظف مدرسي. حقول: `schoolAccountId`, `userId`?, `name`, `roleTitle`?.

## المكتبة المرجعية

### ReferenceLibraryItem (390)
عنصر مكتبة (مجلد أو ملف). حقول: `schoolAccountId`? (عام إن null), `type` (`FOLDER|FILE`), `parentId`?, `title`, `fileName`?, `fileUrl`?, `mimeType`?, `size`?, `status` (`PUBLISHED|DRAFT|ARCHIVED`).
### ReferenceLibraryAudience (454)
جدول وسيط: `itemId` + `audienceType` (`ALL_USERS|ROLE|USER`) + `roleId`?/`userId`?.

## نواة الخدمات

### Service (475)
خدمة إرشادية. حقول: `slug` (فريد), `name`, `description`?, `status` (`ACTIVE|INACTIVE|COMING_SOON`).

### Workflow (493)
سير عمل. حقول: `serviceId` (Cascade), `name`, `version` (افتراضي 1), `status` (`DRAFT|ACTIVE|ARCHIVED`), `isActive`, `workflowType` (افتراضي `"default"`), `activeKey`? (فريد), ملفات أصلية (`originalFileName/StorageKey/MimeType/Size/UploadedAt`), `studentPickerMode` (`SERVICE_DEFAULT|REQUIRED|DISABLED`), `evidenceMode` (`SERVICE_DEFAULT|ENABLED|DISABLED`).

### WorkflowStep (524)
خطوة. حقول: `workflowId` (Cascade), `title`, `description`?, `order`.

### DynamicField (542)
حقل. حقول: `stepId` (Cascade), `key`, `label`, `type` (`FieldType`), `placeholder`?, `helpText`?, `isRequired`, `order`, `dependsOnFieldKey`?, `linkedToValue`?, `allowOther`, `isRepeater`, `defaultValue`?, `defaultJson`?, `autoSelectWhenLinked`.

### DynamicFieldOption (575)
خيار حقل. حقول: `fieldId` (Cascade), `label`, `value`, `order`, `linkedToValue`?.

## الحالات

### CaseEntry (592)
حالة. حقول: `schoolAccountId`, `serviceId`, `workflowId`?, `workflowSnapshot` (JSON — لقطة سير العمل وقت الإدخال), `studentId`?, `createdById`?, `title`?, `status` (`DRAFT|SUBMITTED|ARCHIVED`), `submittedAt`?.

### CaseValue (632)
قيمة. حقول: `caseEntryId` (Cascade), `fieldId`? (نادرًا ما يُعيّن), `fieldKey`, `value` (Text), `jsonValue` (JSON).

### Evidence (652)
دليل قديم (من حفظ الحالة). حقول: `caseEntryId` (Cascade), `type` (`IMAGE|FILE|LINK`), `fileName`?, `fileUrl`?, `mimeType`?, `size`?, `note`?.

### ActivityAssignment (671)
مهمة نشاط للمعلم. حقول: `schoolAccountId`, `createdById`, `serviceId`, `workflowId`, `domainSlug`/`domainTitle`, `teacherName/Phone/Email`, `token` (فريد), `tokenExpiresAt`, `status` (`SENT|OPENED|SUBMITTED|APPROVED|RETURNED|EXPIRED|CANCELED`), `submittedValues`/`submittedEvidenceItems` (JSON), `caseEntryId`? (فريد), `returnedReason`, timestamps per-status.

### CalendarReminder (732)
تذكير تقويم. حقول: `schoolAccountId`, `createdById`, `serviceId`?, `caseEntryId`?, `studentId`?, `title`, `dueAt`, `status` (`PENDING|COMPLETED|DISMISSED|...`), `priority`, `linkType` (`CALENDAR|CASE|WORKFLOW|...`).

## الاشتراكات والفوترة

### ExportTemplate (776)
قالب تصدير (قوالب قديمة). حقول: `name`, `type`?, `templateJson`?.

### Plan (789)
خطة. حقول: `name`, `slug` (فريد), `priceMonthly`/`priceYearly` (SAR), `isActive`, `isPublic`, `isArchived`, `visibleRoles` (JSON).

### PlanFeature (807)
ميزة خطة. حقول: `planId` (Cascade), `key`, `label`, `value`?.
- اصطلاح المفتاح للخدمات: `service:<slug>` = `"enabled"`.

### Subscription (823)
اشتراك. حقول: `schoolAccountId` (فريد), `planId`, `status` (`TRIAL|ACTIVE|PAST_DUE|CANCELED|EXPIRED`), `startsAt`, `endsAt`?.

### ServiceAccess (841)
وصول خدمة لمدرسة. حقول: `schoolAccountId` + `serviceId` (فريد مشترك), `isEnabled`, `isPaid`.

### FeatureFlag (858)
مفتاح ميزة عام: `key` (فريد), `label`, `isEnabled`.

### UsageLimit (868) / UsageRecord (880)
حدود/سجلات استخدام — **غير مستخدمة في الكود**.

### PaymentProvider (892)
مزوّد دفع. حقول: `name`, `slug` (فريد), `isActive`, `configJson`?.

### PaymentTransaction (905)
معاملة. حقول: `subscriptionId`?, `providerId`?, `amount`, `currency` (افتراضي `SAR`), `method` (`CARD|BANK_TRANSFER|MANUAL`), `status` (`PENDING|PAID|FAILED|REFUNDED|CANCELED`), `externalRef`?, `metadataJson`?.

### BankTransferRequest (930)
طلب تحويل بنكي. حقول: `schoolAccountId`, `amount`, `currency`, `senderName`?, `receiptUrl`?, `status` (`PaymentStatus`), `adminNote`?, `planId`?/`durationDays`?/`billingCycle`? (تُتجاهل عند الإنشاء — M11).

### ManualActivation (952)
تفعيل يدوي (تدقيق). حقول: `schoolAccountId`, `activatedById`?, `reason`?, `startsAt`, `endsAt`?.

### IntegrationProvider (965)
مزوّد تكامل (Noor...). حقول: `name`, `slug` (فريد), `status` (`IntegrationStatus`).

### ApiCredential (979)
اعتماد مشفر: `providerId` (Cascade), `label`, `keyName`, `encryptedValue`.

### WebhookEvent (994)
حدث ويب هوك: `providerId`? (يشير لـ`IntegrationProvider`), `eventType`, `payloadJson`?, `processed`, `processedAt`.

### ExternalSyncLog (1010)
سجل مزامنة خارجي: `providerId`?, `entityType`, `entityId`?, `status`, `message`.

## التقييم والنتائج

### AssessmentAnalysis (1026)
تحليل تقييم. حقول: `schoolAccountId`, `fileName`?, `academicYear`?, `term`?, `status`?, `summaryJson`, `rowsJson`, `totalStudents`?, `linkedStudents`?.

### ResultsAnalysis (1052)
تحليل نتائج. حقول: `schoolAccountId`, `fileName`?, `academicYear`?, `term`?, `summaryJson`, `rowsJson`?.

## التقارير

### GuidanceReport (1096)
تقرير إرشادي (نظام report-1/قديم). حقول: `caseEntryId`, `schoolAccountId`, `serviceId`?, `title`, `status` (`ReportStatus`), `approvedAt`?, `contentJson`?, `renderedHtml`?, `pdfUrl`?.

### ReportSnapshot (1134)
لقطة معتمدة (report-2). حقول: `caseEntryId`, `schoolAccountId`, `status` (`ReportStatus`), `approvedById`?, `approvedByName`, `approvedAt`, `snapshotJson`?, `snapshotHtml`?, `version`, `sourcePayload`?.

### ReportTwoActive (1165)
تقرير report-2 الجاري. حقول: `caseEntryId` (فريد), `schoolAccountId`, `status` (`ReportTwoStatus` — `DRAFT|APPROVED`), `version`, `sourcePayload`?, `editorState`?, `templateJson`?, `pagesJson`?, `renderedHtml`?, `renderContext`?, `previewCase`?.

### ReportEvidence (1204)
دليل تقرير: `reportId`, `type`?, `fileName`?, `fileUrl`?, `note`?.

### ReportTemplate (1226)
قالب تقرير. حقول: `name`, `serviceSlug`, `type` (`SYSTEM|SCHOOL|PERSONAL`), `templateJson`, `content`?, `version`, `genderAware`, `usageCount`.

## استيراد الطلاب

### StudentImportSession (1259)
جلسة استيراد. حقول: `schoolAccountId`, `fileName`, `status` (`ImportSessionStatus`), `academicYear`?, `term`?, `summaryJson`?.
### StudentImportFile (1295)
ملف الجلسة: `sessionId` (Cascade), `storageKey`, `originalName`, `mimeType`, `size`.
### StudentImportRow (1310)
صف. حقول: `sessionId`, `studentId`?, `rawJson`, `status` (`ImportRowStatus`), `planAction`?, `conflictReason`?.
### CaseEvidence (1340)
دليل حالة (نظام آخر). حقول: `caseEntryId`, `storageKey`?, `fileName`, `fileUrl`?, `mimeType`, `size`?, `uploadedById`?.
### ActivationCode (1359)
كود تفعيل. حقول: `code` (فريد), `durationDays`, `maxUses`, `usedCount`, `isActive`, `expiresAt`?, `schoolAccountId`?.
### PlatformActivityLog (1391)
سجل نشاط. حقول: `actorUserId`?, `schoolAccountId`?, `action`, `entityType`, `entityId`?, `metadataJson`?, `ipAddress`?.
### StudentImportChange (1418)
تغيير: `sessionId`, `studentId`, `action` (`CREATED|UPDATED|UNCHANGED|DEACTIVATED_MISSING_FROM_IMPORT`), `fieldChangesJson`.

## دورات Noor والفوترة

### NoorImportCycle (1438)
دورة استيراد Noor. حقول: `schoolAccountId`, `academicYear`, `term`, `status`, `totalSessions`/`pendingSessions`/`committedSessions`, `latestSessionId`?, `isArchived`.
### InvoiceSettings (1468)
إعدادات إنفويسة (مفردة). حقول: `schoolAccountId`?, `sellerName` (افتراضي mojibake — L1), `sellerDomain`, `sellerCountry`, `commercialRegistration`, `taxNumber`, `vatEnabled`, `vatRate`, `invoicePrefix`.
### InvoiceNumberSequence (1485)
تسلسل أرقام: `schoolAccountId`?, `year`, `month`, `lastNumber`.
### Invoice (1496)
إنفويسة. حقول: `paymentTransactionId` (فريد), `invoiceNumber`, `schoolAccountId`?, `sellerJson`, `buyerJson`, `subtotal`, `vatAmount`, `total`, `status`?, `invoiceUrl`?.
### CreditNote (1536)
إشعار دائن: `invoiceId`, `creditNumber` (`CN-<رقم الإنفويسة>`), `reason`, `amount`, `status`.

## التدخلات والاستبيانات

### AssessmentInterventionRule (1562)
قاعدة تدخل. حقول: `schoolAccountId`, `name`, `targetType`, `minScore`?, `maxScore`?, `actionJson`?, `isActive`.
### AssessmentInterventionWorkflowTarget (1594)
هدف سير عمل: `serviceId`, `workflowId`? — غير مستخدم عمليًا (M2).
### Survey (1613)
استبيان. حقول: `schoolAccountId`, `title`, `description`?, `serviceId`?, `token` (فريد), `status` (`SurveyStatus`), `audienceType` (نص حر), `anonymousMode`, `expiresAt`?, `settingsJson`?.
### SurveyQuestion (1654)
سؤال: `surveyId` (Cascade), `key` (فريد ضمن الاستبيان), `text`, `type` (`SurveyQuestionType`), `isRequired`, `order`, `helpText`? (يحمل أقسامًا مختصرة).
### SurveyOption (1682)
خيار: `questionId` (Cascade), `label`, `value`, `order`.
### SurveyResponse (1699)
استجابة: `surveyId`, `status`?, `metadataJson`?, `submittedAt`.
### SurveyAnswer (1724)
إجابة: `responseId`, `questionId`, `value`, `jsonValue`?.

## الشهادات والمحفظة والتقارير المخصصة

### CertificateTemplate (1742)
قالب شهادة: `name`, `serviceSlug`, `type`, `templateJson`, `content`?.
### CertificateBatch (1771)
دفعة شهادات: `schoolAccountId`, `templateId`, `status`, `createdById`?, `settingsJson`.
### IssuedCertificate (1801)
شهادة صادرة: `batchId`?, `studentId`?, `recipientName`, `token`?, `fileUrl`?, `status`, `issuedById`?.
### CertificateAttachment (1850)
مرفق شهادة: `certificateId`, `storageKey`, `fileName`, `mimeType`, `size`.
### CustomReportTemplate (1870)
قالب تقرير مخصص: `schoolAccountId`, `name`, `schemaJson`, `aiGenerated`, `status`.
### CustomReportEntry (1890)
إدخال تقرير مخصص: `schoolAccountId`, `templateId`?, `valuesJson` — **قائمة القيم الفعلية تُقرأ من `CaseEntry`** (M4).
### DashboardResourceLink (1908)
رابط مورف. حقول: `schoolAccountId`?, `sourceType`, `sourceId`, `targetType`, `targetId`, `sortOrder`, `metadataJson`? — فريد على (sourceType, sourceId, targetType, targetId).

## المحفظة والإحصائيات

### AchievementPortfolio (1928)
محفظة معلم: `schoolAccountId`, `teacherUserId`, `title`, `status`, `designJson`?, `settingsJson`?.
### PortfolioSnapshot (1971)
لقطة محفظة: `portfolioId`, `title`, `snapshotJson`, `designJson`?, `createdById`?, `approvedById`?.
### AchievementPortfolioSection (1999)
قسم: `portfolioId`, `type`, `title`, `order`, `dataJson`?.
### AchievementPortfolioItem (2025)
عنصر: `sectionId`, `title`, `description`?, `evidenceJson`?, `order`.
### StatisticalReport (2055)
تقرير إحصائي. حقول: `schoolAccountId`, `serviceSlug`, `name`, `status`, `analysisMode` (`DETERMINISTIC|DEEPSEEK|FALLBACK`), `deterministicMetricsJson`, `aiAnalysisJson`, `sourceReportIdsJson`, `filtersJson`, `createdById`.

## الجداول المدرسية (v2)

### TimetableProject (2145)
مشروع جدول. حقول: `schoolAccountId`, `createdById`, `name`, `status` (`DRAFT|READY|GENERATED|APPROVED|PUBLISHED|ARCHIVED`), `stage` (ELEMENTARY/MIDDLE/HIGH), `daysJson`, `periodsJson`, `settingsJson`.
### TimetableTeacher (2185)
معلم: `projectId`, `userId`?, `name`, `specialty`?, `maxWeeklyLoad`, `isActive`.
### TimetableClass (2217)
صف: `projectId`, `name`, `grade`, `section`.
### TimetableSubject (2238)
مادة: `projectId`, `name`, `abbreviation`?, `weeklyPeriods`.
### TimetableClassSubject (2261)
مادة صف: `classId`, `subjectId`, `weeklyPeriods`.
### TimetableSubjectBankEntry (2284)
بنك مواد: `projectId`?, `name`, `category`.
### TimetableCurriculumTemplate (2299) / Item (2320)
قالب منهج عناصر.
### TimetableAssignment (2341)
تعيين: `teacherId`, `classSubjectId`, `weeklyPeriods`, `preferredPeriods`?.
### TimetableWaitingPolicy (2372)
سياسة انتظار: `projectId`, `type`, `configJson`.
### TimetableDailyAbsence (2419)
غياب يومي: `scheduleId`?, `teacherId`?, `classSubjectId`?, `date`, `type` (`TimetableAbsenceType`), `status`.
### TimetableSubstitution (2458)
استبدال: `projectId`, `date`, `period`?, `originalTeacherId`, `replacementTeacherId`, `status` (`TimetableSubstitutionStatus`).
### TimetableSupervisionDuty (2519) / Assignment (2557)
مهام إشراف/مراقبة.
### TimetableConstraint (2579)
قيود (27 نوعًا، HARD/SOFT) مع جداول ربط `Teacher/Subject/Class/Day/Period/Slot`.
### TimetableSchedule (2687)
نسخة جدول: `projectId`, `version`, `status`, `score`, `completeness`, `hardViolations`, `softPenalty`, `engineVersion`, `dataFingerprint`.
### TimetableScheduleEntry (2726)
إدخال: `scheduleId`, `dayIndex`, `periodIndex`, `teacherId`?, `classSubjectId`?, `room`?, `supervisionDutyId`?.

## ملاحظات

- الأعمدة المفهرسة مهمة للأداء (كل جدول له `@@index` على مفاتيح خارجية وحقول بحث).
- `Json` يُستخدم بكثافة (لقطات، قوائم، إعدادات) — الأنظمة تعتمد على JSON شبه مهيكل أكثر من الجداول العلائقية.
- لا توجد هجرات في المستودع (لا مجلد `prisma/migrations`) — الهجرات تُدار خارجيًا حسب `docs/MYSQL_MIGRATIONS_WORKFLOW.md`.
