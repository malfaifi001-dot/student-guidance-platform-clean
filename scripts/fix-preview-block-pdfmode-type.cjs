const fs = require("fs");

const path = "components/report-engine/report-template-live-preview.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
`function PreviewBlock({
  block,
  template,
  snippets,
  previewCaseData,
}: {
  block: ReportTemplateBlock;
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  previewCaseData: RuntimePreviewCaseData | null;
}) {`,
`function PreviewBlock({
  block,
  template,
  snippets,
  previewCaseData,
  pdfMode = false,
}: {
  block: ReportTemplateBlock;
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  previewCaseData: RuntimePreviewCaseData | null;
  pdfMode?: boolean;
}) {`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إصلاح نوع PreviewBlock لقبول pdfMode.");
