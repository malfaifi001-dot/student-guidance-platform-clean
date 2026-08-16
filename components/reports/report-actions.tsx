"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";
import { ReportDeleteAction } from "./report-delete-action";

type Props = {
  reportId: string;
  status: string;
  title?: string;
};

export function ReportActions({
  reportId,
  status,
  title = "Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ø­Ø¯Ø¯",
}: Props) {
  return (
    <ExpandableActionMenu menuId={`report:${reportId}`}>
      <Link
        href={`/dashboard/report/${reportId}/studio`}
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
      >
        {status === "APPROVED" ? "Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­" : "ØªØ¹Ø¯ÙŠÙ„"}
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
        <Trash2 className="inline h-4 w-4" /> Ø­Ø°Ù
      </ReportDeleteAction>
    </ExpandableActionMenu>
  );
}

