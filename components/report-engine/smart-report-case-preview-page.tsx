"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ReportDocumentEditor } from "@/components/report-engine/document-editor/report-document-editor";
import {
  ReportFieldSelectionGate,
  type SelectedReportField,
} from "@/components/report-engine/report-field-selection-gate";
import { SaveSmartReportButton } from "@/components/report-engine/save-smart-report-button";
import { SmartReportVariantSelector } from "@/components/report-engine/smart-report-variant-selector";
import { buildReportDocumentDraftFromPayload } from "@/lib/report-engine/document-draft/report-document-builder";
import type { ReportDocumentDraft } from "@/lib/report-engine/document-draft/report-document-types";
import {
  loadReportDocumentDraft,
  saveReportDocumentDraft,
} from "@/lib/report-engine/document-draft/report-draft-storage";
import { computeReportDocumentDraftAdjustments } from "@/lib/report-engine/document-draft/report-document-serializer";
import type {
  ReportVariantConfig,
  ReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

type SmartReportCasePreviewPageProps = {
  payload: SmartReportPayload;
  selectedVariantId: ReportVariantId;
  variants: ReportVariantConfig[];
};

function createInitialDocumentDraft(
  payload: SmartReportPayload,
  variantId: ReportVariantId,
) {
  return buildReportDocumentDraftFromPayload({
    payload,
    variantId,
    evidenceConfig: payload.evidenceConfig,
  });
}

function applySelectedFieldsToPayload(
  payload: SmartReportPayload,
  selectedFields: SelectedReportField[],
): SmartReportPayload {
  function buildField(
    selectedField: SelectedReportField,
    sourceFields: SmartReportField[],
  ): SmartReportField | null {
    const originalField = sourceFields.find(
      (field) => field.key === selectedField.key,
    );

    if (!originalField) return null;

    return {
      ...originalField,
      label: selectedField.label,
      value: selectedField.value,
    };
  }

  const primaryFields = selectedFields
    .filter((field) => field.source === "primary")
    .map((field) => buildField(field, payload.primaryFields))
    .filter((field): field is SmartReportField => Boolean(field));

  const detailFields = selectedFields
    .filter((field) => field.source === "detail")
    .map((field) => buildField(field, payload.detailFields))
    .filter((field): field is SmartReportField => Boolean(field));

  return {
    ...payload,
    primaryFields,
    detailFields,
  };
}

export function SmartReportCasePreviewPage({
  payload: initialPayload,
  selectedVariantId,
  variants,
}: SmartReportCasePreviewPageProps) {
  const [reportPayload, setReportPayload] = useState<SmartReportPayload | null>(
    null,
  );
  const [documentDraft, setDocumentDraft] = useState<ReportDocumentDraft | null>(
    null,
  );
  const [hydratedFromLocalDraft, setHydratedFromLocalDraft] = useState(false);

  useEffect(() => {
    if (!reportPayload || hydratedFromLocalDraft) return;

    const savedDraft = loadReportDocumentDraft(
      reportPayload.caseInfo.id,
      selectedVariantId,
    );

    if (savedDraft) {
      setDocumentDraft(savedDraft);
    }

    setHydratedFromLocalDraft(true);
  }, [hydratedFromLocalDraft, reportPayload, selectedVariantId]);

  const saveAdjustments = useMemo(() => {
    if (!reportPayload || !documentDraft) return null;

    return computeReportDocumentDraftAdjustments(reportPayload, documentDraft);
  }, [documentDraft, reportPayload]);

  function handleSelectedFields(selectedFields: SelectedReportField[]) {
    const nextPayload = applySelectedFieldsToPayload(
      initialPayload,
      selectedFields,
    );
    const nextDraft = createInitialDocumentDraft(nextPayload, selectedVariantId);

    setReportPayload(nextPayload);
    setDocumentDraft(nextDraft);
    setHydratedFromLocalDraft(false);
  }

  function handleDraftChange(nextDraft: ReportDocumentDraft) {
    saveReportDocumentDraft(nextDraft);
  }

  if (!reportPayload || !documentDraft) {
    return (
      <ReportFieldSelectionGate
        payload={initialPayload}
        onContinue={handleSelectedFields}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#eef3ef] px-6 py-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="flex flex-col gap-4 rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between print:hidden">
          <div className="min-w-0">
            <p className="text-sm font-black text-emerald-700">
              تجهيز التقرير
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-950">
              {documentDraft.title || reportPayload.title}
            </h1>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              تم إنشاء التقرير من البيانات التي اخترتها فقط.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <SmartReportVariantSelector
              caseId={reportPayload.caseInfo.id}
              selectedVariantId={selectedVariantId}
              variants={variants}
            />

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReportPayload(null);
                  setDocumentDraft(null);
                  setHydratedFromLocalDraft(false);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                تعديل البيانات المختارة
              </button>

              <Link
                href={`/dashboard/cases/${reportPayload.caseInfo.id}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowRight className="h-4 w-4" />
                العودة
              </Link>

              {saveAdjustments ? (
                <SaveSmartReportButton
                  caseId={reportPayload.caseInfo.id}
                  variantId={selectedVariantId}
                  adjustments={saveAdjustments}
                />
              ) : null}

              <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-5 py-3 text-xs font-black text-emerald-800 ring-1 ring-emerald-100">
                المعاينة النهائية من لوحة التحرير
              </div>
            </div>
          </div>
        </section>

        <ReportDocumentEditor
          initialDraft={documentDraft}
          onDraftChange={handleDraftChange}
        />
      </div>
    </main>
  );
}