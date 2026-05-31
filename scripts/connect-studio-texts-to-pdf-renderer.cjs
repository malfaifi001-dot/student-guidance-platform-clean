const fs = require("fs");

const rendererPath = "components/report-engine/report-builder-pdf-renderer.tsx";
let renderer = fs.readFileSync(rendererPath, "utf8");

/* 1) Add editorialBlocks prop */
renderer = renderer.replace(
`type ReportBuilderPdfRendererProps = {
  template: ReportTemplateBuilderModel;
  previewCaseData: RuntimePreviewCaseData | null;
  identity: ReportIdentity;
};`,
`type ReportBuilderPdfRendererProps = {
  template: ReportTemplateBuilderModel;
  previewCaseData: RuntimePreviewCaseData | null;
  identity: ReportIdentity;
  editorialBlocks?: Record<string, string>;
};`
);

renderer = renderer.replace(
`export function ReportBuilderPdfRenderer({
  template,
  previewCaseData,
  identity,
}: ReportBuilderPdfRendererProps) {`,
`export function ReportBuilderPdfRenderer({
  template,
  previewCaseData,
  identity,
  editorialBlocks = {},
}: ReportBuilderPdfRendererProps) {`
);

renderer = renderer.replace(
`                previewCaseData={previewCaseData}
              />`,
`                previewCaseData={previewCaseData}
                editorialBlocks={editorialBlocks}
              />`
);

renderer = renderer.replace(
`function OfficialContentPage({
  pageTitle,
  blocks,
  template,
  previewCaseData,
}: {
  pageTitle: string;
  blocks: ReportTemplateBlock[];
  template: ReportTemplateBuilderModel;
  previewCaseData: RuntimePreviewCaseData | null;
}) {`,
`function OfficialContentPage({
  pageTitle,
  blocks,
  template,
  previewCaseData,
  editorialBlocks = {},
}: {
  pageTitle: string;
  blocks: ReportTemplateBlock[];
  template: ReportTemplateBuilderModel;
  previewCaseData: RuntimePreviewCaseData | null;
  editorialBlocks?: Record<string, string>;
}) {`
);

renderer = renderer.replace(
`  return (
    <OfficialPageFrame title={pageTitle} eyebrow={getServiceName(template, previewCaseData)}>
      <div className="space-y-5">
        {printableBlocks.length ? (`,
`  const editorialSections = getEditorialSectionsForPage(pageTitle, editorialBlocks);

  return (
    <OfficialPageFrame title={pageTitle} eyebrow={getServiceName(template, previewCaseData)}>
      <div className="space-y-5">
        {editorialSections.map((section) => (
          <OfficialSection key={section.key} title={section.title}>
            <p className="whitespace-pre-line text-sm leading-8 text-slate-700">
              {section.content}
            </p>
          </OfficialSection>
        ))}

        {printableBlocks.length ? (`
);

/* 2) Insert helper before OfficialBlock */
renderer = renderer.replace(
`function OfficialBlock({`,
`function getEditorialSectionsForPage(
  pageTitle: string,
  editorialBlocks: Record<string, string>
) {
  const normalizedTitle = pageTitle || "";

  const sections: Array<{
    key: string;
    title: string;
    content: string;
  }> = [];

  function add(key: string, title: string) {
    const content = editorialBlocks[key]?.trim();

    if (content) {
      sections.push({
        key,
        title,
        content,
      });
    }
  }

  if (
    normalizedTitle.includes("ملخص") ||
    normalizedTitle.includes("محتوى") ||
    normalizedTitle.includes("تقرير")
  ) {
    add("intro", "مقدمة التقرير");
    add("goals", "الأهداف");
    add("procedures", "الإجراءات");
  }

  if (
    normalizedTitle.includes("نتائج") ||
    normalizedTitle.includes("ملخص") ||
    normalizedTitle.includes("محتوى")
  ) {
    add("results", "النتائج");
    add("recommendations", "التوصيات");
    add("closingNotes", "ملاحظات ختامية");
  }

  return sections;
}

function OfficialBlock({`
);

fs.writeFileSync(rendererPath, renderer, "utf8");

/* 3) Pass editable blocks from preview page into official renderer */
const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

preview = preview.replace(
`            previewCaseData={builderPreviewCaseData as any}
            identity={identity}
          />`,
`            previewCaseData={builderPreviewCaseData as any}
            identity={identity}
            editorialBlocks={parsedEditableContent.blocks || {}}
          />`
);

fs.writeFileSync(previewPath, preview, "utf8");

console.log("تم ربط نصوص Studio داخل المعاينة الرسمية وPDF.");
