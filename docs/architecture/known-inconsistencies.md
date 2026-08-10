# التناقضات المعروفة — Known Inconsistencies

سجلّ للتناقضات المكتشفة في الكود الفعلي. **تُصنَّف ولا تُصلَح** ما لم يُطلب ذلك صراحةً. التصنيفات: `معلومة` (Informational) / `منخفض` (Low) / `متوسط` (Medium) / `مرتفع` (High).

## مرتفع (High)

| # | الوصف | الموقع | الأثر |
|---|---|---|---|
| H1 | مساران متوازيان للحراسة: `lib/subscription/subscription-guard.ts` (redirect) و`@/bin/require-auth.ts` (402 JSON)، والكود يستورد من `bin` مباشرة | `bin/require-auth.ts`، `lib/subscription/subscription-api-guard.ts` | سلوكان مختلفان لنفس المفهوم حسب المسار |
| H2 | مساران للأدلة: `Evidence` (من حفظ الحالة، `EvidenceType`) و`CaseEvidence` (من `/api/dashboard/evidence`، نوع مشتق من mimeType فقط) — الحذف يمسّهما معًا، لكن لقطة الاستعادة تقرأ القيم فقط | `engine/cases/case-runtime-engine.ts`، `app/api/dashboard/evidence/route.ts` | عرض/تصدير أدلة غير متسق |
| H3 | تحديث الحالة حذفٌ كاملٌ ثم إعادة إنشاء لكل `CaseValue` و`Evidence` | `updateRuntimeCase` في `engine/cases/case-runtime-engine.ts` | فقدان `createdAt`، ازدحام كتابة |
| H4 | ثلاثة مصادر متباعدة للقراءة بعد الحفظ: `restoreCaseDraft` (الحالة الحية) مقابل `resolveArabicCaseReportTitle` (لقطة) مقابل العرض (`fieldKey` فقط لأن `CaseValue.fieldId` لا يُعيّن) | `engine/cases`، `lib/cases/resolve-arabic-case-report-title.ts`، `lib/cases/workflow-display-value.ts` | خطر انحراف النصوص |
| H5 | محرّكا إظهار شرطي شبه متطابقين: `isConditionalWorkflowFieldVisible` و`shouldShowField` كلاهما مستخدم | `engine/runtime/workflow-conditional-logic.ts`، `engine/runtime/field-dependency-engine.ts` | سلوكيات متباعدة |
| H6 | كود ميت كامل: `lib/report-engine-legacy/` و`lib/reports-legacy/` و`components/reports-legacy/` نسخ مطابقة تقريبًا للأنظمة الحية، غير مستوردة | `lib/report-engine-legacy/*` | خطر استيراد خاطئ مستقبلًا |
| H7 | مسارا رفع/إدارة متوازيان لسير العمل: `app/api/dashboard/admin/workflows/*` (نشط) مقابل `app/api/dashboard/workflow-builder/*` + `components/admin/workflow-step-editor.tsx` (أيتام/شبه معطّلة) | `app/api/dashboard/admin/workflows`، `app/api/dashboard/workflow-builder` | التباس في مسار الإنشاء الرسمي |

## متوسط (Medium)

| # | الوصف | الموقع |
|---|---|---|
| M1 | مساران لبناء ملخص التقييم بحدود تصنيف مختلفة (90/70/50 مقابل 90/80/70/60) | `engine/assessment-center/assessment-center-engine.ts` مقابل `lib/assessment-center/assessment-analysis-summary.ts` |
| M2 | `AssessmentInterventionWorkflowTarget` معرّف في الـ schema وغير مستخدم في مسارات التدخلات؛ قواعد التدخل تُخزَّن لكن لا تُنفَّذ — `create-case` يأخذ الحزمة مباشرة | `prisma/schema.prisma:1594`، `app/api/dashboard/assessment-center/interventions/*` |
| M3 | `UsageLimit` و`UsageRecord` غير مستخدمين في كود TypeScript إطلاقًا | `prisma/schema.prisma:868,880` |
| M4 | `CustomReportEntry` معرّف لكن قوائم الإدخالات تُقرأ من `CaseEntry`، و`POST entries` لا يكتب `templateId` | `lib/custom-report/` |
| M5 | `CaseStatus.ARCHIVED` معرّف وله تسمية واجهة لكن لا يوجد أي مسار يكتبه | `prisma/schema.prisma:113`، `app/dashboard/cases/page.tsx` |
| M6 | `autosave` في الحالات مسار وهمي (auth فقط)؛ `engine/autosave/autosave-engine.ts` يبني حمولة فقط | `app/api/dashboard/cases/autosave/route.ts` |
| M7 | `GET reports` يعرض قوائم `report-2` من `ReportTwoActive`/`ReportSnapshot` بينما تقارير `report-1` تكتب `GuidanceReport` — نظامان متعايشان | `app/api/dashboard/reports/*`، `app/api/dashboard/report-1/*` |
| M8 | مسارا تصدير PDF: طباعة المتصفح (report-2) مقابل Playwright/Puppeteer (reports/guardian-summons/certificates) — مخرجات مختلفة البنية | `app/api/dashboard/report-2/*/export/pdf` مقابل `app/api/dashboard/reports/[reportId]/export/pdf` |
| M9 | نسخة كاملة من منطق الاعتماد داخل `approveReportTwoSnapshot` بعد `return` غير مشروط (سطور لا تُنفَّذ أبدًا) + تكرار في `createReportTwoApprovedSnapshotInternal` | `components/report-2/report-two-studio-runtime.tsx` (≈3341–3386) |
| M10 | مدرّج النسخ الرديء: `components/reports/new-report-case-picker.tsx.tsx` | `components/reports/` |
| M11 | `bank-transfer` POST يتجاهل `planId`/`durationDays`/`billingCycle` (أعمدة موجودة)، بينما الموافقة تتطلب `planId` | `app/api/dashboard/subscription/bank-transfer/route.ts` |
| M12 | `NO_SERVICE_RULES_YET` يمنح وصولًا مفتوحًا عند غياب صفوف `ServiceAccess` | `lib/subscription/subscription-service.ts` |
| M13 | وكلاء الدفع يخزّنون `providerId=null` (تربط بـ`IntegrationProvider` لا بـ`PaymentProvider`) | `app/api/payments/webhooks/[provider]/route.ts` |
| M14 | صيغة اسم العلامة: Apple Pay "Teachix/teachix.sa" مقابل الإنفويسات "smstudents.com" | `app/api/payments/moyasar/apple-pay/session/route.ts` |

