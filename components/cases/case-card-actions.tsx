"use client";

import Link from "next/link";
import { Eye, FileText, PencilLine, Trash2 } from "lucide-react";

import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";

import { CaseDeleteAction } from "@/components/cases/case-delete-action";
import { ReportDeleteAction } from "@/components/reports/report-delete-action";
import type { CaseCapabilities } from "@/lib/cases/case-permissions";

type CaseCardActionReport = {
  id: string;
  status: string;
  title?: string | null;
  previewUrl?: string | null;
  canDeleteReport?: boolean;
};

export type CaseCardActionEntry = {
  id: string;
  title: string;
  status: string;
  reportsCount: number;
  service: {
    name: string;
    slug: string;
  };
  student?: {
    fullName?: string | null;
  } | null;
  capabilities: CaseCapabilities;
  reportTwoReport?: CaseCardActionReport | null;
  latestReport?: CaseCardActionReport | null;
};

function getReportAction(caseEntry: CaseCardActionEntry) {
  if (caseEntry.reportTwoReport?.id && caseEntry.reportTwoReport.previewUrl) {
    return {
      label: "Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
      href: caseEntry.reportTwoReport.previewUrl,
    };
  }

  if (caseEntry.latestReport?.previewUrl) {
    return {
      label: "Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ØªÙ‚Ø±ÙŠØ±",
      href: caseEntry.latestReport.previewUrl,
    };
  }

  if (caseEntry.status === "SUBMITTED") {
    return {
      label: "Ø¥ØµØ¯Ø§Ø± ØªÙ‚Ø±ÙŠØ±",
      href: `/dashboard/report-2/cases/${encodeURIComponent(caseEntry.id)}/prepare`,
    };
  }

  return null;
}

export function CaseCardActions({
  caseEntry,
  onCaseDeleted,
}: {
  caseEntry: CaseCardActionEntry;
  onCaseDeleted: (caseId: string) => void;
}) {
  const reportAction = getReportAction(caseEntry);
  const reportStatus =
    caseEntry.reportTwoReport?.status || caseEntry.latestReport?.status || null;
  const persistedReportId =
    caseEntry.reportTwoReport?.id || caseEntry.latestReport?.id || null;
  const deleteEndpoint = caseEntry.reportTwoReport?.id
    ? `/api/dashboard/report-2/snapshots/${encodeURIComponent(caseEntry.reportTwoReport.id)}`
    : caseEntry.latestReport
      ? `/api/dashboard/reports/${encodeURIComponent(caseEntry.latestReport.id)}/delete`
      : null;
  const canDeleteReport = Boolean(
    caseEntry.capabilities.canDeleteCaseReport &&
      persistedReportId &&
      deleteEndpoint &&
      (!caseEntry.reportTwoReport || caseEntry.reportTwoReport.canDeleteReport),
  );
  const baseIconButtonClass =
    "grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400";
  const disabledIconButtonClass =
    "grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-100 text-slate-300 shadow-sm";
  const reportIconButtonClass = reportAction
    ? [
        "grid h-10 w-10 place-items-center rounded-full text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
        reportStatus === "APPROVED"
          ? "bg-emerald-700 hover:bg-emerald-800"
          : reportStatus === "DRAFT"
            ? "bg-sky-600 hover:bg-sky-700"
            : "bg-sky-700 hover:bg-sky-800",
      ].join(" ")
    : disabledIconButtonClass;

  return (
    <ExpandableActionMenu menuId={`case:${caseEntry.id}`}>
      {caseEntry.capabilities.canViewCase ? (
        <Link
          href={`/dashboard/cases/${caseEntry.id}`}
          aria-label="Ø¹Ø±Ø¶ Ø§Ù„Ø­Ø§Ù„Ø©"
          title="Ø¹Ø±Ø¶ Ø§Ù„Ø­Ø§Ù„Ø©"
          className={baseIconButtonClass}
        >
          <Eye className="h-4 w-4" />
        </Link>
      ) : null}

      {caseEntry.capabilities.canEditCase ? (
        <Link
          href={`/dashboard/cases/${caseEntry.id}/edit`}
          aria-label="ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø­Ø§Ù„Ø©"
          title="ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø­Ø§Ù„Ø©"
          className={baseIconButtonClass}
        >
          <PencilLine className="h-4 w-4" />
        </Link>
      ) : null}

      {reportAction && caseEntry.capabilities.canOpenCaseReport ? (
        <Link
          href={reportAction.href}
          aria-label={reportAction.label}
          title={reportAction.label}
          className={reportIconButtonClass}
        >
          <FileText className="h-4 w-4" />
        </Link>
      ) : (
        <span
          aria-label="Ù„Ø§ ÙŠÙˆØ¬Ø¯ ØªÙ‚Ø±ÙŠØ± Ø¬Ø§Ù‡Ø²"
          title="Ù„Ø§ ÙŠÙˆØ¬Ø¯ ØªÙ‚Ø±ÙŠØ± Ø¬Ø§Ù‡Ø²"
          className={disabledIconButtonClass}
        >
          <FileText className="h-4 w-4" />
        </span>
      )}

      {canDeleteReport && persistedReportId && deleteEndpoint ? (
        <ReportDeleteAction
          reportId={persistedReportId}
          reportTitle={caseEntry.reportTwoReport?.title || caseEntry.title}
          caseTitle={caseEntry.title}
          reportStatus={reportStatus || "DRAFT"}
          deleteEndpoint={deleteEndpoint}
          reportTwoDraftStorage={
            caseEntry.reportTwoReport?.id
              ? { caseId: caseEntry.id, serviceSlug: caseEntry.service.slug }
              : undefined
          }
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </ReportDeleteAction>
      ) : null}

      {caseEntry.capabilities.canDeleteCase ? (
        <CaseDeleteAction
          caseId={caseEntry.id}
          caseTitle={caseEntry.title}
          serviceName={caseEntry.service.name}
          serviceSlug={caseEntry.service.slug}
          studentName={caseEntry.student?.fullName}
          hasLinkedReports={Boolean(persistedReportId || caseEntry.reportsCount)}
          onDeleted={onCaseDeleted}
        />
      ) : null}

    </ExpandableActionMenu>
  );
}
