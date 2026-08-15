
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { EvidenceUploadCard } from "@/components/evidence/evidence-upload-card";
import { EvidencePreviewGrid } from "@/components/evidence/evidence-preview-grid";
import { BrandLoader } from "@/components/common/brand-loader";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import {
  WorkflowStepCard,
  isCommitteeChainStep,
} from "@/components/workflow/workflow-step-card";

import { isCommitteeRowsValid } from "@/components/committees/committee-chain-repeater";
import { SPECIAL_REPORT_FIXED_FIELD_KEYS } from "@/lib/special-report/catalog";
import { SPECIAL_REPORT_SERVICE_SLUG } from "@/lib/special-report/types";

import type {
  RuntimeField,
  RuntimeStep,
  RuntimeWorkflow,
} from "@/engine/runtime/runtime-resolver";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";
import { isConditionalWorkflowFieldVisible } from "@/engine/runtime/workflow-conditional-logic";
import {
  normalizeWorkflowEvidenceMode,
  normalizeWorkflowStudentPickerMode,
  shouldShowStudentPicker,
} from "@/lib/workflows/workflow-runtime-settings";
import { getServiceRuntimePolicy } from "@/lib/services/service-runtime-policy";
import { SELECTED_STUDENTS_STRUCTURED_VALUE_METADATA } from "@/lib/workflow-values/structured-value-metadata";
import { OPTIONAL_STUDENT_PICKER_LABEL } from "@/lib/workflows/workflow-runtime-copy";
import { GuidanceScope } from "@/components/guidance/guidance-scope";

export type EvidenceItem = {
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
  confirmation?: "APPROVED_REPORT_SYNC";
};

type SmartStudent = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  phone?: string | null;
  grade?: string | null;
  classroom?: string | null;
  stage?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianRelationship?: string | null;
  guardianNationalId?: string | null;
};

export type DynamicFormRendererSaveMode = "draft" | "submit";

export type DynamicFormRendererSaveParams = {
  type: DynamicFormRendererSaveMode;
  workflow: RuntimeWorkflow;
  serviceId: string;
  title: string | null;
  caseId?: string;
  values: RuntimeValues;
  evidenceItems: EvidenceItem[];
  selectedStudents: SmartStudent[];
  primarySelectedStudent: SmartStudent | null;
};

export type DynamicFormRendererSaveResult = {
  redirectTo?: string;
  feedbackTitle?: string;
  feedbackMessage?: string;
};

export type DynamicFormRendererSaveHandler = (
  params: DynamicFormRendererSaveParams,
) => Promise<DynamicFormRendererSaveResult | void>;

