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
      className={printMode ? "bg-white" : "px-6 py-8"}
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
          className="mx-auto mb-6 max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={[
                "text-xs font-black",
                isApproved
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-sky-700 dark:text-sky-400",
              ].join(" ")}>
                {isApproved ? "التقارير المعتمدة" : "التقارير المحفوظة"}
              </p>

              <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
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

            <div className="flex flex-wrap items-center gap-2">
              {isApproved ? (
                <ReportTwoPdfDownloadButton
                  snapshot={snapshot as SnapshotForDownload}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
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
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isApproved ? "حذف التقرير المعتمد" : "حذف مسودة التقرير"}
              </ReportDeleteAction>
            </div>
          </div>
        </section>
      ) : null}

      <section data-guidance={printMode ? undefined : "report-preview-document"} className={printMode ? "" : "mx-auto max-w-6xl pb-10"}>
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
        ) : (
          <div dangerouslySetInnerHTML={{ __html: snapshot.snapshotHtml }} />
        )}
      </section>
    </main>
  );
}
