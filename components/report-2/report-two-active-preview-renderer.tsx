"use client";

import { useMemo } from "react";
import { ReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";
import { isReportDesignId } from "@/components/report-engine/design-renderers/report-design-registry";
import { applyStructuredTableDisplayMetadataToTemplate } from "@/lib/report-engine/report-structured-table-display";
import {
  OFFICIAL_ACTIVITY_CARD_VARIANT_ID,
  ReportTwoOfficialActivitySignatureStyle,
} from "@/components/report-2/report-two-official-activity-signature-style";

export function ReportTwoActivePreviewRenderer({ template, context, previewCase, sourcePayload, variantId }: {
  template: any;
  context: Record<string, string>;
  previewCase: any;
  sourcePayload?: unknown;
  variantId?: string | null;
}) {
  const displayTemplate = useMemo(
    () => applyStructuredTableDisplayMetadataToTemplate(template, sourcePayload),
    [template, sourcePayload],
  ) as any;
  const pages = Array.isArray(displayTemplate?.pages) ? displayTemplate.pages : [];
  const activePage = pages[0] || null;
  const designId = isReportDesignId(displayTemplate?.designTemplateId)
    ? displayTemplate.designTemplateId
    : null;

  if (!designId) {
    return (
      <section className="p-8 text-center font-bold text-red-700" dir="rtl">
        تعذر تحديد تصميم التقرير المحفوظ.
      </section>
    );
  }

  return (
    <section
      className={[
        "report-two-a4-host report-two-persisted-active-root",
        variantId === OFFICIAL_ACTIVITY_CARD_VARIANT_ID
          ? "report-two-official-activity-card"
          : "",
      ].join(" ")}
    >
      <ReportTwoOfficialActivitySignatureStyle
        enabled={variantId === OFFICIAL_ACTIVITY_CARD_VARIANT_ID}
      />
      <ReportDesignRenderer
        renderMode="stack"
        chromeLayout="split"
        designId={designId}
        template={displayTemplate}
        activePage={activePage}
        activePageId={activePage?.id || ""}
        context={context || {}}
        previewCase={previewCase || null}
        onActivePageChange={() => undefined}
        onAddPage={() => undefined}
        onMovePage={() => undefined}
        onDeletePage={() => undefined}
        canMovePage={() => false}
        canDeletePage={() => false}
      />
    </section>
  );
}
