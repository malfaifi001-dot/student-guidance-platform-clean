"use client";

import { useMemo } from "react";
import { ReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";
import { applyStructuredTableDisplayMetadataToTemplate } from "@/lib/report-engine/report-structured-table-display";

export function ReportTwoActivePreviewRenderer({ template, context, previewCase, sourcePayload }: {
  template: any;
  context: Record<string, string>;
  previewCase: any;
  sourcePayload?: unknown;
}) {
  const displayTemplate = useMemo(
    () => applyStructuredTableDisplayMetadataToTemplate(template, sourcePayload),
    [template, sourcePayload],
  ) as any;
  const pages = Array.isArray(displayTemplate?.pages) ? displayTemplate.pages : [];
  const activePage = pages[0] || null;

  return (
    <section className="report-two-a4-host report-two-persisted-active-root">
      <ReportDesignRenderer
        suppressAutoEvidencePages
        renderMode="stack"
        chromeLayout="split"
        designId={displayTemplate?.designTemplateId || "ministry-form"}
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
