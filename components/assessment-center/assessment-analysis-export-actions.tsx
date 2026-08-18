"use client";

import { ChevronDown, Link2 } from "lucide-react";
import { NativeDownloadLink } from "@/components/downloads/native-download-link";

type Props = {
  analysisId: string;
  analysisTitle: string;
};

export function AssessmentAnalysisExportActions({
  analysisId,
  analysisTitle,
}: Props) {
  return (
    <>
      <NativeDownloadLink
        href={`/api/dashboard/assessment-center/${analysisId}/export?format=pdf&print=1`}
        fileName={`${analysisTitle || "analysis"}.pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 min-w-[82px] items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-black text-sky-800 shadow-sm transition hover:bg-sky-50"
      >
        <span>PDF</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </NativeDownloadLink>

      <NativeDownloadLink
        href={`/api/dashboard/assessment-center/${analysisId}/export?format=excel`}
        fileName={`${analysisTitle || "analysis"}.xlsx`}
        className="inline-flex h-10 min-w-[92px] items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-black text-white shadow-sm transition hover:bg-white/20"
      >
        <span>Excel</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </NativeDownloadLink>

      <a
        href="/dashboard/assessment-center/report-linking"
        className="inline-flex h-10 min-w-[132px] items-center justify-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-black text-white shadow-sm transition hover:bg-white/20"
      >
        <span>ربط التقارير</span>
        <Link2 className="h-3.5 w-3.5 opacity-90" />
      </a>
    </>
  );
}
