"use client";

import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

export function AssessmentReportPreviewActions({ analysisId, analysisTitle }: { analysisId: string; analysisTitle: string }) {
  const print = usePrintExportAction();
  return <><header className="sticky top-0 z-20 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"><Link href={`/dashboard/assessment-center/${analysisId}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><ArrowRight className="h-4 w-4" />رجوع</Link><button type="button" onClick={() => void print.runPrintExport({ exportUrl: `/api/dashboard/assessment-center/${analysisId}/export?format=pdf`, printUrl: `/dashboard/assessment-center/${analysisId}/print?print=1`, fileName: `${analysisTitle || "analysis"}.pdf`, blockedTitle: "معاينة التقرير" })} disabled={print.status === "loading"} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-700 px-4 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-60"><Download className="h-4 w-4" />تحميل PDF</button></header><PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} /></>;
}
