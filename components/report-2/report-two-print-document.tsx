"use client";

import { useEffect } from "react";
import {
  A4DesignPage,
  normalizeDesignId,
  getDesignLogoSrc,
  getDesignLogoNumber,
  getDesignLogoFit,
  getDesignLogoFilter,
  type ReportDesignId,
} from "@/components/report-engine/design-renderers/report-design-renderer";

type PrintDocumentSnapshot = {
  template: any;
  context: Record<string, string>;
  previewCase: any;
  designTemplateId?: ReportDesignId;
};

export function ReportTwoPrintDocument({
  snapshot,
}: {
  snapshot: PrintDocumentSnapshot;
}) {
  const template = snapshot.template || { pages: [] };
  const pages = Array.isArray(template.pages) ? template.pages : [];
  const context = snapshot.context || {};
  const previewCase = snapshot.previewCase || null;
  const designId = normalizeDesignId(
    snapshot.designTemplateId || template.designTemplateId || "ministry-form",
  );

  const logoWidthPx = getDesignLogoNumber(context, "report.logoWidthPx", 96, 24, 240);
  const logoHeightPx = getDesignLogoNumber(context, "report.logoHeightPx", 56, 20, 160);
  const logoFit = getDesignLogoFit(context);
  const logoFilter = getDesignLogoFilter(context);
  const logoSrc = getDesignLogoSrc(context);

  useEffect(() => {
    let cancelled = false;

    document.fonts.ready
      .then(() => {
        if (cancelled) return;
        return new Promise<void>((resolve) => setTimeout(resolve, 500));
      })
      .then(() => {
        if (!cancelled) {
          window.print();
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="report-two-print-document" dir="rtl">
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        :root,
        html,
        body {
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
        }

        body {
          overflow: visible !important;
        }

        .report-two-print-document {
          background: #ffffff;
        }

        .report-two-print-document .pdf-report-page {
          break-after: page;
          page-break-after: always;
          page-break-inside: avoid;
        }

        .report-two-print-document .pdf-report-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        img {
          max-width: 100%;
        }
      `}</style>

      {logoSrc && (
        <link rel="preload" as="image" href={logoSrc} />
      )}

      {pages.map((page: any) => (
        <div key={page.id}>
          <A4DesignPage
            designId={designId}
            page={page}
            context={context}
            previewCase={previewCase}
            pageLabel={page.title || "صفحة"}
          />
        </div>
      ))}
    </main>
  );
}
