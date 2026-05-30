"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EvidenceUploadCard } from "@/components/evidence/evidence-upload-card";
import { EvidencePreviewGrid } from "@/components/evidence/evidence-preview-grid";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
type RuntimeOption = {
  id: string;
  label: string;
  value: string;
  order: number;
  linkedToValue?: string | null;
};

type RuntimeField = {
  id: string;
  key: string;
  label: string;
  type: string;
  placeholder?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  order: number;
  dependsOnFieldKey?: string | null;
  linkedToValue?: string | null;
  allowOther?: boolean | null;
  options: RuntimeOption[];
};

type RuntimeStep = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  fields: RuntimeField[];
};

type RuntimeWorkflow = {
  id: string;
  name: string;
  serviceSlug: string;
  steps: RuntimeStep[];
};

type RuntimeValues = Record<string, unknown>;

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

type Props = {
  workflow: RuntimeWorkflow;
  serviceId: string;
  requiresStudent?: boolean;
  title?: string | null;
  caseId?: string;
  initialValues?: RuntimeValues;
  initialEvidenceItems?: EvidenceItem[];
};

const SERVICES_WITH_EVIDENCE = new Set(["guidance-programs"]);

export function DynamicFormRenderer({
  workflow,
  serviceId,
  title,
  caseId,
  initialValues,
  initialEvidenceItems,
}: Props) {
  const router = useRouter();

  const supportsEvidence = SERVICES_WITH_EVIDENCE.has(workflow.serviceSlug);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [values, setValues] = useState<RuntimeValues>(initialValues ?? {});
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(
    initialEvidenceItems ?? []
  );
  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    type: "info",
    title: "",
  });

  const steps = useMemo(() => {
    return [...workflow.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        ...step,
        fields: [...step.fields].sort((a, b) => a.order - b.order),
      }));
  }, [workflow.steps]);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

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

  function updateValue(fieldKey: string, value: unknown) {
    setValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  function shouldShowField(field: RuntimeField) {
    if (!field.dependsOnFieldKey) return true;

    const parentValue = values[field.dependsOnFieldKey];

    if (field.linkedToValue === undefined || field.linkedToValue === null) {
      return Boolean(parentValue);
    }

    if (Array.isArray(parentValue)) {
      return parentValue.includes(field.linkedToValue);
    }

    return String(parentValue ?? "") === String(field.linkedToValue);
  }

  function validateCurrentStep() {
    if (!currentStep) return true;

    const visibleFields = currentStep.fields.filter(shouldShowField);

    for (const field of visibleFields) {
      if (!field.isRequired) continue;

      const value = values[field.key];

      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        showFeedback(
          "warning",
          "حقل مطلوب",
          `يرجى تعبئة الحقل: ${field.label}`
        );

        return false;
      }
    }

    return true;
  }

  function extractStudentId(runtimeValues: RuntimeValues) {
    const possibleKeys = [
      "studentId",
      "student_id",
      "student",
      "student_single",
      "selectedStudent",
    ];

    for (const key of possibleKeys) {
      const value = runtimeValues[key];

      if (typeof value === "string" && value.trim()) {
        return value;
      }

      if (
        value &&
        typeof value === "object" &&
        "id" in value &&
        typeof value.id === "string"
      ) {
        return value.id;
      }
    }

    return null;
  }

  async function handleSave(type: "draft" | "submit") {
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
          title: title || workflow.name,
          studentId: extractStudentId(values),
          values,
          status: type === "submit" ? "SUBMITTED" : "DRAFT",
          evidenceItems: supportsEvidence ? evidenceItems : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ أثناء الحفظ.");
      }

      showFeedback(
        "success",
        type === "submit" ? "تم إرسال السجل" : "تم حفظ المسودة",
        "تم حفظ البيانات بنجاح ويمكنك الآن عرض السجل."
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

    setCurrentStepIndex((current) =>
      Math.min(current + 1, steps.length - 1)
    );
  }

  function goPrevious() {
    setCurrentStepIndex((current) => Math.max(current - 1, 0));
  }

  function handleEvidenceUploaded(items: EvidenceItem[]) {
    setEvidenceItems((current) => [...current, ...items]);

    showFeedback(
      "success",
      "تم رفع الشواهد",
      "تمت إضافة الملفات إلى السجل، وسيتم حفظها عند الحفظ أو الإرسال."
    );
  }

  function handleDeleteEvidence(id: string) {
    setEvidenceItems((current) => current.filter((item) => item.id !== id));

    showFeedback("info", "تم حذف الشاهد", "تم حذف الملف من قائمة الشواهد.");
  }

  if (!currentStep) {
    return (
      <main className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-2xl font-black text-amber-900">
          لا توجد خطوات داخل هذا النموذج
        </h1>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <SmartFeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() =>
          setFeedback((current) => ({
            ...current,
            open: false,
          }))
        }
      />

      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 via-sky-800 to-cyan-600 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-100">Workflow Runtime</p>

        <h1 className="mt-4 text-4xl font-black">
          {title || workflow.name}
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-sky-50">
          نموذج ديناميكي مرتبط بالخدمة، يدعم الحقول والتبعيات وحفظ السجلات بطريقة موحدة.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
            الخطوة {currentStepIndex + 1} من {steps.length}
          </span>

          {supportsEvidence ? (
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
              يدعم الشواهد
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-8 py-6">
          <p className="text-sm font-black text-sky-600">
            الخطوة {currentStepIndex + 1}
          </p>

          <h2 className="mt-2 text-3xl font-black text-slate-900">
            {currentStep.title}
          </h2>

          {currentStep.description ? (
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {currentStep.description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 p-8">
          {currentStep.fields.filter(shouldShowField).map((field) => (
            <DynamicFieldInput
              key={field.id}
              field={field}
              value={values[field.key]}
              onChange={(value) => updateValue(field.key, value)}
            />
          ))}
        </div>
      </section>

      {workflow.serviceSlug === "committees-meetings" ? (
        <CommitteeRepeaterCard
          value={values.committeeRows}
          onChange={(rows) => updateValue("committeeRows", rows)}
        />
      ) : null}

      {supportsEvidence ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-black text-sky-600">شواهد البرنامج</p>

            <h2 className="mt-2 text-3xl font-black text-slate-900">
              الشواهد والمرفقات
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              ارفع الصور أو الملفات المرتبطة بهذه الحالة. سيتم حفظها مع السجل وإظهارها في التفاصيل والتقارير.
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
            className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            السابق
          </button>

          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={loading}
              className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-50"
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
            className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            حفظ مسودة
          </button>

          <button
            type="button"
            onClick={() => handleSave("submit")}
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "جارٍ الحفظ..." : caseId ? "تحديث وإرسال" : "إرسال"}
          </button>
        </div>
      </section>
    </main>
  );
}

function DynamicFieldInput({
  field,
  value,
  onChange,
}: {
  field: RuntimeField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const commonClass =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

  if (field.type === "TEXTAREA" || field.type === "RICH_TEXT") {
    return (
      <FieldWrapper field={field}>
        <textarea
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? undefined}
          className={`${commonClass} min-h-[140px] p-4 leading-7`}
        />
      </FieldWrapper>
    );
  }

  if (field.type === "SELECT" || field.type === "RADIO") {
    return (
      <FieldWrapper field={field}>
        <select
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className={`${commonClass} h-12`}
        >
          <option value="">اختر</option>

          {field.options.map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}

          {field.allowOther ? <option value="OTHER">أخرى</option> : null}
        </select>
      </FieldWrapper>
    );
  }

  if (field.type === "MULTI_SELECT" || field.type === "CHECKBOX") {
    const selectedValues = Array.isArray(value) ? value.map(String) : [];

    return (
      <FieldWrapper field={field}>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {field.options.map((option) => {
            const checked = selectedValues.includes(option.value);

            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 transition hover:bg-sky-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange([...selectedValues, option.value]);
                    } else {
                      onChange(
                        selectedValues.filter((item) => item !== option.value)
                      );
                    }
                  }}
                />

                {option.label}
              </label>
            );
          })}
        </div>
      </FieldWrapper>
    );
  }

  if (field.type === "NUMBER") {
    return (
      <FieldWrapper field={field}>
        <input
          type="number"
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? undefined}
          className={`${commonClass} h-12`}
        />
      </FieldWrapper>
    );
  }

  if (field.type === "DATE") {
    return (
      <FieldWrapper field={field}>
        <input
          type="date"
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className={`${commonClass} h-12`}
        />
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper field={field}>
      <input
        type="text"
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder ?? undefined}
        className={`${commonClass} h-12`}
      />
    </FieldWrapper>
  );
}

