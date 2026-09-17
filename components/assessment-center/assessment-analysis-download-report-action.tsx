"use client";

import { Download } from "lucide-react";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

type Props = {
  analysisId: string;
  analysisTitle: string;
  className?: string;
};

export function AssessmentAnalysisDownloadReportAction({ analysisId, analysisTitle, className }: Props) {
  const print = usePrintExportAction();

  return <><button type="button" onClick={() => void print.runPrintExport({ exportUrl: `/api/dashboard/assessment-center/${analysisId}/export?format=pdf`, printUrl: `/dashboard/assessment-center/${analysisId}/print?print=1`, fileName: `${analysisTitle || "analysis"}.pdf`, blockedTitle: "معاينة التقرير" })} disabled={print.status === "loading"} className={className || "inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-700 px-4 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-60"}><Download className="h-4 w-4 shrink-0" />تحميل التقرير</button><PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} /></>;
}
