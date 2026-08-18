"use client";

import { Download } from "lucide-react";
import { NativeDownloadLink } from "@/components/downloads/native-download-link";

type Props = {
  serviceSlug: string;
  workflowId: string;
  hasOriginalFile: boolean;
};

export function WorkflowOriginalFileAction({ serviceSlug, workflowId, hasOriginalFile }: Props) {
  if (!hasOriginalFile) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-400">
        <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" /> تحميل ملف Excel</span>
        <p>ملف Excel الأصلي غير محفوظ لهذه النسخة القديمة</p>
      </div>
    );
  }

  return (
    <NativeDownloadLink
      href={`/api/dashboard/admin/workflows/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(workflowId)}/original-file`}
      fileName={`${serviceSlug}-${workflowId}.xlsx`}
      className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
    >
      <Download className="h-4 w-4" />
      تحميل ملف Excel
    </NativeDownloadLink>
  );
}
