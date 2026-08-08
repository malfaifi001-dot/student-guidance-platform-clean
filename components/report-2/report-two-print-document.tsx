"use client";

import {
  getDesignLogoSrc,
  getReportHeaderSettingsStyle,
  type ReportDesignId,
} from "@/components/report-engine/design-renderers/report-design-renderer";
import { isReportDesignId } from "@/components/report-engine/design-renderers/report-design-registry";
import { SmartPhysicalReportComposer } from "@/components/report-engine/design-renderers/smart-layout/report-smart-physical-pages";
import { ReportTwoSnapshotPrintController } from "@/components/report-2/report-two-snapshot-print-controller";
import { applyStructuredTableDisplayMetadataToTemplate } from "@/lib/report-engine/report-structured-table-display";
import {
  OFFICIAL_ACTIVITY_CARD_VARIANT_ID,
  ReportTwoOfficialActivitySignatureStyle,
} from "@/components/report-2/report-two-official-activity-signature-style";

type PrintDocumentSnapshot = {
  template: any;
  context: Record<string, string>;
  previewCase: any;
  sourcePayload?: unknown;
  designTemplateId?: ReportDesignId;
  variantId?: string | null;
};

export function ReportTwoPrintDocument({
  snapshot,
  autoPrint = false,
}: {
  snapshot: PrintDocumentSnapshot;
  autoPrint?: boolean;
}) {
  const template = applyStructuredTableDisplayMetadataToTemplate(
    snapshot.template || { pages: [] },
    snapshot.sourcePayload,
  ) as any;
  const pages = Array.isArray(template.pages) ? template.pages : [];
  const context = snapshot.context || {};
  const previewCase = snapshot.previewCase || null;
  const requestedDesignId =
    snapshot.designTemplateId || template.designTemplateId;
  const designId = isReportDesignId(requestedDesignId)
    ? requestedDesignId
    : null;

  const logoSrc = getDesignLogoSrc(context);
  const headerStyleText = getReportHeaderSettingsStyle(
    template?.designConfig?.header,
  );

  if (!designId) {
    return (
      <main className="p-8 text-center font-bold text-red-700" dir="rtl">
        تعذر تحديد تصميم التقرير المحفوظ للطباعة.
      </main>
    );
  }

  return (
    <main
      className={[
        "report-two-print-document",
        snapshot.variantId === OFFICIAL_ACTIVITY_CARD_VARIANT_ID
          ? "report-two-official-activity-card"
          : "",
      ].join(" ")}
      dir="rtl"
    >
      {autoPrint ? <ReportTwoSnapshotPrintController /> : null}
      <ReportTwoOfficialActivitySignatureStyle
        enabled={snapshot.variantId === OFFICIAL_ACTIVITY_CARD_VARIANT_ID}
      />
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

      <SmartPhysicalReportComposer
        designId={designId}
        pages={pages}
        context={context}
        previewCase={previewCase}
        fallbackPageLabel={template?.name || "التقرير"}
        renderMode="stack"
        suppressAutoEvidencePages
      />
    </main>
  );
}
