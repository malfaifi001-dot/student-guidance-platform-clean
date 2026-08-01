"use client";

import * as XLSX from "xlsx";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Save,
  UploadCloud,
} from "lucide-react";

import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import {
  normalizeConditionalWorkflow,
  normalizeWorkflowFieldType,
} from "@/engine/runtime/workflow-conditional-logic";
import {
  WORKFLOW_TYPES,
  normalizeWorkflowType,
  getWorkflowPlacementLabel,
  type WorkflowType,
} from "@/lib/workflows/workflow-types";

type ParsedOption = {
  label: string;
  value: string;
  order: number;
  linkedToValue?: string | null;
};

type ParsedField = {
  key: string;
  label: string;
  type: string;
  placeholder?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  order: number;
  allowOther: boolean;
  isRepeater?: boolean;
  dependsOnFieldKey?: string | null;
  linkedToValue?: string | null;
  explicitLinkedToValue?: string | null;
  legacyLinkedToValues?: string[];
  options: ParsedOption[];
};

type ParsedStep = {
  title: string;
  description?: string | null;
  order: number;
  fields: ParsedField[];
};

type ParsedWorkflow = {
  name: string;
  workflowType: WorkflowType;
  steps: ParsedStep[];
};

type WorkflowInlineImportWorkbenchProps = {
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
};

const SUPPORTED_FIELD_TYPES = new Set([
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "RADIO",
  "FILE_UPLOAD",
  "IMAGE_UPLOAD",
  "STUDENT_PICKER",
  "PARENT_PICKER",
  "STAFF_PICKER",
  "REPEATER",
  "SIGNATURE",
  "RICH_TEXT",
]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function readCell(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function parseBoolean(value: unknown) {
  const text = clean(value).toLowerCase();

  return ["1", "true", "yes", "y", "required", "مطلوب", "نعم", "صح"].includes(
    text,
  );
}

function parseNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}

function normalizeFieldType(value: unknown) {
  const raw = normalizeWorkflowFieldType(value);

  return SUPPORTED_FIELD_TYPES.has(raw) ? raw : "TEXT";
}

function optionKey(option: ParsedOption) {
  return `${option.value}__${option.linkedToValue || ""}`;
}

function buildRuntimeWorkflow({
  serviceSlug,
  parsedWorkflow,
}: {
  serviceSlug: string;
  parsedWorkflow: ParsedWorkflow;
}): RuntimeWorkflow {
  return normalizeConditionalWorkflow({
    id: "preview-workflow",
    name: parsedWorkflow.name,
    serviceSlug,
    workflowType: parsedWorkflow.workflowType,
    steps: parsedWorkflow.steps.map((step, stepIndex) => ({
      id: `preview-step-${stepIndex + 1}`,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field, fieldIndex) => ({
        id: `preview-field-${stepIndex + 1}-${fieldIndex + 1}`,
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired,
        order: field.order,
        allowOther: field.allowOther,
        isRepeater: Boolean(field.isRepeater),
        dependsOnFieldKey: field.dependsOnFieldKey,
        linkedToValue: field.linkedToValue,
        options: field.options.map((option, optionIndex) => ({
          id: `preview-option-${stepIndex + 1}-${fieldIndex + 1}-${optionIndex + 1}`,
          label: option.label,
          value: option.value,
          order: option.order,
          linkedToValue: option.linkedToValue,
        })),
      })),
    })),
  });
}

