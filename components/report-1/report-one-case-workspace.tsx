"use client";

import { useMemo, useState } from "react";

import {
  ReportFieldSelectionGate,
  type SelectedReportField,
} from "@/components/report-engine/report-field-selection-gate";
import { ReportOneEditor } from "@/components/report-1/editor/report-one-editor";
import type {
  ReportVariantConfig,
  ReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

type ReportOneTemplateOption = {
  id: string;
  name: string;
  description: string;
  serviceSlug: string | null;
  type: string;
  isServiceSpecific: boolean;
  updatedAt: string;
  templateJson?: Record<string, unknown> | null;
};

type ReportOneCaseWorkspaceProps = {
  payload: SmartReportPayload;
  selectedVariantId: ReportVariantId;
  variants: ReportVariantConfig[];
  templates: ReportOneTemplateOption[];
  allWorkflowFields: SmartReportField[];
};

type WorkspaceStep = "template" | "fields" | "editor";

function getFieldText(value: unknown) {
  return String(value ?? "").trim();
}

function getReportOneFieldSignature(field: SmartReportField) {
  return [
    getFieldText(field.key),
    getFieldText(field.label),
    getFieldText(field.value),
  ].join("::");
}

function mergeReportOneWorkflowFields(
  payload: SmartReportPayload,
  allWorkflowFields: SmartReportField[],
): SmartReportPayload {
  const seen = new Set<string>();

  const primaryFields = payload.primaryFields.filter((field, index) => {
    const signature = `${getReportOneFieldSignature(field)}::primary::${index}`;

    if (seen.has(signature)) return false;

    seen.add(signature);
    return getFieldText(field.label) && getFieldText(field.value);
  });

  const detailFields = [...payload.detailFields, ...allWorkflowFields].filter(
    (field, index) => {
      const signature = `${getReportOneFieldSignature(field)}::detail::${index}`;

      if (seen.has(signature)) return false;

      seen.add(signature);
      return getFieldText(field.label) && getFieldText(field.value);
    },
  );

  return {
    ...payload,
    primaryFields,
    detailFields,
  };
}

function applySelectedFieldsToPayload(
  payload: SmartReportPayload,
  selectedFields: SelectedReportField[],
): SmartReportPayload {
  const sourceFields = [...payload.primaryFields, ...payload.detailFields];

  const selectedPayloadFields = selectedFields
    .map((selectedField, index) => {
      const originalField = sourceFields.find(
        (field) => field.key === selectedField.key,
      );

      if (!originalField) return null;

      return {
        ...originalField,
        key: originalField.key || `field-${index + 1}`,
        label: selectedField.label,
        value: selectedField.value,
      } satisfies SmartReportField;
    })
    .filter((field): field is SmartReportField => Boolean(field));

  return {
    ...payload,
    primaryFields: selectedPayloadFields.slice(0, 8),
    detailFields: selectedPayloadFields.slice(8),
  };
}

export function ReportOneCaseWorkspace({
  payload: rawPayload,
  selectedVariantId,
  variants,
  templates,
  allWorkflowFields,
}: ReportOneCaseWorkspaceProps) {
  const initialPayload = useMemo(
    () => mergeReportOneWorkflowFields(rawPayload, allWorkflowFields),
    [rawPayload, allWorkflowFields],
  );

  const defaultTemplateId = templates[0]?.id || "";

  const [step, setStep] = useState<WorkspaceStep>("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [reportPayload, setReportPayload] = useState<SmartReportPayload | null>(
    null,
  );

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedTemplateId) ||
      templates[0] ||
      null,
    [selectedTemplateId, templates],
  );

  const selectedVariantName =
    variants.find((variant) => variant.id === selectedVariantId)?.name ||
    "النموذج الرسمي";

  function continueToFields() {
    if (!selectedTemplate) {
      window.alert("لا يوجد قالب متاح من استديو الأدمن.");
      return;
    }

    setStep("fields");
  }

  function handleSelectedFields(selectedFields: SelectedReportField[]) {
    const nextPayload = applySelectedFieldsToPayload(
      initialPayload,
      selectedFields,
    );

    setReportPayload(nextPayload);
    setStep("editor");
  }

  if (step === "template") {
    return (
      <main className="min-h-screen bg-[#eef3ef] px-6 py-8" dir="rtl">
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-700">
                  اختيار قالب التقرير
                </p>

                <h1 className="mt-2 text-3xl font-black text-slate-950">
                  اختر النموذج القادم من استديو الأدمن
                </h1>

                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  الحالة: {initialPayload.caseInfo.title} · النموذج التشغيلي:{" "}
                  {selectedVariantName}
                </p>
              </div>

              <button
                type="button"
                onClick={continueToFields}
                className="rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
              >
                متابعة إلى اختيار الحقول
              </button>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.length ? (
              templates.map((template) => {
                const active = template.id === selectedTemplate?.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={[
                      "rounded-[1.5rem] border bg-white p-5 text-right shadow-sm transition",
                      active
                        ? "border-emerald-700 ring-4 ring-emerald-100"
                        : "border-slate-200 hover:border-emerald-300",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-base font-black text-slate-950">
                        {template.name}
                      </strong>

                      <span
                        className={[
                          "rounded-full px-3 py-1 text-[11px] font-black",
                          template.isServiceSpecific
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {template.isServiceSpecific ? "مخصص للخدمة" : "عام"}
                      </span>
                    </div>

                    <p className="mt-3 min-h-12 text-xs font-bold leading-6 text-slate-500">
                      {template.description || "قالب من استديو الأدمن."}
                    </p>

                    <p className="mt-4 text-[11px] font-black text-slate-400">
                      آخر تحديث: {template.updatedAt.slice(0, 10)}
                    </p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-6 text-sm font-bold leading-7 text-amber-800">
                لا توجد قوالب منشورة من استديو الأدمن. انشر قالبًا أولًا من لوحة الأدمن.
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  if (step === "fields") {
    return (
      <div className="min-h-screen bg-[#eef3ef]" dir="rtl">
        <div className="mx-auto max-w-6xl px-6 pt-6">
          <section className="mb-4 flex flex-col gap-3 rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-700">
                القالب المختار
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                {selectedTemplate?.name || "بدون قالب"}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setStep("template")}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              تغيير القالب
            </button>
          </section>
        </div>

        <ReportFieldSelectionGate
          payload={initialPayload}
          onContinue={handleSelectedFields}
        />
      </div>
    );
  }

  if (!reportPayload) {
    return null;
  }

  return (
    <ReportOneEditor
      template={selectedTemplate}
      payload={reportPayload}
    />
  );
}