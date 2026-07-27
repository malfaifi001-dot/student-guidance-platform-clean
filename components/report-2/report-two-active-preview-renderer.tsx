"use client";

import { ReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";

export function ReportTwoActivePreviewRenderer({ template, context, previewCase }: {
  template: any;
  context: Record<string, string>;
  previewCase: any;
}) {
  const pages = Array.isArray(template?.pages) ? template.pages : [];
  const activePage = pages[0] || null;

  return (
    <section className="report-two-a4-host report-two-persisted-active-root">
      <ReportDesignRenderer
        suppressAutoEvidencePages
        renderMode="stack"
        chromeLayout="split"
        designId={template?.designTemplateId || "ministry-form"}
        template={template}
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
