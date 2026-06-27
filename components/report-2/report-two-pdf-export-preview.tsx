"use client";

import {
  ReportDesignRenderer,
  type ReportDesignId,
} from "@/components/report-engine/design-renderers/report-design-renderer";
import { ReportTwoPrintDocument } from "@/components/report-2/report-two-print-document";

type ReportTwoPdfExportSnapshot = {
  template: any;
  context: Record<string, string>;
  previewCase: any;
  designTemplateId?: ReportDesignId;
};

export function ReportTwoPdfExportPreview({
  snapshot,
  printMode = false,
}: {
  snapshot: ReportTwoPdfExportSnapshot;
  printMode?: boolean;
}) {
  if (printMode) {
    return <ReportTwoPrintDocument snapshot={snapshot} autoPrint />;
  }

  const template = snapshot.template || {
    id: "report-2-export-empty",
    name: "تقرير",
    pages: [],
  };

  const pages = Array.isArray(template.pages) ? template.pages : [];
  const activePage = pages[0] || null;
  const activePageId = activePage?.id || "";

  return (
    <main className="report-two-pdf-export-preview report-two-pdf-force-light" dir="rtl">
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        :root,
        html,
        body,
        .report-two-pdf-export-preview {
          color-scheme: light !important;
        }

        .report-two-pdf-force-light {
          color-scheme: light !important;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #0f172a;
          direction: rtl;
          width: 210mm;
          min-height: 297mm;
        }

        body {
          overflow: visible !important;
        }

        .report-two-pdf-export-preview {
          width: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        .report-two-pdf-export-preview .pdf-report-page,
        .report-two-pdf-export-preview [data-report-design-page],
        .report-two-pdf-export-preview .report-design-page {
          width: 210mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          margin: 0 !important;
          box-shadow: none !important;
          transform: none !important;
          zoom: 1 !important;
          overflow: hidden !important;
          background: #ffffff !important;
          break-after: page;
          page-break-after: always;
          page-break-inside: avoid;
        }

        .report-two-pdf-export-preview .pdf-report-page:last-child,
        .report-two-pdf-export-preview [data-report-design-page]:last-child,
        .report-two-pdf-export-preview .report-design-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        [data-report-two-pdf-hide="evidence-overflow-note"] {
          display: none !important;
        }

        img {
          max-width: 100%;
        }
      `}</style>

      <ReportDesignRenderer
        suppressAutoEvidencePages
        renderMode="stack"
        chromeLayout="joined"
        designId={snapshot.designTemplateId || template.designTemplateId || "ministry-form"}
        template={template}
        activePage={activePage}
        activePageId={activePageId}
        context={snapshot.context || {}}
        previewCase={snapshot.previewCase || {}}
        onActivePageChange={() => undefined}
        onAddPage={() => undefined}
        onMovePage={() => undefined}
        onDeletePage={() => undefined}
        canMovePage={() => false}
        canDeletePage={() => false}
      />
    </main>
  );
}
