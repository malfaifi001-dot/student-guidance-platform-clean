"use client";

import { ChevronDown } from "lucide-react";
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
        href={`/api/dashboard/assessment-center/${analysisId}/export?format=excel`}
        fileName={`${analysisTitle || "analysis"}.xlsx`}
        className="inline-flex h-10 min-w-[92px] items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-4 text-sm font-black text-white shadow-sm transition hover:bg-white/20"
      >
        <span>Excel</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </NativeDownloadLink>

    </>
  );
}
