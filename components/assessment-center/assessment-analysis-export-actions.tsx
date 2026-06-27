"use client";

import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

type Props = {
  analysisId: string;
  analysisTitle: string;
};

function buildPdfFileName(title: string) {
  const trimmed = title.trim();
  return `${trimmed || "assessment-analysis"}.pdf`;
}

export function AssessmentAnalysisExportActions({
  analysisId,
  analysisTitle,
}: Props) {
  const {
    status,
    modal,
    runPrintExport,
    openFallbackPrintUrl,
    closeModal,
  } = usePrintExportAction();

  const isLoading = status === "loading";

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
          void runPrintExport({
            exportUrl: `/api/dashboard/assessment-center/${analysisId}/export?format=pdf`,
            printUrl: `/dashboard/assessment-center/${analysisId}/print`,
            fileName: buildPdfFileName(analysisTitle),
            blockedTitle: "معاينة الطباعة",
            blockedMessage:
              "تم حظر فتح نافذة المعاينة تلقائياً. استخدم الزر أدناه لفتح معاينة الطباعة في نافذة جديدة.",
            errorTitle: "تصدير PDF",
            errorMessage: "تعذر تصدير تحليل الاختبارات. حاول مرة أخرى.",
          });
        }}
        className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "جاري تجهيز PDF..." : "PDF"}
      </button>

      <PrintExportPopCard
        modal={modal}
        onClose={closeModal}
        onOpenFallback={openFallbackPrintUrl}
      />
    </>
  );
}
