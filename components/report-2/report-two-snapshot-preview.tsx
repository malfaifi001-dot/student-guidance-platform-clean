import { ReportTwoPdfDownloadButton } from "@/components/report-2/report-two-pdf-download-button";

type SnapshotForDownload = {
  caseEntryId: string;
  reportTitle: string;
  snapshotTemplateJson?: unknown;
  snapshotPagesJson?: unknown;
};

type ReportTwoSnapshotPreviewProps = {
  snapshot: {
    caseEntryId: string;
    reportTitle: string;
    serviceName?: string | null;
    serviceSlug?: string | null;
    approvedAt?: string | null;
    approvedByName?: string | null;
    snapshotTemplateJson?: unknown;
    snapshotPagesJson?: unknown;
    snapshotHtml: string;
    pdfUrl?: string | null;
  };
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
  printMode = false,
}: ReportTwoSnapshotPreviewProps) {
  return (
    <main
      className={printMode ? "bg-white" : "px-6 py-8"}
      dir="rtl"
    >
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
          className="mx-auto mb-6 max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                التقارير المعتمدة
              </p>

              <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {snapshot.reportTitle}
              </h1>

              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                {snapshot.serviceName || snapshot.serviceSlug || "خدمة غير محددة"}
                {" · "}
                تم اعتماد التقرير {formatDate(snapshot.approvedAt)}
                {snapshot.approvedByName ? ` · ${snapshot.approvedByName}` : ""}
              </p>
            </div>

            <ReportTwoPdfDownloadButton
              snapshot={snapshot as SnapshotForDownload}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-60"
            />
          </div>
        </section>
      ) : null}

      <section
        className={printMode ? "" : "mx-auto max-w-6xl pb-10"}
        dangerouslySetInnerHTML={{ __html: snapshot.snapshotHtml }}
      />
    </main>
  );
}
