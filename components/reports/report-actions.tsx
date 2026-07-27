"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ReportDeleteAction } from "./report-delete-action";

type Props = {
  reportId: string;
  status: string;
  title?: string;
};

export function ReportActions({
  reportId,
  status,
  title = "التقرير المحدد",
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/dashboard/report/${reportId}/studio`}
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
      >
        {status === "APPROVED" ? "إعادة فتح" : "تعديل"}
      </Link>

      <Link
        href={`/dashboard/report/${reportId}/preview`}
        className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50"
      >
        Preview
      </Link>

      <ReportDeleteAction
        reportId={reportId}
        reportTitle={title}
        reportStatus={status}
        deleteEndpoint={`/api/dashboard/reports/${encodeURIComponent(reportId)}/delete`}
        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="inline h-4 w-4" /> حذف
      </ReportDeleteAction>
    </div>
  );
}
