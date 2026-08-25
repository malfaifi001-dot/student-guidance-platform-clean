"use client";

import { useEffect, useRef, useState } from "react";

import {
  getDesignLogoSrc,
  ReportDesignRenderer,
  type ReportDesignId,
} from "@/components/report-engine/design-renderers/report-design-renderer";
import { isReportDesignId } from "@/components/report-engine/design-renderers/report-design-registry";
import { ReportTwoSnapshotPrintController } from "@/components/report-2/report-two-snapshot-print-controller";
import { applyStructuredTableDisplayMetadataToTemplate } from "@/lib/report-engine/report-structured-table-display";
import { repairPotentialUtf8Mojibake } from "@/lib/text/repair-utf8-mojibake";
import {
  OFFICIAL_ACTIVITY_CARD_VARIANT_ID,
  ReportTwoOfficialActivitySignatureStyle,
} from "@/components/report-2/report-two-official-activity-signature-style";
import {
  isReportNarrativeBlock,
  shouldIncludeReportNarrative,
} from "@/lib/report-engine/report-narrative-policy";

type PrintDocumentSnapshot = {
  template: any;
  context: Record<string, string>;
  previewCase: any;
  sourcePayload?: unknown;
  designTemplateId?: ReportDesignId;
  variantId?: string | null;
};

type PrintPreviewDimensions = {
  logicalWidth: number;
  scaledWidth: number;
  scaledHeight: number;
  scale: number;
};

const INITIAL_PRINT_PREVIEW_DIMENSIONS: PrintPreviewDimensions = {
  logicalWidth: 0,
  scaledWidth: 0,
  scaledHeight: 0,
  scale: 1,
};

const SCHOOL_BROADCAST_HIDDEN_BLOCK_KINDS = new Set([
  "executive-description",
  "executive_description",
  "details",
  "narrative",
  "execution-description",
  "execution_description",
]);

function isHiddenSchoolBroadcastBlock(block: any): boolean {
  const kind = String(block?.kind || block?.type || "").trim().toLowerCase();
  const id = String(block?.id || block?.key || "").trim().toLowerCase();
  const boundFieldKey = String(block?.boundFieldKey || block?.sourceFieldKey || "")
    .trim()
    .toLowerCase();
  const title = repairPotentialUtf8Mojibake(String(block?.title || "")).trim();

  return (
    isReportNarrativeBlock(block) ||
    SCHOOL_BROADCAST_HIDDEN_BLOCK_KINDS.has(kind) ||
    id === "executive-description" ||
    id === "executive_description" ||
    id === "details" ||
    id === "narrative" ||
    id === "execution-description" ||
    id === "execution_description" ||
    boundFieldKey === "executive-description" ||
    boundFieldKey === "executive_description" ||
    title === "الوصف التنفيذي" ||
    title === "التفاصيل"
  );
}

function hideSchoolBroadcastBlocks(template: any, serviceSlug: unknown) {
  if (shouldIncludeReportNarrative(String(serviceSlug || ""))) return template;

  return {
    ...template,
    pages: Array.isArray(template?.pages)
      ? template.pages.map((page: any) => ({
          ...page,
          blocks: Array.isArray(page?.blocks)
            ? page.blocks.filter((block: any) => !isHiddenSchoolBroadcastBlock(block))
            : page?.blocks,
        }))
      : template?.pages,
  };
}