## منخفض (Low)

| # | الوصف | الموقع |
|---|---|---|
| L1 | قيم افتراضية تالفة الترميز (mojibake) في `InvoiceSettings` (`sellerName`/`sellerCountry`)، تُصلح عند الكتابة عبر `updateInvoiceSettings` | `prisma/schema.prisma:1468` |
| L2 | `noor-import-audit.ts` يكتب `userId`/`event`/`type` لا تطابق `PlatformActivityLog` (`actorUserId`) عبر `prisma as any` + try/catch | `lib/data-center/noor-import-audit.ts` |
| L3 | `results-analysis-utils.ts` فارغ (`export {}`) | `lib/results-analysis/results-analysis-utils.ts` |
| L4 | استبيان: عناوين الأقسام/النصوص تُهرَّب في `helpText` عبر بادئة `[[survey-section]]` | `lib/surveys/survey-config.ts` |
| L5 | `payment-provider-contract.ts` واجهة عقد تجرّب وتُرمى دائمًا (unused) | `lib/subscription/payment-provider-contract.ts` |
| L6 | `filtersJson` في الإحصائيات يخزّن `serviceSlug` و`serviceSlugs` معًا | `lib/statistics/` |
| L7 | الحدّ الأقصى لعدد الصفحات في `report-block-paginator.ts` يعتمد تقديرًا على عدد الأحرف (260) بينما `physical-layout-planner.ts` هو المالك الرسمي للترقيم | `lib/report-engine/` |
| L8 | قائمة MIME في parser النتائج تتضمن `application/octet-stream` | `app/api/dashboard/results-analysis/route.ts` |
| L9 | كلمة مرور التسجيل بها حقلان (`password` + `confirmPassword`) والـ reset له حقلان أيضًا رغم غياب أي باك-إند للـ reset | `lib/auth/public-registration-schema.ts`، `app/reset-password` |
| L10 | التسجيل الجديد يضبط `onboardingSkippedAt` تلقائيًا ثم يعيد التوجيه إلى لوحة البداية | `lib/auth/public-registration-service.ts` |

## معلومات (Informational)

| # | الوصف |
|---|---|
| I1 | `UsageLimit`/`UsageRecord` نماذج "جاهزة" دون استهلاك فعلي — مرشحة لحذف مستقبلي أو استهلاك لاحق. |
| I2 | `Workflow` يحفظ الملف الأصلي (اسم/مفتاح تخزين/MIME/حجم/تاريخ) — ميزة كاملة لكن لا توجد واجهة مستخدم لتجديد الملف. |
| I3 | `engine/services/service-workspace-engine.ts` يضمن وجود الخدمة عند كل زيارة مساحة عمل (`ensureServiceBySlug`). |
| I4 | `prisma db push` و`migrate reset` ممنوعان في هذا المشروع (انظر `adr/README.md` و`docs/MYSQL_MIGRATIONS_WORKFLOW.md`). |
| I5 | `lib/workflows/workflow-types.backup-before-subworkflow.ts` نسخة احتياطية قديمة في المسار — لا تُستورد. |
| I6 | لا توجد ملفات `WorkflowDefinition/WorkflowField/WorkflowFieldOption` في الـ schema إطلاقًا — هذه الأسماء وردت فقط في وثائق قديمة؛ النماذج الحقيقية `Workflow/WorkflowStep/DynamicField/DynamicFieldOption`. |

## قاعدة التحديث

عند اكتشاف تناقض جديد: أضف صفًا في الجدول المناسب، لا تُصلح الشفرة. تصنيف "مرتفع" = يؤثر على صحة البيانات أو سلوك متوقع للعميل بمسارات متعددة.
