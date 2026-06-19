"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MobileDynamicField } from "@/components/mobile/mobile-dynamic-field";
import { MobileIcon } from "@/components/mobile/mobile-icons";
import {
  shouldShowField,
  type RuntimeValues,
} from "@/engine/runtime/field-dependency-engine";
import type {
  RuntimeField,
  RuntimeStep,
  RuntimeWorkflow,
} from "@/engine/runtime/runtime-resolver";

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
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

type FeedbackState = {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
} | null;

type MobileDynamicFormRendererProps = {
  workflow: RuntimeWorkflow;
  serviceId: string;
  requiresStudent?: boolean;
  title?: string | null;
  caseId?: string;
  initialValues?: RuntimeValues;
  initialEvidenceItems?: EvidenceItem[];
  caseDetailsBasePath?: string;
};

const SERVICES_WITH_EVIDENCE = new Set([
  "guidance-programs",
  "student-follow-up",
  "family-school-communication",
  "student-guidance-services",
  "committees-meetings",
  "activity-programs",
]);

const SERVICES_REQUIRING_STUDENT = new Set([
  "student-follow-up",
  "family-school-communication",
  "student-guidance-services",
]);

const OTHER_VALUE = "__OTHER__";

function normalizeText(value: string) {
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

  return normalizeText(
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
        ].join(" "),
      ),
    ].join(" "),
  );
}

function isEvidenceField(field: RuntimeField) {
  const text = normalizeText(
    [
      field.key,
      field.label,
      field.type,
      field.placeholder ?? "",
      field.helpText ?? "",
    ].join(" "),
  );

  return (
    field.type === "FILE_UPLOAD" ||
    field.type === "IMAGE_UPLOAD" ||
    text.includes("evidence") ||
    text.includes("attachment") ||
    text.includes("شواهد") ||
    text.includes("الشواهد") ||
    text.includes("مرفقات") ||
    text.includes("المرفقات") ||
    text.includes("ملف") ||
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
    text.includes("شواهد") ||
    text.includes("الشواهد") ||
    text.includes("مرفقات") ||
    text.includes("المرفقات")
  );
}

function isStudentPickerField(field: RuntimeField) {
  const text = normalizeText(
    [field.key, field.label, field.type, field.helpText ?? ""].join(" "),
  );

  return (
    field.type === "STUDENT_PICKER" ||
    text.includes("student_picker") ||
    text.includes("اختيار طالب") ||
    text.includes("اختيار الطالبة") ||
    text.includes("الطالب المستهدف")
  );
}

function isStudentPickerStep(step?: RuntimeStep | null) {
  if (!step) return false;

  const text = stepSearchText(step);

  return (
    step.fields.some(isStudentPickerField) ||
    text.includes("student_picker") ||
    text.includes("اختيار طالب") ||
    text.includes("اختيار الطالبة") ||
    text.includes("الطالب المستهدف")
  );
}

function isEmptyValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function asString(value: unknown) {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function normalizeDefaultList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n|,،;]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getFieldDefaultValue(field: RuntimeField) {
  const defaultJson = (field as RuntimeField & { defaultJson?: unknown }).defaultJson;

  if (defaultJson !== undefined && defaultJson !== null) {
    return defaultJson;
  }

  const defaultValue = (field as RuntimeField & { defaultValue?: string | null }).defaultValue;

  if (defaultValue === undefined || defaultValue === null || defaultValue === "") {
    return undefined;
  }

  const type = String(field.type || "").toUpperCase();

  if (type === "MULTI_SELECT" || type === "CHECKBOX") {
    return normalizeDefaultList(defaultValue);
  }

  return String(defaultValue);
}

