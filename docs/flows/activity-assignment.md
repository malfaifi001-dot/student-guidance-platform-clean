# تدفق مهام النشاط — Activity Assignment Flow

مهام من قائد النشاط إلى معلم عبر رابط عام بدون تسجيل دخول.

## النموذج

`ActivityAssignment`:
- `serviceId` + `workflowId` + `domainSlug`/`domainTitle`.
- `teacherName/Phone/Email`.
- `token` فريد + `tokenExpiresAt`.
- `status`: `SENT | OPENED | SUBMITTED | APPROVED | RETURNED | EXPIRED | CANCELED`.
- `submittedValues`/`submittedEvidenceItems` (JSON).
- `caseEntryId` فريد (يُعيّن عند الموافقة).

## الدورة

```mermaid
stateDiagram-v2
    [*] --> SENT: إنشاء من قائد النشاط
    SENT --> OPENED: فتح المعلم للرابط
    OPENED --> SUBMITTED: إرسال (نموذج + توقيع)
    SUBMITTED --> APPROVED: موافقة قائد النشاط (ينشئ حالة)
    SUBMITTED --> RETURNED: إرجاع مع سبب
    RETURNED --> SUBMITTED: إعادة إرسال
    SENT --> EXPIRED: انتهاء tokenExpiresAt
    SENT --> CANCELED: إلغاء
    OPENED --> EXPIRED
```

## التدفق

```mermaid
flowchart TD
    L["قائد النشاط"] --> C["POST /api/dashboard/activity-leader/teacher-assignments<br/>(requireServiceAccessApi activity-programs)"]
    C --> U["رابط عام /teacher/activity-assignment/[token] + wa.me"]
    T["المعلم (بدون تسجيل)"] --> O["فتح الرابط → SENT إلى OPENED"]
    O --> F["نموذج من سير العمل + توقيع"]
    F --> S["POST /api/teacher/activity-assignment/[token]/submit<br/>يحفظ التوقيع PNG في public/uploads/activity-assignments/"]
    S --> R["POST .../teacher-assignments/[assignmentId]/review"]
    R -->|RETURN| RT["إرجاع + returnedReason"]
    R -->|APPROVE| AP["يتطلب teacherSignatureUrl"]
    AP --> CE["saveRuntimeCase → CaseEntry<br/>submission_source = TEACHER_PUBLIC_LINK_APPROVED"]
    CE --> RP["تقرير: /dashboard/activity-leader/reports/activity-card/[caseId]"]
```

## تفاصيل

- الرسالة عبر `wa.me` تقول "لا تحتاج تسجيل دخول".
- الصفحة العامة تفحص حالات `EXPIRED/CANCELED/APPROVED/SUBMITTED` وتمنع الوصول المناسب.
- `domainSlug` يمثل نطاق النشاط (المواطنة، الثقافة، الرياضية، العلمية...).
- لا يوجد استخدام QR في هذا التدفق (QR موجود فقط في مكوّن مشاركة الاستبيان).
- تقارير النشاط تعرض القيم المرسلة عبر `activity-card-report-runtime.ts`.