function FieldWrapper({
  field,
  children,
}: {
  field: RuntimeField;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700">
        {field.label}
        {field.isRequired ? (
          <span className="mx-1 text-red-500">*</span>
        ) : null}
      </label>

      {children}

      {field.helpText ? (
        <p className="mt-2 text-xs leading-6 text-slate-400">
          {field.helpText}
        </p>
      ) : null}
    </div>
  );
}

function CommitteeRepeaterCard({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (rows: Array<{ agenda: string; discussion: string; recommendation: string }>) => void;
}) {
  const rows =
    Array.isArray(value) && value.length > 0
      ? (value as Array<{
          agenda: string;
          discussion: string;
          recommendation: string;
        }>)
      : [{ agenda: "", discussion: "", recommendation: "" }];

  function updateRow(
    index: number,
    key: "agenda" | "discussion" | "recommendation",
    nextValue: string
  ) {
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === index
        ? {
            ...row,
            [key]: nextValue,
          }
        : row
    );

    onChange(nextRows);
  }

  function addRow() {
    onChange([
      ...rows,
      {
        agenda: "",
        discussion: "",
        recommendation: "",
      },
    ]);
  }

  function removeRow(index: number) {
    if (rows.length === 1) return;
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-black text-sky-600">سلسلة الاجتماع</p>

        <h2 className="mt-2 text-3xl font-black text-slate-900">
          جدول الأعمال ومحاور النقاش والتوصيات
        </h2>

        <p className="mt-2 text-sm leading-7 text-slate-500">
          أضف أكثر من بند، وكل بند يحتوي على جدول أعمال ومحور نقاش وتوصية مرتبطة به.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={index}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-black text-slate-700">
                البند {index + 1}
              </p>

              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
                className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                حذف
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InputBox
                label="جدول الأعمال"
                value={row.agenda}
                onChange={(nextValue) => updateRow(index, "agenda", nextValue)}
              />

              <InputBox
                label="محور النقاش"
                value={row.discussion}
                onChange={(nextValue) =>
                  updateRow(index, "discussion", nextValue)
                }
              />

              <InputBox
                label="التوصية"
                value={row.recommendation}
                onChange={(nextValue) =>
                  updateRow(index, "recommendation", nextValue)
                }
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-5 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white hover:bg-sky-700"
      >
        إضافة بند جديد
      </button>
    </section>
  );
}

function InputBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700">{label}</label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </div>
  );
}