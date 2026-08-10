# مسارات API حسب الوحدة — API by Module

تفاصيل مسارات كل وحدة (طريقة + وظيفة). المجلدات الجذرية تحت `app/api/`.

## auth
| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/auth/login` | POST | دخول + كعكة جلسة |
| `/api/auth/logout` | POST | إبطال جلسة |
| `/api/auth/register` | POST | تسجيل عام |

## payments
| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/payments/checkout` | POST | إنشاء معاملة CARD + checkoutUrl |
| `/api/payments/moyasar/callback` | GET | اعتماد دفع بعد إعادة جلب |
| `/api/payments/moyasar/apple-pay/session` | POST | جلسة Apple Pay |
| `/api/payments/webhooks/[provider]` | POST | ويب هوك (مفيد/idempotent) |

## dashboard/subscription
| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/dashboard/subscription` | GET | نظرة الاشتراك + خطة افتراضية |
| `/api/dashboard/subscription/bank-transfer` | POST | طلب تحويل بنكي |
| `/api/dashboard/subscription/redeem-code` | POST | استبدال كود تفعيل |

## dashboard/cases
| المسار | الطريقة | الوظيفة |
|---|---|---|
| `/api/dashboard/cases/save-draft` | POST | حفظ مسودة |
| `/api/dashboard/cases/submit` | POST | حفظ + تقديم |
| `/api/dashboard/cases/[caseId]` | GET/PATCH/DELETE | قراءة/تعديل/حذف |
| `/api/dashboard/cases/autosave` | POST | وهمي (M6) |
| `/api/dashboard/evidence` | POST | رفع `CaseEvidence` |

## dashboard/admin/workflows (مسار الإنشاء الحديث)
| المسار | الطريقة | الوظيفة |
|---|---|---|
| `upload` | POST | رفع Excel → نسخة DRAFT |
| `[serviceSlug]/draft` | POST | بناء JSON |
| `[serviceSlug]/publish` | POST | نشر |
| `[serviceSlug]/activate` | PATCH | تفعيل (نشط وحيد) |
| `[serviceSlug]/delete` | DELETE | حذف |
| `[serviceSlug]/rename` / `draft-name` | POST | تسمية |
| `[serviceSlug]/evidence-mode` | PATCH | وضع الأدلة |
| `[serviceSlug]/student-picker-mode` | PATCH | وضع منتقي الطلاب |
| `[serviceSlug]/[workflowId]/original-file` | GET | تحميل الملف الأصلي |

## dashboard/workflow-builder (قديم)
- `create-step` POST، `create-field` POST — تُستخدم من مكوّنات أيتام (H7).

## dashboard/report-2
| المسار | الطريقة | الوظيفة |
|---|---|---|
| `cases/[caseId]/save` | PUT | upsert `ReportTwoActive` |
| `cases/[caseId]/approve` | POST | إنشاء `ReportSnapshot` + APPROVED |
| `cases/[caseId]/export/pdf` | POST | حمولة طباعة (`PRINT_PREVIEW`) |
| `snapshots` | GET | قائمة اللقطات |
| `snapshots/[snapshotId]` | GET/DELETE | لقطة |

## dashboard/report-templates
- `route` GET/POST، `[templateId]` GET/PUT/DELETE، `[templateId]/use` POST.

## dashboard/reports و report-1 (GuidanceReport قديم)
- `prepare`، `case/[caseId]/generate|prepare|execution-summary`، `[reportId]`، `approve`، `delete`، `duplicate`، `evidence`، `export/pdf`؛ و`report-1` نظيرتها.
- `report/*` shims إلى `reports/*`.

## dashboard/assessment-center
- `route` POST (رفع/تحليل)، `[analysisId]/student-linking` PATCH، `student-linking/auto`، `[analysisId]/export`، `[analysisId]/delete`، `interventions/rules`، `interventions/options`، `interventions/create-case`.

## dashboard/results-analysis
- `route` POST (رفع/تحليل)، `[analysisId]/delete`، `[analysisId]/export` (CSV).

## dashboard/surveys
- `route` GET/POST، `[surveyId]` GET/PATCH، `responses`، `analysis`، `export`، `export/pdf`، `duplicate`، `templates`.

## dashboard/statistics
- `services` GET، `prepare` POST، `description` POST (AI)، `generate` POST، `reports` GET.

## dashboard/custom-report
- `entries` GET/POST، `suggest` POST، `templates` GET/POST، `templates/[templateId]`.

## dashboard/special-report
- `templates` GET، `runtime` POST، `runtime/fields/[fieldId]` GET، `ai` POST.

## dashboard/data-center (الاستيراد)
- `noor-import/sessions|preview|cycles(+[cycleId])|[sessionId]/rows|commit|archive`.
- `student-data-import/*` (نسخة موازية) و`students/*` و`school-data/student-import-sessions/*` (قديم).

## dashboard/activity-leader
- `teacher-assignments` POST (إنشاء)، `teacher-assignments/[assignmentId]/review` POST (RETURN/APPROVE)، تقارير النشاط.

## dashboard/admin
| المجموعة | مسارات نموذجية |
|---|---|
| `users` | CRUD + password + impersonate |
| `subscriptions` | create-plan، toggle، assign، extend، cancel-delete، toggle-service-access، save-default-free-plan |
| `subscribers` | GET |
| `activations` | codes GET/POST، manual، cancel، bank-transfer/[id]/approve|reject |
| `payments` | list، export، invoices(+[invoiceId]{cancel,pdf})، invoice-settings، providers، reconciliation، [transactionId]{cancel,refund,reconcile,invoice} |
| `system-health` | GET |
| `activity` + `metrics` | سجل + قياسات |
| `counselor-reference-library` | items CRUD + upload + file |

## dashboard/timetable-v2
- `projects/[projectId]/daily-operations` — الوحيد؛ الباقي عبر Server Components و`lib/timetable-v2`.

## أخرى
- `calendar`، `certificates`، `family-school-communication`، `portfolio`، `principal`، `onboarding`، `plans`، `settings`، `student-follow-up`، `ai-report`، `ai-report2`، `resource-links`، `students/search`، `school-data`.
