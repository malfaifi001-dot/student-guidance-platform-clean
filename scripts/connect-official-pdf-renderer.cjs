const fs = require("fs");

const path = "app/dashboard/reports/[reportId]/preview/page.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("report-builder-pdf-renderer")) {
  content = content.replace(
    `import { ReportTemplateLivePreview } from "@/components/report-engine/report-template-live-preview";`,
    `import { ReportTemplateLivePreview } from "@/components/report-engine/report-template-live-preview";
import { ReportBuilderPdfRenderer } from "@/components/report-engine/report-builder-pdf-renderer";
import { ReportPdfGuidanceCard } from "@/components/reports/report-pdf-guidance-card";`
  );
}

if (!content.includes("const pdfPreviewUrl =")) {
  content = content.replace(
    `  const pdfExportUrl = \`/api/dashboard/reports/\${report.id}/export/pdf?template=\${encodeURIComponent(
    resolvedSearchParams.template || report.templateId || ""
  )}&evidenceLayout=\${encodeURIComponent(
    selectedEvidenceLayout
  )}&cover=\${encodeURIComponent(String(showCover))}&view=\${encodeURIComponent(
    selectedViewMode
  )}\`;`,
    `  const pdfExportUrl = \`/api/dashboard/reports/\${report.id}/export/pdf?template=\${encodeURIComponent(
    resolvedSearchParams.template || report.templateId || ""
  )}&evidenceLayout=\${encodeURIComponent(
    selectedEvidenceLayout
  )}&cover=\${encodeURIComponent(String(showCover))}&view=\${encodeURIComponent(
    selectedViewMode
  )}\`;

  const pdfPreviewUrl = \`/dashboard/reports/\${report.id}/preview?template=\${encodeURIComponent(
    resolvedSearchParams.template || report.templateId || ""
  )}&evidenceLayout=\${encodeURIComponent(
    selectedEvidenceLayout
  )}&cover=\${encodeURIComponent(String(showCover))}&view=\${encodeURIComponent(
    selectedViewMode
  )}&studio=true&pdf=true\`;`
  );
}

content = content.replace(
  `      {!studioMode ? (
        <div className="no-print mx-auto mb-4 flex max-w-[260mm] justify-end">
          <a
            href={pdfExportUrl}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-slate-800"
          >
            تحميل PDF
          </a>
        </div>
      ) : null}`,
  `      {!studioMode ? (
        <>
          <ReportPdfGuidanceCard
            pdfPreviewUrl={pdfPreviewUrl}
            pdfDownloadUrl={pdfExportUrl}
          />

          <div className="no-print mx-auto mb-4 flex max-w-[260mm] flex-wrap justify-end gap-3">
            <a
              href={pdfPreviewUrl}
              target="_blank"
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-800"
            >
              معاينة PDF
            </a>

            <a
              href={pdfExportUrl}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-slate-800"
            >
              تحميل PDF
            </a>
          </div>
        </>
      ) : null}`
);

content = content.replace(
  `        {builderTemplate ? (
          <ReportTemplateLivePreview
            template={builderTemplate}
            snippets={[]}
            previewCaseData={builderPreviewCaseData as any}
            pdfMode={pdfMode}
          />
        ) : (`,
  `        {builderTemplate && pdfMode ? (
          <ReportBuilderPdfRenderer
            template={builderTemplate}
            previewCaseData={builderPreviewCaseData as any}
            identity={identity}
          />
        ) : builderTemplate ? (
          <ReportTemplateLivePreview
            template={builderTemplate}
            snippets={[]}
            previewCaseData={builderPreviewCaseData as any}
            pdfMode={false}
          />
        ) : (`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم ربط Official PDF Renderer وإضافة بطاقة إرشاد للموجه.");
