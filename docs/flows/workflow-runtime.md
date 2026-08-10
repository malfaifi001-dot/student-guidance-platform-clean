# تدفق سير العمل — Workflow Runtime Flow

كيف يعمل سير عمل خدمة إرشادية من التحميل حتى الحفظ.

## البنية

```
Service (slug)
  └── Workflow (serviceId, isActive, status=ACTIVE, workflowType, activeKey)
        └── WorkflowStep (workflowId, title, order)
              └── DynamicField (stepId, key, type: FieldType, isRequired, order,
                                dependsOnFieldKey?, linkedToValue?, allowOther, isRepeater)
                    └── DynamicFieldOption (fieldId, label, value, order, linkedToValue?)
```

## 1) تحميل سير العمل النشط

`getRuntimeWorkflowByServiceSlug(slug)` في `engine/runtime/runtime-resolver.ts`:
1. جلب `Service` + `Workflow` النشط عبر `buildActiveWorkflowSlotQuery` (`lib/workflows/active-workflow-resolver.ts`).
2. الشروط: `isActive = true` + `status = ACTIVE` + (`activeKey` للفتحة أو `workflowType` alias).
3. تحويل إلى `RuntimeWorkflow/RuntimeStep/RuntimeField/RuntimeOption`.
4. `sortRuntimeWorkflow` ثم `normalizeConditionalWorkflow`.

## 2) المنطق الشرطي

في `engine/runtime/workflow-conditional-logic.ts` و`field-dependency-engine.ts`:
- `normalizeWorkflowFieldType` — يحوّل الأسماء القديمة: `TEXT_AREA→TEXTAREA`, `DROPDOWN→SELECT`, `FILE→FILE_UPLOAD`...
- `conditionalValueMatches` — مطابقة قيم الشرط (أو على المصفوفات).
- `isConditionalWorkflowFieldVisible` / `shouldShowField` — إظهار الحقل إذا توافق `dependsOnFieldKey` مع `linkedToValue`.
- `filterConditionalWorkflowOptions` — تصفية الخيارات حسب قيمة الحقل الأب (`option.linkedToValue`).
- `validateStepRequiredFields` — تحقق الحقول المرئية المطلوبة (يحسب المجموعات الفارغة).

## 3) التنقل بين الخطوات

- عميل-جانب في `components/workflow/dynamic-form-renderer.tsx`:
  - `goNext()` يستدعي `validateCurrentStep()` (المطلوب + تفاصيل `__OTHER__` + صفوف اللجان عبر `isCommitteeRowsValid`) ثم يتقدم.
- لا يوجد قفز على مستوى الخادم — كل الخطوات تُعرض حسب الشرطية فقط.

## 4) الحفظ

- `saveRuntimeCase` / `updateRuntimeCase` في `engine/cases/case-runtime-engine.ts` (انظر `flows/case-lifecycle.md`).
- عند الحفظ تُؤخذ **لقطة** `buildWorkflowSnapshotForCase` → `CaseEntry.workflowSnapshot`.

## مخطط

```mermaid
flowchart LR
    A["زيارة الخدمة"] --> B["getRuntimeWorkflowByServiceSlug"]
    B --> C["buildActiveWorkflowSlotQuery"]
    C --> D["RuntimeWorkflow + normalizeConditionalWorkflow"]
    D --> E["dynamic-form-renderer (خطوات/شرطية)"]
    E --> F["validateStepRequiredFields"]
    F --> G["saveRuntimeCase"]
    G --> H["لقطة + CaseValue + Evidence"]
```

## أنواع الحقول المدعومة في العارض

| النوع | العارض |
|---|---|
| TEXT/NUMBER/DATE | حقول إدخال عادية |
| TEXTAREA/RICH_TEXT | area + `SpecialReportFieldAi` (نص غير متكرر) |
| SELECT/RADIO | قائمة + `filterConditionalWorkflowOptions` + خيار `__OTHER__` |
| MULTI_SELECT/CHECKBOX | شبكة تحديد |
| FILE_UPLOAD/IMAGE_UPLOAD | `<input type="file">` (File فقط — الحفظ عبر الأدلة) |
| REPEATER | `RepeaterFieldCard` (`normalizeRepeaterItems`) |
| STUDENT_PICKER | بطاقة نظام منفصلة `SmartStudentPickerCard` |
| PARENT_PICKER/STAFF_PICKER/SIGNATURE | **غير مدعومة في هذا العارض** ("نوع الحقل غير مدعوم") |

## اختيار الطالب والنظاميات

`SmartStudentPickerCard` في `dynamic-form-renderer.tsx` يبحث عبر `/api/dashboard/students/search` ويكتب مفاتيح محجوزة:
`selectedStudent`, `selected_students_count`, `selected_students_names_text`, `selected_students_json`, `primary_student_id`.
- `applyStudentAutofill`/`STUDENT_AUTOFILL_ALIASES` — تعبئة تلقائية لحقول بالاسم المستعار.
- `isEvidenceStep`/`isEvidenceField` — تحديد خطوة الأدلة → `EvidenceUploadCard`.

## التنشيط/النشر

- النشر: `POST /api/dashboard/admin/workflows/[serviceSlug]/publish` — نسخة → ACTIVE عبر `activateWorkflow` (`lib/workflows/workflow-activation-service.ts`).
- `activateWorkflow` يستخدم `FOR UPDATE` ويُنشئ `activeKey = serviceId:workflowType` (فريد) ويؤرشف سابقاته.

## ملاحظات

- المسار الحديث للإنشاء: رفع Excel (`POST admin/workflows/upload`) أو بناء JSON (`POST admin/workflows/[serviceSlug]/draft`).
- مسار `workflow-builder` القديم شبه معطّل (H7).
- لا يوجد فرع على مستوى الخادم يتجاوز خطوات — الشرطية إظهار/إخفاء فقط.