export function ReportTwoPrintDocument({
  snapshot,
  autoPrint = false,
}: {
  snapshot: PrintDocumentSnapshot;
  autoPrint?: boolean;
}) {
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const [previewDimensions, setPreviewDimensions] =
    useState<PrintPreviewDimensions>(INITIAL_PRINT_PREVIEW_DIMENSIONS);
  const templateWithMetadata = applyStructuredTableDisplayMetadataToTemplate(
    snapshot.template || { pages: [] },
    snapshot.sourcePayload,
  ) as any;
  const template = hideSchoolBroadcastBlocks(
    templateWithMetadata,
    snapshot.previewCase?.serviceSlug,
  );
  const pages = Array.isArray(template.pages) ? template.pages : [];
  const context = snapshot.context || {};
  const previewCase = snapshot.previewCase || null;
  const requestedDesignId =
    snapshot.designTemplateId || template.designTemplateId;
  const designId = isReportDesignId(requestedDesignId)
    ? requestedDesignId
    : null;

  const logoSrc = getDesignLogoSrc(context);

  useEffect(() => {
    const viewport = previewViewportRef.current;
    const stage = previewStageRef.current;

    if (!viewport || !stage || !designId) return;

    let frameId = 0;

    const updatePreviewScale = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const page = stage.querySelector<HTMLElement>(".pdf-report-page");

        if (!page) return;

        const screenWidth =
          window.visualViewport?.width ||
          document.documentElement.clientWidth ||
          window.innerWidth;
        const viewportWidth = Math.min(viewport.clientWidth, screenWidth);
        const safeHorizontalGap =
          viewportWidth < 640 ? 24 : viewportWidth < 1180 ? 32 : 40;
        const availableWidth = Math.max(
          0,
          viewportWidth - safeHorizontalGap,
        );
        const logicalWidth = page.offsetWidth;
        const naturalStageHeight = Math.max(
          stage.scrollHeight,
          stage.offsetHeight,
        );

        if (!logicalWidth || !naturalStageHeight || !availableWidth) return;

        const fitScale = Math.min(1, availableWidth / logicalWidth);
        const nextDimensions = {
          logicalWidth,
          scaledWidth: logicalWidth * fitScale,
          scaledHeight: naturalStageHeight * fitScale,
          scale: fitScale,
        };

        setPreviewDimensions((current) => {
          const isUnchanged =
            current.logicalWidth === nextDimensions.logicalWidth &&
            Math.abs(current.scaledWidth - nextDimensions.scaledWidth) < 0.5 &&
            Math.abs(current.scaledHeight - nextDimensions.scaledHeight) < 0.5 &&
            Math.abs(current.scale - nextDimensions.scale) < 0.001;

          return isUnchanged ? current : nextDimensions;
        });
      });
    };

    const resizeObserver = new ResizeObserver(updatePreviewScale);
    resizeObserver.observe(viewport);
    resizeObserver.observe(stage);

    const mutationObserver = new MutationObserver(updatePreviewScale);
    mutationObserver.observe(stage, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener("resize", updatePreviewScale);
    window.addEventListener("orientationchange", updatePreviewScale);
    updatePreviewScale();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updatePreviewScale);
      window.removeEventListener("orientationchange", updatePreviewScale);
      window.cancelAnimationFrame(frameId);
    };
  }, [designId, pages.length]);

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

        .report-two-print-preview-viewport {
          width: 100%;
          min-width: 0;
          overflow: hidden;
          padding: 12px;
          background: #f1f5f9;
        }

        .report-two-print-preview-scaled {
          position: relative;
          margin-inline: auto;
        }

        .report-two-print-preview-stage {
          position: absolute;
          top: 0;
          left: 0;
          transform-origin: top left;
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

        .report-two-print-document img {
          max-width: 100%;
        }

        @media print {
          .report-two-print-preview-viewport {
            width: auto !important;
            min-width: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .report-two-print-preview-scaled {
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
          }

          .report-two-print-preview-stage {
            position: static !important;
            width: auto !important;
            height: auto !important;
            transform: none !important;
          }
        }
      `}</style>
      {logoSrc && <link rel="preload" as="image" href={logoSrc} />}

      <div
        ref={previewViewportRef}
        className="report-two-print-preview-viewport"
      >
        <div
          className="report-two-print-preview-scaled"
          style={{
            width: previewDimensions.scaledWidth,
            height: previewDimensions.scaledHeight,
          }}
        >
          <div
            ref={previewStageRef}
            className="report-two-print-preview-stage"
            style={{
              width: previewDimensions.logicalWidth || undefined,
              transform: `scale(${previewDimensions.scale})`,
            }}
          >
            <ReportDesignRenderer
              designId={designId}
              template={template}
              activePage={pages[0] || null}
              activePageId={pages[0]?.id || ""}
              context={context}
              previewCase={previewCase}
              renderMode="stack"
              chromeLayout="none"
              onActivePageChange={() => undefined}
              onAddPage={() => undefined}
              onMovePage={() => undefined}
              onDeletePage={() => undefined}
              canMovePage={() => false}
              canDeletePage={() => false}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