function getRuntimeFieldOptionLabel(field: RuntimeField, rawValue: unknown) {
  const selected = Array.isArray(rawValue) ? rawValue.map(String) : [asString(rawValue)];

  for (const item of selected) {
    const clean = item.trim();

    if (!clean) continue;

    const option = field.options.find((candidate) => {
      return (
        String(candidate.value || "").trim() === clean ||
        String(candidate.label || "").trim() === clean
      );
    });

    if (option?.label) {
      return option.label;
    }
  }

  return "";
}

function isRuntimeTitleField(field: RuntimeField) {
  const text = normalizeText(
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

function getSmartCaseTitle({
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
      const optionLabel = getRuntimeFieldOptionLabel(field, rawValue);
      const textValue = asString(rawValue);

      if (optionLabel) return optionLabel;
      if (textValue && textValue !== OTHER_VALUE) return textValue;
    }
  }

  return fallbackTitle || workflow.name || "حالة جديدة";
}

function extractInitialStudent(initialValues?: RuntimeValues): SmartStudent | null {
  const value = initialValues?.selectedStudent;

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = asString(record.id);
  const fullName = asString(record.fullName);

  if (!id || !fullName) {
    return null;
  }

  return {
    id,
    fullName,
    nationalId: asString(record.nationalId) || null,
    grade: asString(record.grade) || null,
    classroom: asString(record.classroom) || null,
    stage: asString(record.stage) || null,
    guardianName: asString(record.guardianName) || null,
    guardianPhone: asString(record.guardianPhone) || null,
  };
}

function normalizeStudent(item: unknown): SmartStudent | null {
  if (!item || typeof item !== "object") return null;

  const record = item as Record<string, unknown>;
  const guardian =
    record.guardian && typeof record.guardian === "object"
      ? (record.guardian as Record<string, unknown>)
      : null;

  const id = asString(record.id);
  const fullName =
    asString(record.fullName) || asString(record.name) || asString(record.studentName);

  if (!id || !fullName) return null;

  return {
    id,
    fullName,
    nationalId: asString(record.nationalId) || null,
    grade: asString(record.grade) || null,
    classroom: asString(record.classroom) || null,
    stage: asString(record.stage) || null,
    guardianName:
      asString(record.guardianName) ||
      asString(guardian?.name) ||
      asString(guardian?.fullName) ||
      null,
    guardianPhone:
      asString(record.guardianPhone) ||
      asString(guardian?.phone) ||
      asString(guardian?.mobile) ||
      null,
  };
}

function normalizeStudentsResponse(data: unknown): SmartStudent[] {
  const source = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        "students" in data &&
        Array.isArray((data as { students?: unknown }).students)
      ? ((data as { students: unknown[] }).students)
      : data &&
          typeof data === "object" &&
          "items" in data &&
          Array.isArray((data as { items?: unknown }).items)
        ? ((data as { items: unknown[] }).items)
        : [];

  return source
    .map((item) => normalizeStudent(item))
    .filter((student): student is SmartStudent => Boolean(student));
}

function StudentPicker({
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
    const cleanQuery = query.trim();

    if (cleanQuery.length < 2) {
      setStudents([]);
      return;
    }

    const controller = new AbortController();

    async function searchStudents() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/dashboard/students/search?q=${encodeURIComponent(cleanQuery)}`,
          { signal: controller.signal },
        );

        const data = await response.json();

        setStudents(normalizeStudentsResponse(data));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
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
    <section className="rounded-[1.6rem] bg-sky-50/80 p-4 shadow-sm ring-1 ring-sky-100">
      <p className="text-xs font-black text-sky-700">الطالب</p>
      <h2 className="mt-1 text-xl font-black text-slate-950">اختيار الطالب/الطالبة</h2>

      {selectedStudent ? (
        <div className="mt-4 rounded-[1.3rem] bg-white p-3 ring-1 ring-white/90">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">{selectedStudent.fullName}</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                {[selectedStudent.stage, selectedStudent.grade, selectedStudent.classroom ? `فصل ${selectedStudent.classroom}` : null]
                  .filter(Boolean)
                  .join(" · ") || "بيانات الطالب"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onStudentSelected(null)}
              className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600"
            >
              تغيير
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative mt-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث باسم الطالب أو الهوية..."
          className="h-12 w-full rounded-2xl border border-sky-100 bg-white px-4 text-sm font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />

        {query.trim().length >= 2 ? (
          <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-100">
            {loading ? (
              <p className="p-3 text-sm font-bold text-slate-500">جاري البحث...</p>
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
                  <p className="text-sm font-black text-slate-950">{student.fullName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {[student.nationalId, student.grade, student.classroom ? `فصل ${student.classroom}` : null]
                      .filter(Boolean)
                      .join(" · ") || "بدون بيانات إضافية"}
                  </p>
                </button>
              ))
            ) : (
              <p className="p-3 text-sm font-bold text-slate-500">لا توجد نتائج.</p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EvidenceUploader({
  evidenceItems,
  onUploaded,
  onDelete,
}: {
  evidenceItems: EvidenceItem[];
  onUploaded: (items: EvidenceItem[]) => void;
  onDelete: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList) {
    try {
      setUploading(true);

      const formData = new FormData();

      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/dashboard/evidence", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل رفع الشواهد.");
      }

      onUploaded(Array.isArray(data.items) ? data.items : []);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-[1.6rem] bg-white/85 p-4 shadow-sm ring-1 ring-white/90">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-sky-700">الشواهد</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">رفع الشواهد</h2>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-2xl bg-sky-600 px-4 py-3 text-xs font-black text-white disabled:opacity-60"
        >
          {uploading ? "جاري الرفع..." : "اختيار ملف"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            upload(event.target.files);
          }
        }}
      />

      <div className="mt-4 space-y-2">
        {evidenceItems.length ? (
          evidenceItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"
            >
              <span className="truncate text-xs font-black text-slate-700">
                {item.fileName}
              </span>

              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-600"
              >
                حذف
              </button>
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-3 text-center text-xs font-bold text-slate-400">
            لا توجد شواهد مرفوعة.
          </p>
        )}
      </div>
    </section>
  );
}

function StepHeader({
  title,
  currentStepIndex,
  totalSteps,
  currentStep,
}: {
  title?: string | null;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: RuntimeStep;
}) {
  return (
    <section className="mobile-hero-card-dark rounded-[1.6rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-sky-700">
            الخطوة {currentStepIndex + 1} من {totalSteps}
          </p>

          <h1 className="mt-1 text-[1.45rem] font-black leading-tight text-slate-950">
            {currentStep.title || title}
          </h1>

          {currentStep.description ? (
            <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
              {currentStep.description}
            </p>
          ) : null}
        </div>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-sky-700 ring-1 ring-sky-100">
          <MobileIcon name="file" className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{
            width: `${Math.round(((currentStepIndex + 1) / Math.max(totalSteps, 1)) * 100)}%`,
          }}
        />
      </div>
    </section>
  );
}

export function MobileDynamicFormRenderer({
  workflow,
  serviceId,
  requiresStudent,
  title,
  caseId,
  initialValues,
  initialEvidenceItems,
  caseDetailsBasePath = "/mobile/counselor/cases",
}: MobileDynamicFormRendererProps) {
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

  const normalizedWorkflow = useMemo(
    () => ({
      ...workflow,
      steps,
    }),
    [steps, workflow],
  );

  const workflowStudentPickerMode =
    typeof (workflow as RuntimeWorkflow & { studentPickerMode?: unknown }).studentPickerMode === "string"
      ? String((workflow as RuntimeWorkflow & { studentPickerMode?: string }).studentPickerMode)
      : "SERVICE_DEFAULT";

  const needsStudent =
    workflowStudentPickerMode === "REQUIRED"
      ? true
      : workflowStudentPickerMode === "DISABLED"
        ? false
        : requiresStudent ?? SERVICES_REQUIRING_STUDENT.has(workflow.serviceSlug);

  const supportsEvidence =
    SERVICES_WITH_EVIDENCE.has(workflow.serviceSlug) || steps.some(isEvidenceStep);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [values, setValues] = useState<RuntimeValues>(initialValues ?? {});
  const [selectedStudent, setSelectedStudent] = useState<SmartStudent | null>(() =>
    extractInitialStudent(initialValues),
  );
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(
    initialEvidenceItems ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const workflowHasStudentPickerStep = steps.some(isStudentPickerStep);
  const showStudentPicker =
    needsStudent &&
    currentStep &&
    (isStudentPickerStep(currentStep) ||
      (!workflowHasStudentPickerStep && isFirstStep));

  const showStudentSummary = needsStudent && !showStudentPicker && Boolean(selectedStudent);
  const showEvidence = supportsEvidence && isEvidenceStep(currentStep);

  function shouldShowFieldForValues(field: RuntimeField, currentValues: RuntimeValues) {
    return shouldShowField(field, currentValues);
  }

  function applyAutoSelectedDefaults(currentValues: RuntimeValues) {
    const allFields = steps.flatMap((step) => step.fields);
    const next: RuntimeValues = { ...currentValues };

    let changed = true;

    while (changed) {
      changed = false;

      for (const field of allFields) {
        if (!(field as RuntimeField & { autoSelectWhenLinked?: boolean }).autoSelectWhenLinked) {
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

      return dependentKeys.size ? applyAutoSelectedDefaults(next) : next;
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

    setFeedback({
      type: "warning",
      title: "اختيار الطالب مطلوب",
      message: "اختر الطالب/الطالبة قبل الحفظ أو الإرسال.",
    });

    return false;
  }

  function validateCurrentStep() {
    if (!validateStudentSelection()) return false;
    if (!currentStep) return true;

    const visibleFields = currentStep.fields
      .filter((field) => shouldShowField(field, values))
      .filter((field) => !isEvidenceField(field));

    for (const field of visibleFields) {
      if (!field.isRequired) continue;

      const value = values[field.key];

      if (isEmptyValue(value)) {
        setFeedback({
          type: "warning",
          title: "حقل مطلوب",
          message: `يرجى تعبئة: ${field.label}`,
        });

        return false;
      }

      if (value === OTHER_VALUE && isEmptyValue(values[`${field.key}__other`])) {
        setFeedback({
          type: "warning",
          title: "تفصيل خيار أخرى مطلوب",
          message: `يرجى كتابة قيمة أخرى في: ${field.label}`,
        });

        return false;
      }

      if (
        Array.isArray(value) &&
        value.includes(OTHER_VALUE) &&
        isEmptyValue(values[`${field.key}__other`])
      ) {
        setFeedback({
          type: "warning",
          title: "تفصيل خيار أخرى مطلوب",
          message: `يرجى كتابة قيمة أخرى في: ${field.label}`,
        });

        return false;
      }
    }

    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setCurrentStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goPrevious() {
    setCurrentStepIndex((current) => Math.max(current - 1, 0));
  }

  async function handleSave(type: "draft" | "submit") {
    if (!validateStudentSelection()) return;
    if (type === "submit" && !validateCurrentStep()) return;

    try {
      setLoading(true);
      setFeedback(null);

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
          title: getSmartCaseTitle({
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

      const caseIdFromResponse = String(data.caseId || "").trim();

      if (!caseIdFromResponse) {
        throw new Error("تم الحفظ لكن لم يرجع معرف الحالة.");
      }

      setFeedback({
        type: "success",
        title: type === "submit" ? "تم إرسال الحالة" : "تم حفظ المسودة",
        message: "سيتم فتح الحالة الآن.",
      });

      window.setTimeout(() => {
        const cleanBasePath = caseDetailsBasePath.replace(/\/$/, "");
        router.push(`${cleanBasePath}/${caseIdFromResponse}`);
        router.refresh();
      }, 500);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "تعذر الحفظ",
        message: error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!currentStep) {
    return (
      <section className="rounded-[1.6rem] bg-amber-50 p-5 text-amber-900 ring-1 ring-amber-100">
        <h1 className="text-xl font-black">لا توجد خطوات</h1>
        <p className="mt-2 text-sm leading-7">راجع Workflow المنشور من لوحة الأدمن.</p>
      </section>
    );
  }

  const visibleFields = currentStep.fields
    .filter((field) => shouldShowField(field, values))
    .filter((field) => !isEvidenceField(field))
    .filter((field) => !isStudentPickerField(field));

  return (
    <div className="space-y-4 pb-8">
      <StepHeader
        title={title}
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        currentStep={currentStep}
      />

      {feedback ? (
        <section
          className={[
            "rounded-[1.3rem] p-3 text-sm font-black ring-1",
            feedback.type === "error"
              ? "bg-rose-50 text-rose-700 ring-rose-100"
              : feedback.type === "warning"
                ? "bg-amber-50 text-amber-800 ring-amber-100"
                : feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-sky-50 text-sky-700 ring-sky-100",
          ].join(" ")}
        >
          <p>{feedback.title}</p>
          {feedback.message ? (
            <p className="mt-1 text-xs font-bold leading-5 opacity-80">{feedback.message}</p>
          ) : null}
        </section>
      ) : null}

      {showStudentPicker ? (
        <StudentPicker
          selectedStudent={selectedStudent}
          onStudentSelected={handleStudentSelected}
        />
      ) : null}

      {showStudentSummary && selectedStudent ? (
        <section className="rounded-[1.35rem] bg-white/85 p-3 shadow-sm ring-1 ring-white/90">
          <p className="text-[11px] font-black text-slate-400">الطالب المرتبط</p>
          <p className="mt-1 text-sm font-black text-slate-950">{selectedStudent.fullName}</p>
        </section>
      ) : null}

      <section className="space-y-2.5">
        {visibleFields.map((field) => (
          <MobileDynamicField
            key={field.id}
            field={field}
            value={values[field.key]}
            values={values}
            onChange={updateValue}
          />
        ))}

        {!visibleFields.length && !showEvidence ? (
          <section className="rounded-[1.35rem] bg-white/85 p-4 text-sm font-bold text-slate-400 shadow-sm ring-1 ring-white/90">
            لا توجد حقول ظاهرة في هذه الخطوة.
          </section>
        ) : null}
      </section>

      {showEvidence ? (
        <EvidenceUploader
          evidenceItems={evidenceItems}
          onUploaded={(items) => {
            setEvidenceItems((current) => [...current, ...items]);
            setFeedback({
              type: "success",
              title: "تم رفع الشواهد",
              message: "تمت إضافة الملفات إلى الحالة.",
            });
          }}
          onDelete={(id) => setEvidenceItems((current) => current.filter((item) => item.id !== id))}
        />
      ) : null}

      <section className="mt-6 rounded-[1.8rem] bg-white/90 p-3 shadow-xl shadow-sky-100 ring-1 ring-white/95 backdrop-blur-2xl">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={goPrevious}
            disabled={isFirstStep || loading}
            className="h-12 rounded-2xl bg-slate-50 text-sm font-black text-slate-500 ring-1 ring-slate-100 disabled:opacity-45"
          >
            السابق
          </button>

          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={loading}
              className="h-12 rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-200 disabled:opacity-60"
            >
              التالي
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSave("submit")}
              disabled={loading}
              className="h-12 rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-200 disabled:opacity-60"
            >
              {loading ? "جاري الحفظ..." : caseId ? "تحديث" : "إرسال"}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={loading}
            className="col-span-2 h-11 rounded-2xl bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100 disabled:opacity-60"
          >
            حفظ مسودة
          </button>
        </div>
      </section>
    </div>
  );
}