"use client";

import { useEffect } from "react";
import {
  A4DesignPage,
  normalizeDesignId,
  getDesignLogoSrc,
  getDesignLogoNumber,
  getDesignLogoFit,
  getDesignLogoFilter,
  getReportHeaderSettingsStyle,
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
  autoPrint = false,
}: {
  snapshot: PrintDocumentSnapshot;
  autoPrint?: boolean;
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
  const headerStyleText = getReportHeaderSettingsStyle(
    template?.designConfig?.header,
  );

  useEffect(() => {
    if (!autoPrint) {
      return;
    }

    let cancelled = false;

    (async () => {
      await document.fonts.ready;
      if (cancelled) return;

      const images = document.querySelectorAll<HTMLImageElement>(
        ".report-two-print-document img",
      );
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }
            }),
        ),
      );
      if (cancelled) return;

      await new Promise<void>((r) => setTimeout(r, 500));
      if (cancelled) return;

      window.print();
    })();

    return () => {
      cancelled = true;
    };
  }, [autoPrint]);

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
          width: 210mm !important;
          min-width: 210mm !important;
          max-width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          overflow: hidden !important;
          break-after: page !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
        }

        .report-two-print-document .pdf-report-page:last-child {
          break-after: auto !important;
          page-break-after: auto !important;
        }

        img {
          max-width: 100%;
        }
      `}</style>
      {headerStyleText ? <style>{headerStyleText}</style> : null}

      {logoSrc && <link rel="preload" as="image" href={logoSrc} />}

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
