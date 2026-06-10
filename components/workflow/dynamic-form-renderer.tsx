
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EvidenceUploadCard } from "@/components/evidence/evidence-upload-card";
import { EvidencePreviewGrid } from "@/components/evidence/evidence-preview-grid";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import {
  WorkflowStepCard,
  isCommitteeChainStep,
} from "@/components/workflow/workflow-step-card";

import { isCommitteeRowsValid } from "@/components/committees/committee-chain-repeater";

import type {
  RuntimeField,
  RuntimeStep,
  RuntimeWorkflow,
} from "@/engine/runtime/runtime-resolver";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
};

type FeedbackState = {
  open: boolean;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
};

type SmartStudent = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  stage?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
};

type Props = {
  workflow: RuntimeWorkflow;
  serviceId: string;
  requiresStudent?: boolean;
  title?: string | null;
  caseId?: string;
  initialValues?: RuntimeValues;
  initialEvidenceItems?: EvidenceItem[];
  previewMode?: boolean;
};

/**
 * خدمات تسمح بالشواهد على مستوى النظام.
 * الظهور الفعلي للشواهد لا يكون هنا فقط؛ بل لازم تكون الخطوة الحالية خطوة شواهد.
 */
const SERVICES_WITH_EVIDENCE = new Set([
  "guidance-programs",
  "student-follow-up",
  "family-school-communication",
  "student-guidance-services",
  "committees-meetings",
]);

/**
 * خدمات تحتاج اختيار طالب/طالبة افتراضيًا.
 * يمكن تجاوزها من الصفحة عبر requiresStudent={false}.
 */
const SERVICES_REQUIRING_STUDENT = new Set([
  "student-follow-up",
  "family-school-communication",
  "student-guidance-services",
]);

function normalizeRuntimeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function stepSearchText(step?: RuntimeStep | null) {
  if (!step) return "";

  return normalizeRuntimeText(
    [
      step.title,
      step.description ?? "",
      ...step.fields.map((field) =>
        [
          field.key,
          field.label,
          field.type,
          field.placeholder ?? "",
          field.helpText ?? "",
        ].join(" ")
      ),
    ].join(" ")
  );
}

function isEvidenceField(field: RuntimeField) {
  const text = normalizeRuntimeText(
    [
      field.key,
      field.label,
      field.type,
      field.placeholder ?? "",
      field.helpText ?? "",
    ].join(" ")
  );

  return (
    field.type === "FILE_UPLOAD" ||
    field.type === "IMAGE_UPLOAD" ||
    text.includes("evidence") ||
    text.includes("attachment") ||
    text.includes("attachments") ||
    text.includes("file_upload") ||
    text.includes("image_upload") ||
    text.includes("شواهد") ||
    text.includes("الشواهد") ||
    text.includes("مرفقات") ||
    text.includes("المرفقات") ||
    text.includes("ملف") ||
    text.includes("صوره") ||
    text.includes("صورة")
  );
}

function isEvidenceStep(step?: RuntimeStep | null) {
  if (!step) return false;

  const text = stepSearchText(step);

  return (
    step.fields.some(isEvidenceField) ||
    text.includes("evidence") ||
    text.includes("attachment") ||
    text.includes("attachments") ||
    text.includes("شواهد") ||
    text.includes("الشواهد") ||
    text.includes("مرفقات") ||
    text.includes("المرفقات")
  );
}

function isStudentPickerField(field: RuntimeField) {
  const text = normalizeRuntimeText(
    [field.key, field.label, field.type, field.helpText ?? ""].join(" ")
  );

  return (
    field.type === "STUDENT_PICKER" ||
    text.includes("student_picker") ||
    text.includes("student picker") ||
    text.includes("اختيار طالب") ||
    text.includes("اختيار الطالبه") ||
    text.includes("اختيار الطالبة") ||
    text.includes("الطالب المستهدف") ||
    text.includes("الطالبه المستهدفه") ||
    text.includes("الطالبة المستهدفة")
  );
}

function isStudentPickerStep(step?: RuntimeStep | null) {
  if (!step) return false;

  const text = stepSearchText(step);

  return (
    step.fields.some(isStudentPickerField) ||
    text.includes("student_picker") ||
    text.includes("student picker") ||
    text.includes("اختيار طالب") ||
    text.includes("اختيار الطالبة") ||
    text.includes("الطالب المستهدف")
  );
}


