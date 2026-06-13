"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import type { ReportVariantId } from "@/lib/report-engine/report-variant-registry";
import type { ReportDraftAdjustments } from "@/lib/report-engine/smart-report-types";

type SaveSmartReportButtonProps = {
  caseId: string;
  variantId: ReportVariantId;
  adjustments?: ReportDraftAdjustments | null;
};

export function SaveSmartReportButton({
  caseId,
  variantId,
  adjustments,
}: SaveSmartReportButtonProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/dashboard/reports/case/${caseId}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            variantId,
            reportDraftAdjustments: adjustments,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result?.success || !result?.reportId) {
        throw new Error(result?.error || "تعذر حفظ التقرير.");
      }

      window.location.href = `/dashboard/report/${result.reportId}/preview`;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء حفظ التقرير.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? "جار الحفظ..." : "حفظ التقرير"}
      </button>

      {error ? (
        <p className="max-w-xs rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-6 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}