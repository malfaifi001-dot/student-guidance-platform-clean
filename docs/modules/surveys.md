# وحدة الاستبيانات — Surveys Module

## الغرض
إنشاء ونشر وتحليل استبيانات، مع روابط عامة بدون تسجيل.

## الملفات
- `lib/surveys/` — config، templates، api-schemas، api-access، recommendations، service.
- `app/api/dashboard/surveys/*` — إدارة اللوحة.
- `app/api/survey/[token]/submit` — الإرسال العام.
- `app/survey/[token]/` + `components/surveys/public-survey-form` — واجهة عامة.

## المسارات

| المسار | الوظيفة |
|---|---|
| `GET/POST /surveys` | قائمة/إنشاء مسودة + `createSurveyToken` |
| `PATCH /surveys/[surveyId]` | update-draft / publish / close / archive |
| `GET /surveys/[surveyId]/responses` | الاستجابات |
| `GET /surveys/[surveyId]/analysis` | إحصائيات لكل سؤال + توصيات |
| `GET /surveys/[surveyId]/export` | Excel |
| `GET /surveys/[surveyId]/export/pdf` | PDF |
| `POST /surveys/[surveyId]/duplicate` | نسخ |
| `GET/POST /surveys/templates` | إنشاء من قوالب |
| `POST /api/survey/[token]/submit` | إرسال عام |

## نمط الإرسال العام
الفتح → فحص التوفر (availability) → وضع مجهول → تحقق المطلوب → كتابة مع idempotency عبر `submissionKey` في `metadata`.

## ملاحظات
- `serviceId` اختياري؛ لا ربط بحالات/طلاب.
- `audienceType` نص حر.
- عناوين الأقسام في `helpText` بـ`[[survey-section]]` (L4).
- تُستخدم كهدف `DashboardResourceLink` نوع `SURVEY_ANALYSIS`.
