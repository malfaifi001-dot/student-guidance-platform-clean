import { ReportTwoPdfDownloadButton } from "@/components/report-2/report-two-pdf-download-button";
import { ReportTwoPrintDocument } from "@/components/report-2/report-two-print-document";
import { ReportTwoSnapshotPrintController } from "@/components/report-2/report-two-snapshot-print-controller";
import { ReportDeleteAction } from "@/components/reports/report-delete-action";
import { Trash2 } from "lucide-react";
import { GuidanceScope } from "@/components/guidance/guidance-scope";

type SnapshotForDownload = {
  caseEntryId: string;
  reportTitle: string;
  snapshotTemplateJson?: unknown;
  snapshotPagesJson?: unknown;
  snapshotPayload?: unknown;
  renderContext?: unknown;
  previewCase?: unknown;
  variantId?: string | null;
};

type ReportTwoSnapshotPreviewProps = {
  snapshot: {
    id: string;
    caseEntryId: string;
    reportTitle: string;
    serviceName?: string | null;
    serviceSlug?: string | null;
    approvedAt?: string | null;
    approvedByName?: string | null;
    status?: "DRAFT" | "APPROVED";
    active?: boolean;
    renderContext?: unknown;
    previewCase?: unknown;
    snapshotPayload?: unknown;
    snapshotTemplateJson?: unknown;
    snapshotPagesJson?: unknown;
    snapshotHtml: string;
    pdfUrl?: string | null;
    variantId?: string | null;
  };
  caseTitle?: string | null;
  printMode?: boolean;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "غير محدد";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ReportTwoSnapshotPreview({
  snapshot,
  caseTitle,
  printMode = false,
}: ReportTwoSnapshotPreviewProps) {
  const isApproved = !snapshot.status || snapshot.status === "APPROVED";
  const canRenderStructured = Boolean(
    snapshot.snapshotTemplateJson &&
      typeof snapshot.snapshotTemplateJson === "object",
  );

  if (printMode && canRenderStructured) {
    return (
      <ReportTwoPrintDocument
        snapshot={{
          template: snapshot.snapshotTemplateJson,
          context: (snapshot.renderContext || {}) as Record<string, string>,
          previewCase: snapshot.previewCase || null,
          sourcePayload: snapshot.snapshotPayload,
          variantId: snapshot.variantId,
        }}
        autoPrint
      />
    );
  }

  return (
    <main
      className={printMode ? "bg-white" : "min-h-screen bg-slate-50 px-3 py-4 sm:px-6 sm:py-8 dark:bg-slate-950"}
      dir="rtl"
    >
      {printMode ? <ReportTwoSnapshotPrintController /> : null}
      {!printMode ? <GuidanceScope context="report-preview" /> : null}
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          body {
            background: #ffffff !important;
          }

          [data-report-two-snapshot-toolbar] {
            display: none !important;
          }
        }
      `}</style>

      {!printMode ? (
        <section
          data-report-two-snapshot-toolbar
          data-guidance="report-preview-actions"
          className="mx-auto mb-4 w-full max-w-7xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-6 sm:rounded-[2rem] sm:p-5 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className={[
                "text-xs font-black",
                isApproved
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-sky-700 dark:text-sky-400",
              ].join(" ")}>
                {isApproved ? "التقارير المعتمدة" : "التقارير المحفوظة"}
              </p>

              <h1 className="mt-2 break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl dark:text-white">
                {snapshot.reportTitle}
              </h1>

              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                {snapshot.serviceName || snapshot.serviceSlug || "خدمة غير محددة"}
                {" · "}
                {isApproved
                  ? `تم اعتماد التقرير ${formatDate(snapshot.approvedAt)}`
                  : "مسودة"}
                {snapshot.approvedByName ? ` · ${snapshot.approvedByName}` : ""}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
              {isApproved ? (
                <ReportTwoPdfDownloadButton
                  snapshot={snapshot as SnapshotForDownload}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-60 sm:flex-none sm:rounded-2xl sm:px-5"
                />
              ) : (
                <span className="inline-flex items-center justify-center rounded-2xl bg-sky-50 px-5 py-3 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                  مسودة غير رسمية
                </span>
              )}
              <ReportDeleteAction
                reportId={snapshot.id}
                reportTitle={snapshot.reportTitle}
                caseTitle={caseTitle || undefined}
                reportStatus={snapshot.status || "APPROVED"}
                deleteEndpoint={`/api/dashboard/report-2/snapshots/${encodeURIComponent(snapshot.id)}`}
                redirectAfterDelete={`/dashboard/cases/${encodeURIComponent(snapshot.caseEntryId)}`}
                reportTwoDraftStorage={
                  snapshot.active
                    ? {
                        caseId: snapshot.caseEntryId,
                        serviceSlug: snapshot.serviceSlug || "general",
                      }
                    : undefined
                }
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-rose-200 bg-white text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-3"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isApproved ? "حذف التقرير المعتمد" : "حذف مسودة التقرير"}
                </span>
              </ReportDeleteAction>
            </div>
          </div>
        </section>
      ) : null}

      <section data-guidance={printMode ? undefined : "report-preview-document"} className={printMode ? "" : "mx-auto w-full max-w-7xl pb-6 sm:pb-10"}>
        {canRenderStructured ? (
          <ReportTwoPrintDocument
            snapshot={{
              template: snapshot.snapshotTemplateJson,
              context: (snapshot.renderContext || {}) as Record<string, string>,
              previewCase: snapshot.previewCase || null,
              sourcePayload: snapshot.snapshotPayload,
              variantId: snapshot.variantId,
            }}
          />
        ) : !printMode ? (
          <ReportTwoPrintDocument
            snapshot={{
              template: { pages: [] },
              context: {},
              previewCase: null,
              html: snapshot.snapshotHtml,
            }}
          />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: snapshot.snapshotHtml }} />
        )}
      </section>
    </main>
  );
}
