const fs = require("fs");

const rendererPath = "components\\report-engine\\design-renderers\\report-design-renderer.tsx";
const previewPath = "app\\dashboard\\reports\\[reportId]\\preview\\page.tsx";

let renderer = fs.readFileSync(rendererPath, "utf8");
let preview = fs.readFileSync(previewPath, "utf8");

/* 1) تأكد أن كل صفحات A4 في محرك التصاميم تحمل pdf-report-page للتصدير */
renderer = renderer.replaceAll(
  'className="mx-auto min-h-[297mm]',
  'className="pdf-report-page mx-auto min-h-[297mm]'
);

renderer = renderer.replaceAll(
  'className="pdf-report-page pdf-report-page',
  'className="pdf-report-page'
);

/* 2) إضافة Renderer نهائي يستخدم نفس محرك التصاميم بدون أزرار الاستديو */
if (!renderer.includes("export function FinalReportDesignRenderer")) {
  const insertBefore = "function A4DesignPage({";

  const finalRenderer = String.raw`
export function FinalReportDesignRenderer({
  template,
  previewCaseData,
  editorialBlocks = {},
  identity = {},
}: {
  template: any;
  previewCaseData: PreviewCaseData | null;
  editorialBlocks?: Record<string, string>;
  identity?: Record<string, any>;
}) {
  const selectedDesign = normalizeDesignId(
    template?.designTemplateId || template?.designTheme || "ministry-form",
  );

  const normalizedTemplate = normalizeFinalReportTemplate(
    template,
    editorialBlocks,
  );

  const context = buildFinalReportContext(previewCaseData, identity);

  const pages = normalizedTemplate.pages?.length
    ? normalizedTemplate.pages
    : [
        {
          id: "final-preview-fallback",
          title: normalizedTemplate.name || "التقرير",
          kind: "content",
          blocks: [
            {
              id: "fallback-title",
              kind: "hero-title",
              title: "عنوان التقرير",
              content: "{{case.title}}",
              variant: "hero",
              align: "center",
              showTitle: false,
              placement: "flow",
            },
            {
              id: "fallback-fields",
              kind: "dynamic-fields",
              title: "بيانات الحالة",
              content: "",
              variant: "card",
              align: "right",
              showTitle: true,
              placement: "flow",
            },
          ],
        },
      ];

  return (
    <section className="space-y-4 bg-transparent print:space-y-0" dir="rtl">
      {pages.map((page: any) => (
        <div key={page.id} className="break-after-page print:break-after-page">
          <A4DesignPage
            designId={selectedDesign}
            page={page}
            context={context}
            previewCase={previewCaseData}
            pageLabel={page.title || normalizedTemplate.name || "التقرير"}
          />

          <AutoEvidencePages
            designId={selectedDesign}
            activePage={page}
            context={context}
            previewCase={previewCaseData}
          />
        </div>
      ))}
    </section>
  );
}

function normalizeFinalReportTemplate(
  template: any,
  editorialBlocks: Record<string, string>,
) {
  const pages = Array.isArray(template?.pages) ? template.pages : [];

  return {
    ...template,
    pages: pages.map((page: any, pageIndex: number) => {
      const pageBlocks = Array.isArray(page?.blocks) ? page.blocks : [];

      const normalizedBlocks = pageBlocks.map((block: any, blockIndex: number) =>
        normalizeFinalReportBlock(block, blockIndex, editorialBlocks),
      );

      const shouldAddEvidenceBlock =
        page?.kind === "evidence" &&
        !normalizedBlocks.some((block: any) => block.kind === "evidence-gallery");

      return {
        ...page,
        id: page?.id || "final-page-" + (pageIndex + 1),
        title: page?.title || "صفحة " + (pageIndex + 1),
        kind: page?.kind || "content",
        blocks: shouldAddEvidenceBlock
          ? [
              ...normalizedBlocks,
              {
                id: "auto-evidence-gallery-" + (pageIndex + 1),
                kind: "evidence-gallery",
                title: "الشواهد والمرفقات",
                content: "",
                variant: "card",
                align: "right",
                showTitle: true,
                placement: "flow",
                evidenceLayout: "GRID_2X2",
                evidenceFit: "contain",
                evidenceAspectRatio: "LANDSCAPE_4_3",
                evidenceShowCaptions: true,
                evidenceAutoCreatePages: true,
                evidenceEmptyBehavior: "message",
              },
            ]
          : normalizedBlocks,
      };
    }),
  };
}

function normalizeFinalReportBlock(
  block: any,
  index: number,
  editorialBlocks: Record<string, string>,
) {
  const settings = block?.settings || {};
  const smartKind =
    settings.smartBlockKind ||
    block?.smartBlockKind ||
    block?.kind ||
    "section-text";

  const blockId = block?.id || "final-block-" + (index + 1);

  const editedContent =
    editorialBlocks[blockId] ||
    editorialBlocks[smartKind] ||
    editorialBlocks[block?.title] ||
    "";

  return {
    ...block,
    id: blockId,
    kind: smartKind,
    title: block?.title || settings.title || "بلوك التقرير",
    content:
      editedContent ||
      block?.content ||
      settings.content ||
      block?.defaultContent ||
      "",
    variant: block?.variant || settings.style || "card",
    align: block?.align || settings.align || "right",
    showTitle:
      typeof block?.showTitle === "boolean"
        ? block.showTitle
        : settings.showTitle !== false,
    showMeta:
      typeof block?.showMeta === "boolean"
        ? block.showMeta
        : settings.showMeta !== false,
    placement: block?.placement || settings.placement || "flow",
    snippetId: block?.snippetId || settings.snippetId || null,

    evidenceLayout:
      block?.evidenceLayout || settings.evidenceLayout || "GRID_2X2",
    evidenceFit: block?.evidenceFit || settings.evidenceFit || "contain",
    evidenceAspectRatio:
      block?.evidenceAspectRatio ||
      settings.evidenceAspectRatio ||
      "LANDSCAPE_4_3",
    evidenceShowCaptions:
      typeof block?.evidenceShowCaptions === "boolean"
        ? block.evidenceShowCaptions
        : settings.evidenceShowCaptions !== false,
    evidenceAutoCreatePages:
      typeof block?.evidenceAutoCreatePages === "boolean"
        ? block.evidenceAutoCreatePages
        : settings.evidenceAutoCreatePages !== false,
    evidenceEmptyBehavior:
      block?.evidenceEmptyBehavior ||
      settings.evidenceEmptyBehavior ||
      "message",
  };
}

function buildFinalReportContext(
  previewCaseData: PreviewCaseData | null,
  identity: Record<string, any>,
) {
  const context: Record<string, string> = {
    "case.id": previewCaseData?.caseId || "",
    "case.title": previewCaseData?.title || "تقرير رسمي",
    "case.status": previewCaseData?.status || "",
    "case.createdAt": formatFinalDate(previewCaseData?.createdAt),
    "case.updatedAt": formatFinalDate(previewCaseData?.updatedAt),

    "service.name": previewCaseData?.serviceName || "",
    "service.slug": previewCaseData?.serviceSlug || "",

    "student.name": previewCaseData?.student?.name || "",
    "student.grade": previewCaseData?.student?.grade || "",
    "student.classroom": previewCaseData?.student?.classroom || "",
    "student.stage": previewCaseData?.student?.stage || "",
    "student.guardianName": previewCaseData?.student?.guardianName || "",
    "student.guardianPhone": previewCaseData?.student?.guardianPhone || "",

    "identity.schoolName": identity.schoolName || "",
    "identity.counselorName": identity.counselorName || "",
    "identity.principalName":
      identity.principalName || identity.schoolLeaderName || "",
    "identity.educationDepartment": identity.educationDepartment || "",
    "identity.educationOffice": identity.educationOffice || "",
    "identity.academicYear": identity.academicYear || "",
    "identity.semester": identity.semester || "",

    "evidence.count": String(previewCaseData?.evidences?.length || 0),
  };

  for (const value of previewCaseData?.values || []) {
    const key = value.fieldKey || "";
    const label = value.fieldLabel || "";

    if (key) {
      context["field." + key] = value.value || "";
    }

    if (label) {
      context["field." + label] = value.value || "";
    }
  }

  return context;
}

function formatFinalDate(value?: string | null) {
  if (!value) {
    return new Date().toLocaleDateString("ar-SA");
  }

  try {
    return new Date(value).toLocaleDateString("ar-SA");
  } catch {
    return String(value);
  }
}

`;

  renderer = renderer.replace(insertBefore, finalRenderer + "\n" + insertBefore);
}

