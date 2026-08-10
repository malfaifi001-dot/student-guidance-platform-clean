# تدفق الاستبيانات — Surveys Flow

استبيانات داخلية (لوحة) وعامة (روابط).

## النموذج

- `Survey` (سؤال) + `SurveyQuestion` + `SurveyOption` + `SurveyResponse` + `SurveyAnswer`.
- `Survey.token` فريد — رابط عام `app/survey/[token]`.
- `audienceType` نص حر وليس enum.
- عناوين الأقسام تُهرَّب في `helpText` عبر `[[survey-section]]` (L4).

## الإنشاء والنشر

```mermaid
flowchart TD
    A["POST /api/dashboard/surveys (create draft + createSurveyToken)"]
    A --> B["GET/PATCH /surveys/[surveyId]"]
    B --> C{"أفعال"}
    C -->|update-draft| D["تعديل"]
    C -->|publish| E["نشر"]
    C -->|close| F["إغلاق"]
    C -->|archive| G["أرشفة"]
    B --> H["duplicate / templates / export / analysis"]
```

- `templates` — إنشاء من قوالب `lib/surveys/survey-templates.ts`.
- `analysis` — إحصائيات لكل سؤال + `buildSurveyRecommendations` (قواعد استدلال).

## الرد العام

```mermaid
sequenceDiagram
    participant R as ولي أمر/طالب
    participant P as app/survey/[token]
    participant A as POST /api/survey/[token]/submit
    participant DB as Prisma

    R->>P: فتح الرابط (لا جلسة)
    P->>A: إرسال
    A->>A: availability gating + anonymous mode + تحقق المطلوب
    A->>DB: idempotency عبر submissionKey في metadata
    A-->>R: تأكيد
```

## الربط والاستهلاك

- `serviceId` اختياري — لا ربط مباشر بحالات أو طلاب.
- تُستخدم كهدف `DashboardResourceLink` بنوع `SURVEY_ANALYSIS`.
- تصدير النتائج: `export` (exceljs) و`export/pdf` (طباعة/Playwright).