function isCommitteeChainRuntimeField(field: RuntimeField) {
  const text = normalizeRuntimeText(
    [
      field.key,
      field.label,
      field.type,
      field.placeholder ?? "",
      field.helpText ?? "",
    ].join(" ")
  );

  return (
    text.includes("agenda") ||
    text.includes("agendaitem") ||
    text.includes("committee_agenda") ||
    text.includes("جدول") ||
    text.includes("الاعمال") ||
    text.includes("discussion") ||
    text.includes("discussionaxis") ||
    text.includes("committee_discussion") ||
    text.includes("محور") ||
    text.includes("نقاش") ||
    text.includes("recommendation") ||
    text.includes("committee_recommendation") ||
    text.includes("توصي")
  );
}

const RUNTIME_SERVICE_LABELS: Record<string, string> = {
  "guidance-programs": "البرامج الإرشادية",
  "student-follow-up": "متابعة الطلاب",
  "family-school-communication": "التواصل بين الأسرة والمدرسة",
  "student-guidance-services": "الخدمات الإرشادية",
  "committees-meetings": "اللجان والاجتماعات",
};

const RUNTIME_CASE_TITLE_FALLBACK_LABELS: Record<string, string> = {
  positive_behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
  behavior_discipline: "برنامج تعزيز السلوك الإيجابي والانضباط المدرسي",
};

function normalizeRuntimeCaseTitleText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanRuntimeCaseTitle(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text || text === "null" || text === "undefined" || text.length > 140) {
    return "";
  }

  return text;
}

function isGenericRuntimeCaseTitle(title: string) {
  const normalized = normalizeRuntimeCaseTitleText(title);

  return (
    !normalized ||
    normalized === "بدون عنوان" ||
    normalized === "حاله بدون عنوان" ||
    normalized === "حالة بدون عنوان" ||
    normalized === "حاله جديده" ||
    normalized === "حالة جديدة" ||
    normalized.includes("برنامج ارشادي جديد")
  );
}

function extractRuntimeTitleSelectedValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractRuntimeTitleSelectedValues(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return [
      ...extractRuntimeTitleSelectedValues(record.value),
      ...extractRuntimeTitleSelectedValues(record.id),
      ...extractRuntimeTitleSelectedValues(record.key),
      ...extractRuntimeTitleSelectedValues(record.slug),
      ...extractRuntimeTitleSelectedValues(record.label),
      ...extractRuntimeTitleSelectedValues(record.name),
    ];
  }

  return [];
}

function isRuntimeTitleField(field: RuntimeField) {
  const text = normalizeRuntimeCaseTitleText(
    [field.key, field.label, field.type, field.helpText ?? ""].join(" "),
  );

  return (
    text.includes("program") ||
    text.includes("activity") ||
    text.includes("title") ||
    text.includes("برنامج") ||
    text.includes("النشاط") ||
    text.includes("عنوان") ||
    text.includes("موضوع")
  );
}

function getRuntimeFieldOptionLabel(field: RuntimeField, rawValue: unknown) {
  const selectedValues = extractRuntimeTitleSelectedValues(rawValue);

  for (const selectedValue of selectedValues) {
    const cleanSelected = String(selectedValue).trim();

    if (!cleanSelected) {
      continue;
    }

    const fallbackLabel = RUNTIME_CASE_TITLE_FALLBACK_LABELS[cleanSelected];

    if (fallbackLabel) {
      return fallbackLabel;
    }

    const option = field.options.find((item) => {
      return (
        String(item.value || "").trim() === cleanSelected ||
        String(item.label || "").trim() === cleanSelected
      );
    });

    if (option?.label) {
      return cleanRuntimeCaseTitle(option.label);
    }
  }

  return "";
}

function getSmartRuntimeCaseTitle({
  workflow,
  values,
  fallbackTitle,
}: {
  workflow: RuntimeWorkflow;
  values: RuntimeValues;
  fallbackTitle?: string | null;
}) {
  for (const step of workflow.steps) {
    for (const field of step.fields) {
      if (!isRuntimeTitleField(field)) {
        continue;
      }

      const rawValue = values[field.key];

      const candidate =
        getRuntimeFieldOptionLabel(field, rawValue) ||
        cleanRuntimeCaseTitle(rawValue);

      if (candidate && !isGenericRuntimeCaseTitle(candidate)) {
        return candidate;
      }
    }
  }

  const cleanFallback = cleanRuntimeCaseTitle(fallbackTitle);

  if (cleanFallback && !isGenericRuntimeCaseTitle(cleanFallback)) {
    return cleanFallback;
  }

  return RUNTIME_SERVICE_LABELS[workflow.serviceSlug] || workflow.name || "حالة جديدة";
}