/* 3) ربط صفحة المعاينة النهائية بالـ FinalReportDesignRenderer */
if (!preview.includes("FinalReportDesignRenderer")) {
  preview = preview.replace(
    'import { ReportBuilderPdfRenderer } from "@/components/report-engine/report-builder-pdf-renderer";',
    'import { ReportBuilderPdfRenderer } from "@/components/report-engine/report-builder-pdf-renderer";\nimport { FinalReportDesignRenderer } from "@/components/report-engine/design-renderers/report-design-renderer";'
  );
}

preview = preview.replace(
`        {builderTemplate ? (
          <ReportBuilderPdfRenderer
            template={builderTemplate}
            previewCaseData={builderPreviewCaseData as any}
            identity={runtimeReportIdentity}
            editorialBlocks={parsedEditableContent.blocks || {}}
            evidenceLayoutMode={evidenceLayoutMode}
          />
        ) : (`,
`        {builderTemplate ? (
          <FinalReportDesignRenderer
            template={builderTemplate as any}
            previewCaseData={builderPreviewCaseData as any}
            identity={runtimeReportIdentity as any}
            editorialBlocks={parsedEditableContent.blocks || {}}
          />
        ) : (`
);

fs.writeFileSync(rendererPath, renderer, "utf8");
fs.writeFileSync(previewPath, preview, "utf8");

console.log("Final report preview now uses the independent design renderer.");