type Props = {
  workflow: RuntimeWorkflow;
  serviceId: string;
  requiresStudent?: boolean;
  title?: string | null;
  caseId?: string;
  initialValues?: RuntimeValues;
  initialEvidenceItems?: EvidenceItem[];
  previewMode?: boolean;
  caseDetailsBasePath?: string;
  onSave?: DynamicFormRendererSaveHandler;
  onValuesChange?: (values: RuntimeValues) => void;
  onEvidenceItemsChange?: (items: EvidenceItem[]) => void;
  onEvidenceUpload?: (files: FileList) => Promise<EvidenceItem[]>;
  onFieldLabelPersisted?: (field: {
    id: string;
    key: string;
    label: string;
  }) => void;
  reportSyncStatus?: "DRAFT" | "APPROVED" | null;
  allowDraftSave?: boolean;
  submitLabel?: string;
  embedded?: boolean;
  beforeSubmit?: ReactNode;
  editingMode?: boolean;
  selectedFieldId?: string | null;
  onSelectField?: (field: RuntimeField) => void;
  onReorderFields?: (stepId: string, fieldIds: string[]) => Promise<void> | void;
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
  "activity-programs",
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
  "guidance-programs": "برامج التوجيه الطلابي",
  "student-follow-up": "متابعة الطلبة والمواقف اليومية الطارئة",
  "family-school-communication": "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
  "student-guidance-services": "خدمات التوجيه الطلابي",
  "committees-meetings": "اللجان والاجتماعات",
  "activity-programs": "برامج النشاط",
  "activity-programs-citizenship-life": "برامج النشاط - المواطنة والحياة",
  "activity-programs-science-technology": "برامج النشاط - العلوم والتقنية",
  "activity-programs-culture-arts": "برامج النشاط - الثقافة والفنون",
  "activity-programs-sports-health": "برامج النشاط - الرياضة والصحة",
  "activity-programs-scouting": "برامج النشاط - النشاط الكشفي",
  "activity-programs-events-occasions": "برامج النشاط - الأيام والمناسبات",
  "activity-programs-non-class-periods": "برامج النشاط - الفترات اللاصفية",
  "activity-programs-school-broadcast": "برامج النشاط - الإذاعة المدرسية",
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

type StudentAutofillApplyResult = {
  values: RuntimeValues;
  autoPopulatedFieldKeys: Set<string>;
};

const STUDENT_AUTOFILL_ALIASES = {
  studentId: ["student_id", "studentId"],
  studentName: [
    "student_name",
    "studentName",
    "student_full_name",
    "studentFullName",
    "full_name",
    "fullName",
    "اسم_الطالب",
  ],
  studentNationalId: [
    "student_national_id",
    "studentNationalId",
    "national_id",
    "nationalId",
    "identity_number",
    "identityNumber",
  ],
  studentStage: ["student_stage", "studentStage", "stage"],
  studentGrade: ["student_grade", "studentGrade", "grade"],
  studentClassroom: [
    "student_classroom",
    "studentClassroom",
    "classroom",
    "class_name",
    "className",
    "section",
  ],
  studentPhone: ["student_phone", "studentPhone", "student_mobile", "studentMobile"],
  guardianName: [
    "guardian_name",
    "guardianName",
    "parent_name",
    "parentName",
    "guardian_full_name",
    "guardianFullName",
    "اسم_ولي_الأمر",
  ],
  guardianPhone: [
    "guardian_phone",
    "guardianPhone",
    "parent_phone",
    "parentPhone",
    "guardian_mobile",
    "guardianMobile",
    "mobile",
    "phone",
  ],
  guardianRelationship: [
    "guardian_relationship",
    "guardianRelationship",
    "relationship",
    "relationship_to_student",
  ],
  guardianNationalId: [
    "guardian_national_id",
    "guardianNationalId",
    "parent_national_id",
    "parentNationalId",
  ],
} as const;

function normalizeStudentFieldKey(key: string) {
  return String(key || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_\s-]+/g, "")
    .trim();
}

function buildStudentAutofillMap(student: SmartStudent | null) {
  if (!student) {
    return new Map<string, string>();
  }

  const sourceValues = {
    studentId: student.id,
    studentName: student.fullName,
    studentNationalId: student.nationalId,
    studentStage: student.stage,
    studentGrade: student.grade,
    studentClassroom: student.classroom,
    studentPhone: student.phone,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    guardianRelationship: student.guardianRelationship,
    guardianNationalId: student.guardianNationalId,
  };

  const autofillMap = new Map<string, string>();

  for (const [sourceKey, aliases] of Object.entries(STUDENT_AUTOFILL_ALIASES)) {
    const value = sourceValues[sourceKey as keyof typeof sourceValues];
    const cleanValue = typeof value === "string" ? value.trim() : "";

    if (!cleanValue) {
      continue;
    }

    for (const alias of aliases) {
      autofillMap.set(normalizeStudentFieldKey(alias), cleanValue);
    }
  }

  return autofillMap;
}