function hasEvidenceStep(workflow: RuntimeWorkflow) {
  return workflow.steps.some(isEvidenceStep);
}

function hasStudentPickerStep(workflow: RuntimeWorkflow) {
  return workflow.steps.some(isStudentPickerStep);
}

function isEmptyValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function DynamicFormRenderer({
  workflow,
  serviceId,
  requiresStudent,
  title,
  caseId,
  initialValues,
  initialEvidenceItems,
  previewMode = false,
}: Props) {
  const router = useRouter();

  const steps = useMemo(() => {
    return [...workflow.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        ...step,
        fields: [...step.fields]
          .sort((a, b) => a.order - b.order)
          .map((field) => ({
            ...field,
            options: [...field.options].sort((a, b) => a.order - b.order),
          })),
      }));
  }, [workflow.steps]);

  const normalizedWorkflow: RuntimeWorkflow = useMemo(
    () => ({
      ...workflow,
      steps,
    }),
    [workflow, steps]
  );

  const workflowHasEvidenceStep = useMemo(
    () => hasEvidenceStep(normalizedWorkflow),
    [normalizedWorkflow]
  );

  const workflowHasStudentPickerStep = useMemo(
    () => hasStudentPickerStep(normalizedWorkflow),
    [normalizedWorkflow]
  );

  const supportsEvidence =
    SERVICES_WITH_EVIDENCE.has(workflow.serviceSlug) || workflowHasEvidenceStep;

  const workflowStudentPickerMode =
    typeof (workflow as any).studentPickerMode === "string"
      ? (workflow as any).studentPickerMode
      : "SERVICE_DEFAULT";

  const workflowStudentPickerDecision =
    workflowStudentPickerMode === "REQUIRED"
      ? true
      : workflowStudentPickerMode === "DISABLED"
        ? false
        : undefined;

  const needsStudent =
    workflowStudentPickerDecision ??
    requiresStudent ??
    SERVICES_REQUIRING_STUDENT.has(workflow.serviceSlug);

  // WORKFLOW_STUDENT_PICKER_MODE_RUNTIME_MARKER

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [values, setValues] = useState<RuntimeValues>(initialValues ?? {});
  const [selectedStudent, setSelectedStudent] = useState<SmartStudent | null>(
    () => extractInitialStudent(initialValues)
  );

  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(
    initialEvidenceItems ?? []
  );

  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    type: "info",
    title: "",
  });

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const showEvidenceCard = supportsEvidence && isEvidenceStep(currentStep);

  const showStudentPickerCard =
    needsStudent &&
    (isStudentPickerStep(currentStep) ||
      (!workflowHasStudentPickerStep && isFirstStep));

  const showStudentSummaryCard =
    needsStudent && !showStudentPickerCard && Boolean(selectedStudent);

  function showFeedback(
    type: FeedbackState["type"],
    titleText: string,
    message?: string
  ) {
    setFeedback({
      open: true,
      type,
      title: titleText,
      message,
    });
  }

  function shouldShowFieldForValues(field: RuntimeField, currentValues: RuntimeValues) {
    if (!field.dependsOnFieldKey) return true;

    const parentValue = currentValues[field.dependsOnFieldKey];

    if (isEmptyValue(parentValue)) return false;

    if (!field.linkedToValue) return true;

    if (Array.isArray(parentValue)) {
      return parentValue.map(String).includes(String(field.linkedToValue));
    }

    return String(parentValue) === String(field.linkedToValue);
  }

  function normalizeDefaultList(value: unknown) {
    if (Array.isArray(value)) {
      return value.map(String).map((item) => item.trim()).filter(Boolean);
    }

    if (typeof value === "string") {
      const text = value.trim();

      if (!text) {
        return [];
      }

      return text
        .split(/[\n|,،;]+/g)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  function getFieldDefaultValue(field: RuntimeField) {
    const defaultJson = (field as any).defaultJson;

    if (defaultJson !== undefined && defaultJson !== null) {
      return defaultJson;
    }

    const defaultValue = (field as any).defaultValue;

    if (defaultValue === undefined || defaultValue === null || defaultValue === "") {
      return undefined;
    }

    if (field.type === "MULTI_SELECT" || field.type === "CHECKBOX") {
      return normalizeDefaultList(defaultValue);
    }

    return String(defaultValue);
  }

  function applyAutoSelectedDefaults(currentValues: RuntimeValues) {
    const allFields = steps.flatMap((step) => step.fields);
    const next: RuntimeValues = { ...currentValues };

    let changed = true;

    while (changed) {
      changed = false;

      for (const field of allFields) {
        if (!(field as any).autoSelectWhenLinked) {
          continue;
        }

        if (!shouldShowFieldForValues(field, next)) {
          continue;
        }

        if (!isEmptyValue(next[field.key])) {
          continue;
        }

        const defaultValue = getFieldDefaultValue(field);

        if (defaultValue === undefined || isEmptyValue(defaultValue)) {
          continue;
        }

        next[field.key] = defaultValue;
        changed = true;
      }
    }

    return next;
  }

  /**
   * يمسح القيم التابعة عند تغيير القيمة الأب، ثم يعبئ القيم الافتراضية
   * للحقول التابعة التي تحمل autoSelectWhenLinked.
   */
  function updateValue(fieldKey: string, value: unknown) {
    setValues((current) => {
      const next: RuntimeValues = {
        ...current,
        [fieldKey]: value,
      };

      const dependentKeys = new Set<string>();
      const changedKeys = new Set<string>([fieldKey]);

      let keepSearching = true;

      while (keepSearching) {
        keepSearching = false;

        for (const step of steps) {
          for (const field of step.fields) {
            if (!field.dependsOnFieldKey) continue;

            if (
              changedKeys.has(field.dependsOnFieldKey) &&
              !dependentKeys.has(field.key)
            ) {
              dependentKeys.add(field.key);
              changedKeys.add(field.key);
              keepSearching = true;
            }
          }
        }
      }

      for (const key of dependentKeys) {
        delete next[key];
        delete next[`${key}__other`];
      }

      if (dependentKeys.size === 0) {
        return next;
      }

      return applyAutoSelectedDefaults(next);
    });
  }

  function handleStudentSelected(student: SmartStudent | null) {
    setSelectedStudent(student);

    setValues((current) => ({
      ...current,
      selectedStudent: student
        ? {
            id: student.id,
            fullName: student.fullName,
            nationalId: student.nationalId,
            grade: student.grade,
            classroom: student.classroom,
            stage: student.stage,
            guardianName: student.guardianName,
            guardianPhone: student.guardianPhone,
          }
        : null,
    }));
  }

  function validateStudentSelection() {
    if (!needsStudent) return true;

    if (selectedStudent?.id) return true;

    showFeedback(
      "warning",
      "اختيار الطالب/الطالبة مطلوب",
      "اختر الطالب/الطالبة أولًا قبل حفظ أو إرسال الحالة."
    );

    return false;
  }

  function shouldShowFieldInCurrentValues(field: RuntimeField) {
    if (!field.dependsOnFieldKey) return true;

    const parentValue = values[field.dependsOnFieldKey];

    if (isEmptyValue(parentValue)) return false;

    if (!field.linkedToValue) return true;

    if (Array.isArray(parentValue)) {
      return parentValue.map(String).includes(String(field.linkedToValue));
    }

    return String(parentValue) === String(field.linkedToValue);
  }

  function validateCurrentStep() {
    if (!validateStudentSelection()) return false;

    if (!currentStep) return true;

    const isCommitteeChainCurrentStep =
      workflow.serviceSlug === "committees-meetings" &&
      isCommitteeChainStep(currentStep);

    if (
      isCommitteeChainCurrentStep &&
      !isCommitteeRowsValid(values.committee_items)
    ) {
      showFeedback(
        "warning",
        "جدول الاجتماع غير مكتمل",
        "أكمل صفًا واحدًا على الأقل: جدول الأعمال، محور النقاش، والتوصية."
      );

      return false;
    }

    const visibleFields = currentStep.fields
      .filter(shouldShowFieldInCurrentValues)
      .filter((field) =>
        isCommitteeChainCurrentStep
          ? !isCommitteeChainRuntimeField(field)
          : true
      );

    for (const field of visibleFields) {
      if (!field.isRequired) continue;

      const value = values[field.key];

      if (isEmptyValue(value)) {
        showFeedback(
          "warning",
          "حقل مطلوب",
          `يرجى تعبئة الحقل: ${field.label}`
        );

        return false;
      }

      if (value === "__OTHER__" && isEmptyValue(values[`${field.key}__other`])) {
        showFeedback(
          "warning",
          "تفصيل خيار أخرى مطلوب",
          `يرجى كتابة قيمة خيار أخرى في الحقل: ${field.label}`
        );

        return false;
      }

      if (
        Array.isArray(value) &&
        value.includes("__OTHER__") &&
        isEmptyValue(values[`${field.key}__other`])
      ) {
        showFeedback(
          "warning",
          "تفصيل خيار أخرى مطلوب",
          `يرجى كتابة قيمة خيار أخرى في الحقل: ${field.label}`
        );

        return false;
      }
    }

    return true;
  }

  async function handleSave(type: "draft" | "submit") {
    if (!validateStudentSelection()) return;
    if (type === "submit" && !validateCurrentStep()) return;

    try {
      setLoading(true);

      const endpoint = caseId
        ? `/api/dashboard/cases/${caseId}`
        : type === "submit"
          ? "/api/dashboard/cases/submit"
          : "/api/dashboard/cases/save-draft";

      const response = await fetch(endpoint, {
        method: caseId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: workflow.id,
          serviceId,
          title: getSmartRuntimeCaseTitle({
            workflow: normalizedWorkflow,
            values,
            fallbackTitle: title || workflow.name,
          }),
          studentId: selectedStudent?.id ?? null,

          values: {
            ...values,
            selectedStudent: selectedStudent
              ? {
                  id: selectedStudent.id,
                  fullName: selectedStudent.fullName,
                  nationalId: selectedStudent.nationalId,
                  grade: selectedStudent.grade,
                  classroom: selectedStudent.classroom,
                  stage: selectedStudent.stage,
                  guardianName: selectedStudent.guardianName,
                  guardianPhone: selectedStudent.guardianPhone,
                }
              : null,
          },

          status: type === "submit" ? "SUBMITTED" : "DRAFT",
          evidenceItems: supportsEvidence ? evidenceItems : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ أثناء حفظ الحالة.");
      }

      showFeedback(
        "success",
        type === "submit" ? "تم إرسال الحالة" : "تم حفظ المسودة",
        "تم حفظ البيانات بنجاح."
      );

      setTimeout(() => {
        router.push(`/dashboard/cases/${data.caseId}`);
        router.refresh();
      }, 700);
    } catch (error) {
      showFeedback(
        "error",
        "تعذر الحفظ",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  function goNext() {
    if (!validateCurrentStep()) return;

    setCurrentStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goPrevious() {
    setCurrentStepIndex((current) => Math.max(current - 1, 0));
  }

  function handleEvidenceUploaded(items: EvidenceItem[]) {
    setEvidenceItems((current) => [...current, ...items]);

    showFeedback(
      "success",
      "تم رفع الشواهد",
      "تمت إضافة الشواهد إلى الحالة بنجاح."
    );
  }

  function handleDeleteEvidence(id: string) {
    setEvidenceItems((current) => current.filter((item) => item.id !== id));

    showFeedback("info", "تم حذف الشاهد", "تم حذف الشاهد من قائمة الشواهد.");
  }

  if (!currentStep) {
    return (
      <main className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-2xl font-black text-amber-900">
          لا توجد خطوات في هذا النموذج
        </h1>

        <p className="mt-2 text-sm leading-7 text-amber-800">
          لم يتم العثور على خطوات Workflow لهذه الخدمة. راجع ملف Excel أو إعدادات
          النشر من لوحة الأدمن.
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <SmartFeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        description={feedback.message}
        onOpenChange={(open) => setFeedback((current) => ({ ...current, open }))}
      />

      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-100">Workflow Runtime</p>

        <h1 className="mt-4 text-4xl font-black">{title || workflow.name}</h1>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-sky-50">
          نموذج ديناميكي مبني على Workflow منشور. الحقول والخيارات والتبعيات
          تظهر حسب إعدادات الخدمة والبيانات المرفوعة من لوحة الأدمن.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
            الخطوة {currentStepIndex + 1} من {steps.length}
          </span>

          {needsStudent ? (
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
              يتطلب اختيار طالب/طالبة
            </span>
          ) : null}

          {supportsEvidence ? (
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
              يدعم الشواهد
            </span>
          ) : null}
        </div>
      </section>

      {showStudentPickerCard ? (
        <SmartStudentPickerCard
          selectedStudent={selectedStudent}
          onStudentSelected={handleStudentSelected}
        />
      ) : null}

      {showStudentSummaryCard && selectedStudent ? (
        <StudentContextSummary
          student={selectedStudent}
          onEdit={() => {
            const pickerIndex = steps.findIndex(isStudentPickerStep);
            setCurrentStepIndex(pickerIndex >= 0 ? pickerIndex : 0);
          }}
        />
      ) : null}

      <StepProgress currentStepIndex={currentStepIndex} steps={steps} />

      <WorkflowStepCard
        step={currentStep}
        values={values}
        serviceSlug={workflow.serviceSlug}
        onChange={updateValue}
      />

      {showEvidenceCard ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-black text-sky-600">شواهد الحالة</p>

            <h2 className="mt-2 text-3xl font-black text-slate-900">
              الشواهد والمرفقات
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              أضف الصور أو الملفات الداعمة لهذه الحالة. تظهر هذه البطاقة فقط في
              خطوة الشواهد، ولا تظهر في باقي الخطوات.
            </p>
          </div>

          <EvidenceUploadCard onUploaded={handleEvidenceUploaded} />

          <div className="mt-6">
            <EvidencePreviewGrid
              items={evidenceItems}
              onDelete={handleDeleteEvidence}
            />
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={goPrevious}
            disabled={isFirstStep || loading}
            className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            السابق
          </button>

          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={loading}
              className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              التالي
            </button>
          ) : null}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={loading}
            className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {previewMode ? "معاينة فقط" : "حفظ مسودة"}
          </button>

          <button
            type="button"
            onClick={() => handleSave("submit")}
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {previewMode ? "لا يتم الحفظ في المعاينة" : loading ? "جاري الحفظ..." : caseId ? "تحديث الحالة" : "إرسال"}
          </button>
        </div>
      </section>
    </main>
  );
}

function extractInitialStudent(
  initialValues: RuntimeValues | undefined
): SmartStudent | null {
  const value = initialValues?.selectedStudent;

  if (!value || typeof value !== "object") {
    return null;
  }

  if (!("id" in value) || typeof value.id !== "string") {
    return null;
  }

  return {
    id: value.id,
    fullName:
      "fullName" in value && typeof value.fullName === "string"
        ? value.fullName
        : "طالب/طالبة",
    nationalId:
      "nationalId" in value && typeof value.nationalId === "string"
        ? value.nationalId
        : null,
    grade:
      "grade" in value && typeof value.grade === "string"
        ? value.grade
        : null,
    classroom:
      "classroom" in value && typeof value.classroom === "string"
        ? value.classroom
        : null,
    stage:
      "stage" in value && typeof value.stage === "string" ? value.stage : null,
    guardianName:
      "guardianName" in value && typeof value.guardianName === "string"
        ? value.guardianName
        : null,
    guardianPhone:
      "guardianPhone" in value && typeof value.guardianPhone === "string"
        ? value.guardianPhone
        : null,
  };
}

function StepProgress({
  currentStepIndex,
  steps,
}: {
  currentStepIndex: number;
  steps: RuntimeStep[];
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isDone = index < currentStepIndex;

          return (
            <div
              key={step.id}
              className={[
                "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black",
                isActive
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-500",
              ].join(" ")}
            >
              <span>{index + 1}</span>
              <span>{step.title}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SmartStudentPickerCard({
  selectedStudent,
  onStudentSelected,
}: {
  selectedStudent: SmartStudent | null;
  onStudentSelected: (student: SmartStudent | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<SmartStudent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setStudents([]);
      return;
    }

    const controller = new AbortController();

    async function searchStudents() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/dashboard/students/search?q=${encodeURIComponent(trimmedQuery)}`,
          {
            signal: controller.signal,
          }
        );

        const data = await response.json();
        const normalizedStudents = normalizeStudentsResponse(data);

        setStudents(normalizedStudents);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    const timer = window.setTimeout(searchStudents, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <section className="rounded-[2rem] border border-sky-200 bg-sky-50/70 p-6 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm font-black text-sky-700">
            اختيار الطالب/الطالبة
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-900">
            اختر الطالب/الطالبة المرتبط بهذه الحالة
          </h2>

          <p className="mt-2 text-sm leading-7 text-slate-600">
            ابحث باسم الطالب/الطالبة أو رقم الهوية. بعد الاختيار سيتم ربط
            الحالة بسجل الطالب/الطالبة وبيانات ولي الأمر.
          </p>

          <div className="relative mt-5">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="اكتب اسم الطالب/الطالبة أو رقم الهوية..."
              className="h-14 w-full rounded-2xl border border-sky-200 bg-white px-5 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />

            {query.trim().length >= 2 ? (
              <div className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {loading ? (
                  <div className="p-4 text-sm font-bold text-slate-500">
                    جاري البحث...
                  </div>
                ) : students.length ? (
                  students.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        onStudentSelected(student);
                        setQuery("");
                        setStudents([]);
                      }}
                      className="w-full rounded-xl p-3 text-right transition hover:bg-sky-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm text-slate-900">
                          {student.fullName}
                        </strong>

                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                          {student.nationalId || "بدون هوية"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {[
                          student.stage,
                          student.grade,
                          student.classroom
                            ? `فصل ${student.classroom}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" - ") || "لا توجد بيانات صفية"}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-sm font-bold text-slate-500">
                    لا توجد نتائج مطابقة.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-sky-100 bg-white p-5">
          {selectedStudent ? (
            <StudentSelectedCard
              student={selectedStudent}
              onClear={() => onStudentSelected(null)}
            />
          ) : (
            <div className="flex h-full min-h-44 flex-col justify-center rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-5 text-center">
              <p className="text-sm font-black text-sky-700">
                لم يتم اختيار طالب/طالبة
              </p>

              <p className="mt-2 text-xs leading-6 text-slate-500">
                اختيار الطالب/الطالبة يساعد في التقارير والتصدير وتتبع الحالات.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StudentContextSummary({
  student,
  onEdit,
}: {
  student: SmartStudent;
  onEdit: () => void;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black text-slate-500">
          الطالب/الطالبة المرتبط بالحالة
        </p>

        <h3 className="mt-1 text-lg font-black text-slate-900">
          {student.fullName}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {[
            student.stage,
            student.grade,
            student.classroom ? `فصل ${student.classroom}` : null,
            student.guardianName ? `ولي الأمر: ${student.guardianName}` : null,
          ]
            .filter(Boolean)
            .join(" - ")}
        </p>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
      >
        تعديل الاختيار
      </button>
    </section>
  );
}

function StudentSelectedCard({
  student,
  onClear,
}: {
  student: SmartStudent;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-emerald-700">
            تم اختيار الطالب/الطالبة
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-900">
            {student.fullName}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
        >
          مسح
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-xs">
        <InfoRow label="رقم الهوية" value={student.nationalId || "غير متاح"} />
        <InfoRow label="المرحلة" value={student.stage || "غير متاح"} />
        <InfoRow label="الصف" value={student.grade || "غير متاح"} />
        <InfoRow label="الفصل" value={student.classroom || "غير متاح"} />
        <InfoRow label="ولي الأمر" value={student.guardianName || "غير متاح"} />
        <InfoRow
          label="جوال ولي الأمر"
          value={student.guardianPhone || "غير متاح"}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <span className="font-bold text-slate-500">{label}</span>
      <strong className="text-slate-800">{value}</strong>
    </div>
  );
}

function normalizeStudentsResponse(data: unknown): SmartStudent[] {
  const source = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        "students" in data &&
        Array.isArray(data.students)
      ? data.students
      : data &&
          typeof data === "object" &&
          "items" in data &&
          Array.isArray(data.items)
        ? data.items
        : [];

  return source
    .map((item) => normalizeStudent(item))
    .filter((student): student is SmartStudent => Boolean(student));
}

function normalizeStudent(item: unknown): SmartStudent | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;

  const id = safeString(record.id);
  const fullName =
    safeString(record.fullName) ||
    safeString(record.name) ||
    safeString(record.studentName);

  if (!id || !fullName) {
    return null;
  }

  const guardian =
    record.guardian && typeof record.guardian === "object"
      ? (record.guardian as Record<string, unknown>)
      : null;

  return {
    id,
    fullName,
    nationalId: safeString(record.nationalId),
    grade: safeString(record.grade),
    classroom: safeString(record.classroom),
    stage: safeString(record.stage),
    guardianName:
      safeString(record.guardianName) ||
      safeString(guardian?.name) ||
      safeString(guardian?.fullName),
    guardianPhone:
      safeString(record.guardianPhone) ||
      safeString(guardian?.phone) ||
      safeString(guardian?.mobile),
  };
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}