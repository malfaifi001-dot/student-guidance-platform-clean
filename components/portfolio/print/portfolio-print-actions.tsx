"use client";

import { ArrowRight, Download } from "lucide-react";
import Link from "next/link";

import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

export function PortfolioPrintActions({
  backHref = "/dashboard/teacher/portfolio",
  downloadHref,
  fileName = "portfolio.pdf",
}: { backHref?: string; downloadHref: string; fileName?: string }) {
  const print = usePrintExportAction();

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50">
          <ArrowRight className="h-4 w-4" /> رجوع
        </Link>
        <button type="button" disabled={print.status === "loading"} onClick={() => void print.runPrintExport({ exportUrl: downloadHref, fileName, progressTitle: "جاري تجهيز ملف الإنجاز", progressMessage: "يتم الآن تجهيز ملف الإنجاز للتحميل، الرجاء الانتظار...", fallbackProgressTitle: "جاري تجهيز ملف الإنجاز للمعاينة", fallbackProgressMessage: "يتم الآن تجهيز ملف الإنجاز للمعاينة، الرجاء الانتظار...", blockedTitle: "معاينة ملف الإنجاز" })} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60">
          <Download className="h-4 w-4" /> تحميل PDF
        </button>
      </div>
      <PrintExportPopCard align="center" modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
    </div>
  );
}
