const fs = require("fs");

const path = "components/report-engine/report-template-live-preview.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `                      previewCaseData={previewCaseData}
                    />`,
  `                      previewCaseData={previewCaseData}
                      pdfMode={pdfMode}
                    />`
);

content = content.replace(
  `}: {
  block: ReportTemplateBlock;
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  previewCaseData: RuntimePreviewCaseData | null;
}) {`,
  `  pdfMode = false,
}: {
  block: ReportTemplateBlock;
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  previewCaseData: RuntimePreviewCaseData | null;
  pdfMode?: boolean;
}) {`
);

content = content.replace(
  `  if (block.kind === "service-summary") {
    return (`,
  `  if (block.kind === "service-summary" && pdfMode) {
    return null;
  }

  if (block.kind === "service-summary") {
    return (`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم إخفاء بلوك service-summary من PDF وتم تمرير pdfMode للبلوكات.");