function resolveWorkflowFieldAutofill(
  workflowFields: RuntimeField[],
  student: SmartStudent | null,
) {
  const studentAutofillMap = buildStudentAutofillMap(student);
  const resolved = new Map<string, string>();
  const seenNormalizedFieldKeys = new Set<string>();

  for (const field of workflowFields) {
    const normalizedFieldKey = normalizeStudentFieldKey(field.key);

    if (!normalizedFieldKey || seenNormalizedFieldKeys.has(normalizedFieldKey)) {
      continue;
    }

    seenNormalizedFieldKeys.add(normalizedFieldKey);

    const value = studentAutofillMap.get(normalizedFieldKey);

    if (value) {
      resolved.set(field.key, value);
    }
  }

  return resolved;
}

function applyStudentAutofill({
  currentValues,
  workflowFields,
  student,
  previouslyAutoPopulatedKeys,
}: {
  currentValues: RuntimeValues;
  workflowFields: RuntimeField[];
  student: SmartStudent | null;
  previouslyAutoPopulatedKeys: Set<string>;
}): StudentAutofillApplyResult {
  const nextValues: RuntimeValues = { ...currentValues };
  const nextAutoPopulatedFieldKeys = new Set<string>();
  const resolvedAutofill = resolveWorkflowFieldAutofill(workflowFields, student);

  for (const fieldKey of previouslyAutoPopulatedKeys) {
    if (!resolvedAutofill.has(fieldKey)) {
      delete nextValues[fieldKey];
    }
  }

  for (const [fieldKey, value] of resolvedAutofill) {
    const currentValue = nextValues[fieldKey];

    if (
      isEmptyValue(currentValue) ||
      previouslyAutoPopulatedKeys.has(fieldKey)
    ) {
      nextValues[fieldKey] = value;
      nextAutoPopulatedFieldKeys.add(fieldKey);
    }
  }

  return {
    values: nextValues,
    autoPopulatedFieldKeys: nextAutoPopulatedFieldKeys,
  };
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
  caseDetailsBasePath = "/dashboard/cases",
  onSave,
  onValuesChange,
  onEvidenceItemsChange,
  onEvidenceUpload,
  onFieldLabelPersisted,
  reportSyncStatus = null,
  allowDraftSave = true,
  submitLabel,
  embedded = false,
  beforeSubmit,
  editingMode = false,
  selectedFieldId,
  onSelectField,
  onReorderFields,
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

  const workflowFields = useMemo(
    () => steps.flatMap((step) => step.fields),
    [steps],
  );

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

  const workflowStudentPickerMode = normalizeWorkflowStudentPickerMode(
    (workflow as RuntimeWorkflow & { studentPickerMode?: unknown })
      .studentPickerMode,
  );
  const workflowEvidenceMode = normalizeWorkflowEvidenceMode(
    (workflow as RuntimeWorkflow & { evidenceMode?: unknown }).evidenceMode,
  );
  const serviceDefaultSupportsEvidence =
    SERVICES_WITH_EVIDENCE.has(workflow.serviceSlug) || workflowHasEvidenceStep;
  const supportsEvidence =
    workflowEvidenceMode === "ENABLED"
      ? true
      : workflowEvidenceMode === "DISABLED"
        ? false
        : serviceDefaultSupportsEvidence;

  const serviceDefaultShowsStudentPicker =
    requiresStudent ??
    (workflowHasStudentPickerStep ||
      getServiceRuntimePolicy(workflow.serviceSlug).showsStudentPicker);
  const supportsStudentPicker = shouldShowStudentPicker(
    workflowStudentPickerMode,
    serviceDefaultShowsStudentPicker,
  );

  // WORKFLOW_STUDENT_PICKER_MODE_RUNTIME_MARKER

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [values, setValues] = useState<RuntimeValues>(initialValues ?? {});
  const [selectedStudents, setSelectedStudents] = useState<SmartStudent[]>(
    () => extractInitialStudents(initialValues)
  );

  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(
    initialEvidenceItems ?? []
  );
  const [fieldLabelOverrides, setFieldLabelOverrides] = useState<
    Record<string, string>
  >({});
  const autoPopulatedFieldKeysRef = useRef<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    type: "info",
    title: "",
  });

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const primarySelectedStudent = selectedStudents[0] ?? null;
  const allowRuntimeFieldLabelEditing =
    normalizedWorkflow.serviceSlug === SPECIAL_REPORT_SERVICE_SLUG;
  const displayCurrentStep = currentStep
    ? {
        ...currentStep,
        fields: currentStep.fields
          .filter((field) => !isStudentPickerField(field))
          .map((field) => ({
            ...field,
            label: fieldLabelOverrides[field.id] ?? field.label,
          })),
      }
    : null;

  useEffect(() => {
    setFieldLabelOverrides({});
  }, [workflow.id]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);

  useEffect(() => {
    onEvidenceItemsChange?.(evidenceItems);
  }, [evidenceItems, onEvidenceItemsChange]);

  const showEvidenceCard =
    supportsEvidence &&
    (isEvidenceStep(displayCurrentStep) ||
      (workflowEvidenceMode === "ENABLED" &&
        !workflowHasEvidenceStep &&
        isLastStep));

  const showStudentPickerCard =
    supportsStudentPicker &&
    (isStudentPickerStep(currentStep) ||
      (!workflowHasStudentPickerStep && isFirstStep));

  const showStudentSummaryCard =
    supportsStudentPicker && !showStudentPickerCard && selectedStudents.length > 0;

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

  function isFieldLabelEditable(field: RuntimeField) {
    if (!allowRuntimeFieldLabelEditing) {
      return false;
    }

    return !SPECIAL_REPORT_FIXED_FIELD_KEYS.includes(
      field.key as (typeof SPECIAL_REPORT_FIXED_FIELD_KEYS)[number]
    );
  }

  async function handleFieldLabelUpdate(
    fieldId: string,
    fieldKey: string,
    nextLabel: string
  ) {
    const response = await fetch(
      `/api/dashboard/special-report/runtime/fields/${fieldId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: nextLabel,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "تعذر تحديث عنوان الحقل.");
    }

    setFieldLabelOverrides((current) => ({
      ...current,
      [fieldId]: nextLabel,
    }));

    onFieldLabelPersisted?.({
      id: fieldId,
      key: fieldKey,
      label: nextLabel,
    });
  }

  function shouldShowFieldForValues(field: RuntimeField, currentValues: RuntimeValues) {
    return isConditionalWorkflowFieldVisible(field, currentValues);
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
    autoPopulatedFieldKeysRef.current.delete(fieldKey);

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

  function handleStudentsChanged(nextStudents: SmartStudent[]) {
    const normalizedStudents = dedupeSelectedStudents(nextStudents);
    const primaryStudent = normalizedStudents[0] ?? null;
    const autofillResult = applyStudentAutofill({
      currentValues: values,
      workflowFields,
      student: primaryStudent,
      previouslyAutoPopulatedKeys: autoPopulatedFieldKeysRef.current,
    });

    autoPopulatedFieldKeysRef.current =
      autofillResult.autoPopulatedFieldKeys;

    setSelectedStudents(normalizedStudents);
    setValues({
      ...autofillResult.values,
      ...buildSelectedStudentsValues(normalizedStudents),
    });
  }

  function shouldShowFieldInCurrentValues(field: RuntimeField) {
    return isConditionalWorkflowFieldVisible(field, values);
  }

  function validateCurrentStep() {
    if (!displayCurrentStep) return true;

    const isCommitteeChainCurrentStep =
      workflow.serviceSlug === "committees-meetings" &&
      isCommitteeChainStep(displayCurrentStep);

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

    const visibleFields = displayCurrentStep.fields
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

  const pendingApprovedSaveTypeRef = useRef<"draft" | "submit" | null>(null);

  function hasWorkflowChanges() {
    try {
      return (
        JSON.stringify(values) !== JSON.stringify(initialValues ?? {}) ||
        JSON.stringify(evidenceItems) !==
          JSON.stringify(initialEvidenceItems ?? [])
      );
    } catch {
      return true;
    }
  }

  async function handleSave(type: "draft" | "submit") {
    if (reportSyncStatus === "APPROVED" && hasWorkflowChanges()) {
      pendingApprovedSaveTypeRef.current = type;
      setFeedback({
        open: true,
        type: "warning",
        title: "تحديث حالة مرتبطة بتقرير معتمد",
        message:
          "سيتم تحديث البيانات المرتبطة داخل التقرير المعتمد، مع بقاء حالة الاعتماد وتاريخ الاعتماد كما هما.",
        confirmation: "APPROVED_REPORT_SYNC",
      });
      return;
    }

    await performSave(type);
  }

  async function performSave(type: "draft" | "submit") {
    if (type === "submit" && !validateCurrentStep()) return;

    try {
      setLoading(true);
      const nextValues = {
        ...values,
        ...buildSelectedStudentsValues(selectedStudents),
      };
      const fallbackTitle = getSmartRuntimeCaseTitle({
        workflow: normalizedWorkflow,
        values,
        fallbackTitle: title || workflow.name,
      });

      let redirectTo: string | undefined;
      let feedbackTitle =
        type === "submit" ? "تم إرسال الحالة" : "تم حفظ المسودة";
      let feedbackMessage = "تم حفظ البيانات بنجاح.";

      if (onSave) {
        const result = await onSave({
          type,
          workflow: normalizedWorkflow,
          serviceId,
          title: fallbackTitle,
          caseId,
          values: nextValues,
          evidenceItems: supportsEvidence ? evidenceItems : [],
          selectedStudents,
          primarySelectedStudent,
        });

        redirectTo = result?.redirectTo;
        feedbackTitle = result?.feedbackTitle || feedbackTitle;
        feedbackMessage = result?.feedbackMessage || feedbackMessage;
      } else {
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
            title: fallbackTitle,
            studentId: primarySelectedStudent?.id ?? null,
            values: nextValues,
            status: type === "submit" ? "SUBMITTED" : "DRAFT",
            evidenceItems: supportsEvidence ? evidenceItems : [],
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "حدث خطأ أثناء حفظ الحالة.");
        }

        const isNewSubmittedDashboardCase =
          !caseId &&
          type === "submit" &&
          caseDetailsBasePath === "/dashboard/cases";

        redirectTo = isNewSubmittedDashboardCase
          ? `/dashboard/report-2/cases/${encodeURIComponent(data.caseId)}/prepare`
          : `${caseDetailsBasePath}/${data.caseId}`;
        feedbackTitle = "تم حفظ بيانات الحالة";
        feedbackMessage = data.message || data.reportSync?.message || feedbackMessage;
      }

      showFeedback("success", feedbackTitle, feedbackMessage);

      if (redirectTo) {
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 700);
      }
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

  async function handleEvidenceFilesSelected(files: FileList) {
    if (!onEvidenceUpload) return;

    try {
      const items = await onEvidenceUpload(files);
      handleEvidenceUploaded(items);
    } catch (error) {
      showFeedback(
        "error",
        "تعذر رفع الشواهد",
        error instanceof Error ? error.message : "تعذر رفع الملفات.",
      );
    }
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
    <main className={embedded ? "space-y-5" : "space-y-8"}>
      {!embedded ? <GuidanceScope context="workflow-runtime" /> : null}
      <SmartFeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        description={feedback.message}
        primaryActionLabel={
          feedback.confirmation === "APPROVED_REPORT_SYNC"
            ? "حفظ وتحديث التقرير"
            : undefined
        }
        secondaryActionLabel={
          feedback.confirmation === "APPROVED_REPORT_SYNC" ? "إلغاء" : undefined
        }
        onPrimaryAction={
          feedback.confirmation === "APPROVED_REPORT_SYNC"
            ? () => {
                const type = pendingApprovedSaveTypeRef.current;
                pendingApprovedSaveTypeRef.current = null;
                if (type) void performSave(type);
              }
            : undefined
        }
        onSecondaryAction={() => {
          pendingApprovedSaveTypeRef.current = null;
          setFeedback((current) => ({ ...current, open: false }));
        }}
        onOpenChange={(open) => setFeedback((current) => ({ ...current, open }))}
      />

      {embedded ? (
        <section data-guidance="workflow-step" className="border-b border-slate-100 pb-4">
          <p className="text-xs font-black text-sky-700">
            الخطوة {currentStepIndex + 1} من {steps.length}
          </p>
          <h2 className="mt-1.5 text-lg font-black text-slate-900">
            {currentStep.title}
          </h2>
        </section>
      ) : (
      <section data-guidance="workflow-step" className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-10 text-white shadow-2xl">
        <h1 className="text-4xl font-black">{title || workflow.name}</h1>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
            الخطوة {currentStepIndex + 1} من {steps.length}
          </span>

          {supportsStudentPicker ? (
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
              اختيار الطالب/الطالبة
            </span>
          ) : null}

          {supportsEvidence ? (
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
              يدعم الشواهد
            </span>
          ) : null}
        </div>
      </section>
      )}

      {showStudentPickerCard ? (
        <SmartStudentPickerCard
          selectedStudents={selectedStudents}
          onStudentsChange={handleStudentsChanged}
        />
      ) : null}

      {showStudentSummaryCard ? (
        <StudentContextSummary
          students={selectedStudents}
          onEdit={() => {
            const pickerIndex = steps.findIndex(isStudentPickerStep);
            setCurrentStepIndex(pickerIndex >= 0 ? pickerIndex : 0);
          }}
        />
      ) : null}

      {!embedded ? (
        <StepProgress currentStepIndex={currentStepIndex} steps={steps} />
      ) : null}

      {displayCurrentStep ? (
        <div data-guidance="workflow-main-fields">
        <WorkflowStepCard
          step={displayCurrentStep}
          workflow={normalizedWorkflow}
          values={values}
          serviceSlug={workflow.serviceSlug}
          onChange={updateValue}
          canEditFieldLabel={isFieldLabelEditable}
          onUpdateFieldLabel={handleFieldLabelUpdate}
          embedded={embedded}
          editingMode={editingMode}
          selectedFieldId={selectedFieldId}
          onSelectField={onSelectField}
          onReorderFields={onReorderFields}
        />
        </div>
      ) : null}

      {showEvidenceCard ? (
        <section className={embedded ? "border-t border-slate-100 pt-5" : "rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"}>
          <div className={embedded ? "mb-4" : "mb-6"}>
            <h2 className={embedded ? "text-base font-black text-slate-900" : "text-3xl font-black text-slate-900"}>
              الشواهد والمرفقات
            </h2>
          </div>

          <EvidenceUploadCard
            existingEvidenceCount={evidenceItems.length}
            onUploaded={handleEvidenceUploaded}
            onUploadError={(message) =>
              showFeedback("error", "تعذر رفع الشواهد", message)
            }
            onFilesSelected={
              onEvidenceUpload ? handleEvidenceFilesSelected : undefined
            }
          />

          <div className="mt-6">
            <EvidencePreviewGrid
              items={evidenceItems}
              onDelete={handleDeleteEvidence}
            />
          </div>
        </section>
      ) : null}

      {!embedded || isLastStep ? beforeSubmit : null}

      <section data-guidance="workflow-actions" className={[
        "flex flex-wrap items-center justify-between gap-4",
        embedded
          ? "border-t border-slate-100 pt-5"
          : "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm",
      ].join(" ")}>
        {!embedded || !isFirstStep || !isLastStep ? (
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
        ) : null}

        <div className="flex gap-3">
          {allowDraftSave ? (
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={loading}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewMode ? "معاينة فقط" : "حفظ مسودة"}
            </button>
          ) : null}

          {!embedded || isLastStep ? (
          <button
            type="button"
            onClick={() => handleSave("submit")}
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {previewMode ? "لا يتم الحفظ في المعاينة" : loading ? <BrandLoader variant="button" size="xs" label="جاري الحفظ..." /> : submitLabel || (caseId ? "تحديث الحالة" : "إرسال")}
          </button>
          ) : null}
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
    phone:
      "phone" in value && typeof value.phone === "string"
        ? value.phone
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
    guardianRelationship:
      "guardianRelationship" in value &&
      typeof value.guardianRelationship === "string"
        ? value.guardianRelationship
        : null,
    guardianNationalId:
      "guardianNationalId" in value &&
      typeof value.guardianNationalId === "string"
        ? value.guardianNationalId
        : null,
  };
}

function serializeSelectedStudent(student: SmartStudent) {
  return {
    id: student.id,
    fullName: student.fullName,
    nationalId: student.nationalId,
    phone: student.phone,
    grade: student.grade,
    classroom: student.classroom,
    stage: student.stage,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    guardianRelationship: student.guardianRelationship,
    guardianNationalId: student.guardianNationalId,
  };
}

function dedupeSelectedStudents(students: SmartStudent[]) {
  const uniqueStudents = new Map<string, SmartStudent>();

  for (const student of students) {
    if (student.id && !uniqueStudents.has(student.id)) {
      uniqueStudents.set(student.id, student);
    }
  }

  return Array.from(uniqueStudents.values());
}

function buildSelectedStudentsValues(students: SmartStudent[]) {
  const normalizedStudents = dedupeSelectedStudents(students);
  const serializedStudents = normalizedStudents.map(serializeSelectedStudent);
  const primaryStudent = serializedStudents[0] ?? null;

  return {
    selectedStudent: primaryStudent,
    selected_students_count: serializedStudents.length,
    selected_students_names_text: serializedStudents.length
      ? serializedStudents.map((student) => student.fullName).join("، ")
      : null,
    [SELECTED_STUDENTS_STRUCTURED_VALUE_METADATA.fieldKey]: serializedStudents,
    primary_student_id: primaryStudent?.id ?? null,
  };
}

function extractInitialStudents(
  initialValues: RuntimeValues | undefined,
): SmartStudent[] {
  const selectedStudentsJson = initialValues?.selected_students_json;

  if (Array.isArray(selectedStudentsJson)) {
    return dedupeSelectedStudents(
      selectedStudentsJson
        .map((item) => normalizeStudent(item))
        .filter((student): student is SmartStudent => Boolean(student)),
    );
  }

  const selectedStudent = extractInitialStudent(initialValues);

  return selectedStudent ? [selectedStudent] : [];
}

function getStudentSummaryLine(student: SmartStudent) {
  return (
    [
      student.stage,
      student.grade,
      student.classroom ? `فصل ${student.classroom}` : null,
    ]
      .filter(Boolean)
      .join(" - ") || "لا توجد بيانات صفية"
  );
}

function getSelectedStudentsPreview(students: SmartStudent[], maxPreview = 3) {
  const names = students.map((student) => student.fullName).filter(Boolean);

  if (names.length <= maxPreview) {
    return names.join("، ");
  }

  return `${names.slice(0, maxPreview).join("، ")} +${names.length - maxPreview}`;
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
  selectedStudents,
  onStudentsChange,
}: {
  selectedStudents: SmartStudent[];
  onStudentsChange: (students: SmartStudent[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<SmartStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedStudentIds = useMemo(
    () => new Set(selectedStudents.map((student) => student.id)),
    [selectedStudents],
  );

  function toggleStudentSelection(student: SmartStudent) {
    const alreadySelected = selectedStudentIds.has(student.id);

    const nextStudents = alreadySelected
      ? selectedStudents.filter((item) => item.id !== student.id)
      : [...selectedStudents, student];

    onStudentsChange(nextStudents);

    if (!alreadySelected) {
      setQuery("");
      setStudents([]);
    }
  }

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
        <div className="lg:flex lg:h-full lg:flex-col lg:justify-center">
          <h2 className="text-right text-2xl font-black text-slate-900">
            {OPTIONAL_STUDENT_PICKER_LABEL}
          </h2>

          <div className="relative mt-3">
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
                      onClick={() => toggleStudentSelection(student)}
                      className={[
                        "w-full rounded-xl border p-3 text-right transition",
                        selectedStudentIds.has(student.id)
                          ? "border-sky-200 bg-sky-50"
                          : "border-transparent hover:bg-sky-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-slate-900">
                            {student.fullName}
                          </strong>

                          {selectedStudentIds.has(student.id) ? (
                            <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-black text-sky-700">
                              محدد
                            </span>
                          ) : null}
                        </div>

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
          {selectedStudents.length ? (
            <SelectedStudentsCard
              students={selectedStudents}
              onRemove={(studentId) =>
                onStudentsChange(
                  selectedStudents.filter((student) => student.id !== studentId),
                )
              }
              onClearAll={() => onStudentsChange([])}
            />
          ) : (
            <div className="flex h-full min-h-32 flex-col justify-center rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-5 text-center">
              <p className="text-sm font-black text-sky-700">
                لم يتم اختيار طالب/طالبة
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StudentContextSummary({
  students,
  onEdit,
}: {
  students: SmartStudent[];
  onEdit: () => void;
}) {
  const primaryStudent = students[0] ?? null;

  if (!primaryStudent) {
    return null;
  }

  const student = primaryStudent;

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black text-slate-500">
          الطالب/الطالبة المرتبط بالحالة
        </p>

        <h3 className="mt-1 text-lg font-black text-slate-900">
          {students.length === 1
            ? primaryStudent.fullName
            : `تم اختيار ${students.length} طلاب/طالبات`}
        </h3>

        {students.length > 1 ? (
          <p className="mt-1 text-xs text-slate-500">
            {getSelectedStudentsPreview(students)}
          </p>
        ) : null}

        <p className="mt-1 text-xs text-slate-500">
          {[
            students.length > 1 ? getSelectedStudentsPreview(students) : null,
            primaryStudent.stage,
            primaryStudent.grade,
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

function SelectedStudentsCard({
  students,
  onRemove,
  onClearAll,
}: {
  students: SmartStudent[];
  onRemove: (studentId: string) => void;
  onClearAll: () => void;
}) {
  const primaryStudent = students[0] ?? null;

  if (students.length === 1 && primaryStudent) {
    return (
      <StudentSelectedCard
        student={primaryStudent}
        onClear={onClearAll}
      />
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-emerald-700">
            تم اختيار {students.length} طالب/طالبة
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-900">
            {students.length === 1
              ? primaryStudent?.fullName
              : getSelectedStudentsPreview(students)}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClearAll}
          className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
        >
          مسح الكل
        </button>
      </div>

      <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
        سيتم حفظ أول طالب كطالب أساسي للحالة، مع الاحتفاظ بباقي الطلاب داخل
        بيانات الحالة والتقارير.
      </p>

      <div className="mt-4 space-y-2">
        {students.map((student, index) => (
          <div key={student.id} className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-black text-slate-900">
                    {student.fullName}
                  </h4>

                  {index === 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">
                      الأساسي
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {getStudentSummaryLine(student)}
                </p>

                {student.guardianName ? (
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    ولي الأمر: {student.guardianName}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => onRemove(student.id)}
                className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-black text-red-600 transition hover:bg-red-100"
              >
                إزالة
              </button>
            </div>

            {students.length === 1 ? (
              <div className="mt-3 grid gap-2 text-xs">
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
            ) : null}
          </div>
        ))}
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
    phone: safeString(record.phone),
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
    guardianRelationship:
      safeString(record.guardianRelationship) ||
      safeString(record.guardianRelation) ||
      safeString(record.relationship) ||
      safeString(guardian?.relation) ||
      safeString(guardian?.relationship),
    guardianNationalId:
      safeString(record.guardianNationalId) ||
      safeString(record.parentNationalId) ||
      safeString(guardian?.nationalId),
  };
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