function parseRowsToWorkflow({
  rows,
  fallbackName,
}: {
  rows: Record<string, unknown>[];
  fallbackName: string;
}) {
  const warnings: string[] = [];
  const errors: string[] = [];
  const stepsMap = new Map<string, ParsedStep>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    const stepTitle =
      readCell(row, ["stepTitle", "Step Title", "عنوان الخطوة"]) ||
      "خطوة بدون عنوان";

    const stepDescription =
      readCell(row, ["stepDescription", "Step Description", "وصف الخطوة"]) ||
      null;

    const stepOrder = parseNumber(
      readCell(row, ["stepOrder", "Step Order", "ترتيب الخطوة"]),
      stepsMap.size + 1,
    );

    const fieldKey = readCell(row, ["fieldKey", "Field Key", "مفتاح الحقل"]);

    const fieldLabel = readCell(row, [
      "fieldLabel",
      "Field Label",
      "اسم الحقل",
      "عنوان الحقل",
    ]);

    if (!fieldKey && !fieldLabel) {
      warnings.push(`تم تجاهل الصف ${rowNumber}: لا يحتوي على حقل.`);
      return;
    }

    if (!fieldKey) {
      errors.push(`الصف ${rowNumber}: fieldKey مطلوب.`);
      return;
    }

    const fieldType = normalizeFieldType(
      readCell(row, ["fieldType", "Field Type", "نوع الحقل"]),
    );

    const fieldOrder = parseNumber(
      readCell(row, ["fieldOrder", "Field Order", "ترتيب الحقل"]),
      999,
    );

    const stepMapKey = `${stepOrder}__${stepTitle}`;
    const explicitFieldLinkedToValue = readCell(row, [
      "fieldLinkedToValue",
      "fieldLinkedValue",
      "قيمة ربط الحقل",
    ]);
    const legacyLinkedToValue = readCell(row, [
      "linkedToValue",
      "linkedValue",
      "مرتبط بقيمة",
    ]);
    const existingStep =
      stepsMap.get(stepMapKey) ||
      ({
        title: stepTitle,
        description: stepDescription,
        order: stepOrder,
        fields: [],
      } satisfies ParsedStep);

    let field = existingStep.fields.find((item) => item.key === fieldKey);

    if (!field) {
      field = {
        key: fieldKey,
        label: fieldLabel || fieldKey,
        type: fieldType,
        placeholder:
          readCell(row, ["placeholder", "fieldPlaceholder", "Placeholder"]) ||
          null,
        helpText: readCell(row, ["helpText", "fieldHelp", "Help Text"]) || null,
        isRequired: parseBoolean(
          readCell(row, ["fieldRequired", "required", "مطلوب"]),
        ),
        order: fieldOrder,
        allowOther: parseBoolean(
          readCell(row, ["allowOther", "Other", "يسمح أخرى"]),
        ),
        isRepeater: parseBoolean(
          readCell(row, ["isRepeater", "repeater", "مكرر"]),
        ),
        dependsOnFieldKey:
          readCell(row, ["dependsOnFieldKey", "dependsOn", "يعتمد على"]) ||
          null,
        linkedToValue: explicitFieldLinkedToValue || null,
        explicitLinkedToValue: explicitFieldLinkedToValue || null,
        legacyLinkedToValues: legacyLinkedToValue
          ? [legacyLinkedToValue]
          : [],
        options: [],
      };

      existingStep.fields.push(field);
    } else if (
      legacyLinkedToValue &&
      !field.legacyLinkedToValues?.includes(legacyLinkedToValue)
    ) {
      field.legacyLinkedToValues = [
        ...(field.legacyLinkedToValues || []),
        legacyLinkedToValue,
      ];
    }

    const optionLabel = readCell(row, [
      "optionLabel",
      "Option Label",
      "الخيار",
      "اسم الخيار",
    ]);

    const optionValue =
      readCell(row, ["optionValue", "Option Value", "قيمة الخيار"]) ||
      optionLabel;

    if (optionLabel) {
      const option: ParsedOption = {
        label: optionLabel,
        value: optionValue,
        order: parseNumber(
          readCell(row, ["optionOrder", "Option Order", "ترتيب الخيار"]),
          field.options.length + 1,
        ),
        linkedToValue:
          readCell(row, ["optionLinkedToValue", "optionLinkedValue"]) ||
          legacyLinkedToValue ||
          null,
      };

      if (!field.options.some((item) => optionKey(item) === optionKey(option))) {
        field.options.push(option);
      }
    }

    stepsMap.set(stepMapKey, existingStep);
  });

  const steps = Array.from(stepsMap.values())
    .map((step) => ({
      ...step,
      fields: step.fields
        .map((field) => {
          if (field.explicitLinkedToValue) {
            return { ...field, linkedToValue: field.explicitLinkedToValue };
          }
          const legacyLinks = Array.from(
            new Set((field.legacyLinkedToValues || []).map(clean).filter(Boolean)),
          );
          return {
            ...field,
            linkedToValue: legacyLinks.length === 1 ? legacyLinks[0] : null,
          };
        })
        .sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order);

  if (!steps.length) {
    errors.push("لم يتم العثور على أي خطوات صالحة داخل ملف Excel.");
  }

  for (const step of steps) {
    if (!step.fields.length) {
      errors.push(`الخطوة "${step.title}" لا تحتوي على حقول.`);
    }
  }

  return {
    workflow: {
      name: fallbackName,
      workflowType: WORKFLOW_TYPES.SERVICE_MAIN,
      steps,
    } satisfies ParsedWorkflow,
    warnings,
    errors,
  };
}

async function readWorkflowApiResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error:
        text.length > 300
          ? text.slice(0, 300)
          : text,
    };
  }
}

