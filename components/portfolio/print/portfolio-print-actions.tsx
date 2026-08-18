"use client";

import { ArrowRight, Download } from "lucide-react";
import Link from "next/link";

import { NativeDownloadLink } from "@/components/downloads/native-download-link";

export function PortfolioPrintActions({
  backHref = "/dashboard/teacher/portfolio",
  downloadHref,
  fileName = "portfolio.pdf",
}: { backHref?: string; downloadHref: string; fileName?: string }) {
  return (
    <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50">
          <ArrowRight className="h-4 w-4" /> رجوع
        </Link>
        <NativeDownloadLink href={downloadHref} fileName={fileName} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800">
          <Download className="h-4 w-4" /> تحميل PDF
        </NativeDownloadLink>
      </div>
    </div>
  );
}
