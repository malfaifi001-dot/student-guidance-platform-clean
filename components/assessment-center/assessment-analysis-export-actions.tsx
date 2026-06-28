"use client";

import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

type Props = {
  analysisId: string;
  analysisTitle: string;
};

export function AssessmentAnalysisExportActions({
  analysisId,
}: Props) {
  const {
    status,
    modal,
    runPrintExport,
    openFallbackPrintUrl,
    closeModal,
  } = usePrintExportAction();

  const isLoading = status === "loading";

  async function openAssessmentPdf() {
    if (isLoading) return;

    await runPrintExport({
      printUrl: `/api/dashboard/assessment-center/${analysisId}/export?format=pdf&print=1`,
      blockedTitle: "معاينة طباعة تقرير التحليل",
      blockedMessage:
        "تم حظر فتح معاينة الطباعة تلقائيًا. استخدم الزر أدناه لفتح تقرير التحليل في تبويب جديد.",
      errorTitle: "تصدير PDF",
      errorMessage: "تعذر فتح تقرير التحليل للطباعة. حاول مرة أخرى.",
    });
  }

  return (
    <>
      <a
        href={`/api/dashboard/assessment-center/${analysisId}/export?format=excel`}
        className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
      >
        Excel
      </a>

      <button
        type="button"
        disabled={isLoading}
        onClick={() => {
          void openAssessmentPdf();
        }}
        className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "جاري فتح PDF..." : "PDF"}
      </button>

      <PrintExportPopCard
        modal={modal}
        onClose={closeModal}
        onOpenFallback={openFallbackPrintUrl}
      />
    </>
  );
}