export function WorkflowInlineImportWorkbench({
  serviceId,
  serviceSlug,
  serviceName,
}: WorkflowInlineImportWorkbenchProps) {
  const router = useRouter();
  const [workflowName, setWorkflowName] = useState(`${serviceName} Workflow`);
  const [workflowType, setWorkflowType] = useState<WorkflowType>(
    WORKFLOW_TYPES.SERVICE_MAIN,
  );
  const [parsedWorkflow, setParsedWorkflow] = useState<ParsedWorkflow | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runtimeWorkflow = useMemo(() => {
    if (!parsedWorkflow) return null;

    return buildRuntimeWorkflow({
      serviceSlug,
      parsedWorkflow: {
        ...parsedWorkflow,
        name: workflowName,
        workflowType,
      },
    });
  }, [parsedWorkflow, serviceSlug, workflowName, workflowType]);

  async function handleFileSelected(file: File | null) {
    setMessage(null);
    setWarnings([]);
    setErrors([]);
    setParsedWorkflow(null);
    setSelectedFile(file);

    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setErrors(["ملف Excel لا يحتوي على أي ورقة."]);
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const result = parseRowsToWorkflow({
        rows,
        fallbackName: workflowName || `${serviceName} Workflow`,
      });

      setWarnings(result.warnings);
      setErrors(result.errors);
      setParsedWorkflow({
        ...result.workflow,
        name: workflowName || result.workflow.name,
        workflowType,
      });
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "تعذر قراءة ملف Excel. تأكد من صيغة الملف.",
      ]);
    }
  }

  async function saveDraft() {
    if (!parsedWorkflow || !selectedFile || errors.length) return;

    try {
      setSaving(true);
      setMessage(null);

      const formData = new FormData();
      formData.set("serviceSlug", serviceSlug);
      formData.set("workflowType", workflowType);
      formData.set("workflowName", workflowName);
      formData.set("file", selectedFile);

      const response = await fetch("/api/dashboard/admin/workflows/upload", {
        method: "POST",
        body: formData,
      });

      const data = await readWorkflowApiResponse(response);

      if (!response.ok) {
        throw new Error(data.error || `تعذر إنشاء مسودة Workflow. HTTP ${response.status}`);
      }

      setMessage("تم إنشاء Draft Workflow بنجاح. يمكنك الآن مراجعته ونشره لاحقًا.");
      router.refresh();
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "حدث خطأ أثناء حفظ المسودة.",
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-black text-sky-700">
              رفع ومعاينة قبل الحفظ
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              ارفع Excel وشاهد النموذج فورًا
            </h2>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              لن يتم إنشاء أي Workflow حتى تضغط حفظ كمسودة. النسخة المنشورة
              للموجهين لن تتأثر.
            </p>
          </div>

          <label className="block rounded-3xl border border-dashed border-sky-200 bg-sky-50 p-5 text-center transition hover:bg-sky-100">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) =>
                handleFileSelected(event.target.files?.[0] || null)
              }
            />

            <UploadCloud className="mx-auto h-8 w-8 text-sky-700" />

            <p className="mt-3 text-sm font-black text-sky-800">
              اختر ملف Excel
            </p>

            <p className="mt-1 text-xs font-bold text-sky-600">
              يتم التحليل داخل الصفحة قبل الحفظ
            </p>
          </label>

          <div className="rounded-3xl bg-slate-50 p-4">
            <label className="text-xs font-black text-slate-500">
              اسم Workflow
            </label>

            <input
              value={workflowName}
              onChange={(event) => setWorkflowName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <label className="text-xs font-black text-slate-500">
              نوع Workflow
            </label>

            <select
              value={workflowType}
              onChange={(event) =>
                setWorkflowType(normalizeWorkflowType(event.target.value))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-sky-400"
            >
              <option value={WORKFLOW_TYPES.SERVICE_MAIN}>
                Workflow أساسي للخدمة
              </option>
              <option value={WORKFLOW_TYPES.GUARDIAN_SUMMONS}>
                استدعاء ولي أمر
              </option>
              <option value={WORKFLOW_TYPES.CERTIFICATE}>شهادة</option>
              <option value={WORKFLOW_TYPES.LETTER}>خطاب</option>
              <option value={WORKFLOW_TYPES.FORM}>نموذج</option>
            </select>

            <p className="mt-2 text-xs font-bold text-slate-500">
              {getWorkflowPlacementLabel(workflowType)}
            </p>
          </div>

          {parsedWorkflow ? (
            <div className="grid gap-2 rounded-3xl bg-slate-50 p-4 text-sm">
              <InfoRow label="الخطوات" value={parsedWorkflow.steps.length} />
              <InfoRow
                label="الحقول"
                value={parsedWorkflow.steps.reduce(
                  (total, step) => total + step.fields.length,
                  0,
                )}
              />
              <InfoRow
                label="الخيارات"
                value={parsedWorkflow.steps.reduce(
                  (total, step) =>
                    total +
                    step.fields.reduce(
                      (fieldTotal, field) =>
                        fieldTotal + field.options.length,
                      0,
                    ),
                  0,
                )}
              />
            </div>
          ) : null}

          {warnings.length ? (
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                تحذيرات
              </div>

              <ul className="mt-2 space-y-1 text-xs font-bold leading-6 text-amber-700">
                {warnings.slice(0, 6).map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {errors.length ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-rose-800">
                <AlertTriangle className="h-4 w-4" />
                أخطاء تمنع الحفظ
              </div>

              <ul className="mt-2 space-y-1 text-xs font-bold leading-6 text-rose-700">
                {errors.map((error) => (
                  <li key={error}>• {error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {message ? (
            <div className="flex items-center gap-2 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          ) : null}

          <button
            type="button"
            onClick={saveDraft}
            disabled={!parsedWorkflow || !selectedFile || errors.length > 0 || saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            حفظ كمسودة Draft
          </button>
        </div>

        <div className="min-w-0 rounded-[2rem] border border-slate-100 bg-slate-50 p-4">
          {runtimeWorkflow ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4">
                <div>
                  <p className="text-xs font-black text-sky-700">
                    Preview قبل الحفظ
                  </p>

                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    تجربة نموذج الموجه
                  </h3>
                </div>

                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                  لا يتم الحفظ
                </span>
              </div>

              <DynamicFormRenderer
                workflow={runtimeWorkflow}
                serviceId={serviceId}
                title={workflowName}
                previewMode
              />
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 text-slate-300" />

              <h3 className="mt-4 text-xl font-black text-slate-800">
                ارفع ملف Excel أولًا
              </h3>

              <p className="mt-2 max-w-md text-sm font-bold leading-7 text-slate-500">
                بعد اختيار الملف ستظهر هنا معاينة النموذج مباشرة قبل إنشاء أي
                Draft.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <strong className="text-sm font-black text-slate-950">{value}</strong>
    </div>
  );
}
