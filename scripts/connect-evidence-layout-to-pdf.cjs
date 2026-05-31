const fs = require("fs");

const rendererPath = "components/report-engine/report-builder-pdf-renderer.tsx";
let renderer = fs.readFileSync(rendererPath, "utf8");

/* 1) Add EvidenceLayoutMode type */
if (!renderer.includes("type EvidenceLayoutMode =")) {
  renderer = renderer.replace(
`type ReportBuilderPdfRendererProps = {`,
`type EvidenceLayoutMode =
  | "auto"
  | "one-per-page"
  | "two-per-page"
  | "grid-2x2"
  | "compact";

type RenderReportPage = ReportTemplateBuilderModel["pages"][number] & {
  evidenceChunk?: RuntimeEvidenceItem[];
  evidencePageNumber?: number;
  evidenceTotalPages?: number;
};

type ReportBuilderPdfRendererProps = {`
  );
}

/* 2) Add prop */
renderer = renderer.replace(
`  editorialBlocks?: Record<string, string>;
};`,
`  editorialBlocks?: Record<string, string>;
  evidenceLayoutMode?: EvidenceLayoutMode;
};`
);

renderer = renderer.replace(
`  editorialBlocks = {},
}: ReportBuilderPdfRendererProps) {`,
`  editorialBlocks = {},
  evidenceLayoutMode = "two-per-page",
}: ReportBuilderPdfRendererProps) {`
);

/* 3) Replace pages const with basePages + expanded evidence pages */
renderer = renderer.replace(
`  const pages = template.pages.length
    ? template.pages
    : [
        {
          id: "fallback-cover",
          title: "غلاف التقرير",
          description: "",
          kind: "cover",
          blocks: [],
        },
      ];

  return (`,
`  const basePages: RenderReportPage[] = template.pages.length
    ? (template.pages as RenderReportPage[])
    : [
        {
          id: "fallback-cover",
          title: "غلاف التقرير",
          description: "",
          kind: "cover",
          blocks: [],
        } as RenderReportPage,
      ];

  const allEvidences = getRuntimeEvidences(previewCaseData);

  const pages: RenderReportPage[] = basePages.flatMap((page) => {
    if (page.kind !== "evidence") {
      return [page];
    }

    const chunks = chunkEvidencesForLayout(allEvidences, evidenceLayoutMode);

    if (!chunks.length) {
      return [
        {
          ...page,
          evidenceChunk: [],
          evidencePageNumber: 1,
          evidenceTotalPages: 1,
        },
      ];
    }

    return chunks.map((chunk, index) => ({
      ...page,
      id: \`\${page.id}-evidence-\${index + 1}\`,
      title:
        chunks.length > 1
          ? \`\${page.title || "الشواهد والمرفقات"} - صفحة \${index + 1}\`
          : page.title,
      evidenceChunk: chunk,
      evidencePageNumber: index + 1,
      evidenceTotalPages: chunks.length,
    }));
  });

  return (`
);

/* 4) Pass evidence chunk and layout to OfficialEvidencePage */
renderer = renderer.replace(
`              <OfficialEvidencePage
                pageTitle={page.title}
                evidences={getRuntimeEvidences(previewCaseData)}
              />`,
`              <OfficialEvidencePage
                pageTitle={page.title}
                evidences={page.evidenceChunk || []}
                evidenceLayoutMode={evidenceLayoutMode}
                pageNumber={page.evidencePageNumber || 1}
                totalPages={page.evidenceTotalPages || 1}
              />`
);

/* 5) Replace OfficialEvidencePage function */
const evidenceStart = renderer.indexOf("function OfficialEvidencePage({");
const evidenceEnd = renderer.indexOf("function OfficialApprovalPage", evidenceStart);

if (evidenceStart === -1 || evidenceEnd === -1) {
  throw new Error("لم أستطع تحديد OfficialEvidencePage داخل renderer.");
}

const newEvidenceFunction = `function OfficialEvidencePage({
  pageTitle,
  evidences,
  evidenceLayoutMode,
  pageNumber,
  totalPages,
}: {
  pageTitle: string;
  evidences: RuntimeEvidenceItem[];
  evidenceLayoutMode: EvidenceLayoutMode;
  pageNumber: number;
  totalPages: number;
}) {
  const layout = getEvidenceLayoutClasses(evidenceLayoutMode);

  return (
    <OfficialPageFrame
      title={pageTitle || "الشواهد والمرفقات"}
      eyebrow={totalPages > 1 ? \`الشواهد - صفحة \${pageNumber} من \${totalPages}\` : "الشواهد"}
    >
      {evidences.length ? (
        <div className={layout.gridClassName}>
          {evidences.map((evidence, index) => {
            const imageUrl = evidence.imageUrl || evidence.fileUrl || "";
            const title =
              evidence.title ||
              evidence.caption ||
              evidence.fileName ||
              \`شاهد \${index + 1}\`;

            return (
              <article
                key={evidence.id || \`\${evidence.fileName}-\${index}\`}
                className="overflow-hidden rounded-xl border border-slate-300 bg-white"
              >
                <div className={layout.imageBoxClassName}>
                  {isImageEvidence(evidence) && imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="px-4 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-xl">
                        📎
                      </div>

                      <span className="mt-3 block text-xs font-black text-slate-500">
                        {evidence.fileName || "مرفق"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 p-3">
                  <p className="line-clamp-2 text-xs font-black leading-6 text-slate-800">
                    {title}
                  </p>

                  {evidence.description || evidence.note ? (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
                      {evidence.description || evidence.note}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          لا توجد شواهد مرتبطة بهذا التقرير.
        </div>
      )}
    </OfficialPageFrame>
  );
}

`;

renderer =
  renderer.slice(0, evidenceStart) +
  newEvidenceFunction +
  renderer.slice(evidenceEnd);

/* 6) Add layout helpers before getRuntimeValues */
if (!renderer.includes("function chunkEvidencesForLayout")) {
  renderer = renderer.replace(
`function getRuntimeValues(`,
`function chunkEvidencesForLayout(
  evidences: RuntimeEvidenceItem[],
  evidenceLayoutMode: EvidenceLayoutMode
) {
  const perPage = getEvidenceItemsPerPage(evidenceLayoutMode, evidences.length);
  const chunks: RuntimeEvidenceItem[][] = [];

  for (let index = 0; index < evidences.length; index += perPage) {
    chunks.push(evidences.slice(index, index + perPage));
  }

  return chunks;
}

function getEvidenceItemsPerPage(
  evidenceLayoutMode: EvidenceLayoutMode,
  total: number
) {
  if (evidenceLayoutMode === "one-per-page") return 1;
  if (evidenceLayoutMode === "two-per-page") return 2;
  if (evidenceLayoutMode === "grid-2x2") return 4;
  if (evidenceLayoutMode === "compact") return 6;

  if (total <= 1) return 1;
  if (total <= 2) return 2;
  if (total <= 4) return 4;

  return 4;
}

function getEvidenceLayoutClasses(evidenceLayoutMode: EvidenceLayoutMode) {
  if (evidenceLayoutMode === "one-per-page") {
    return {
      gridClassName: "grid grid-cols-1 gap-4",
      imageBoxClassName: "flex h-[170mm] items-center justify-center bg-slate-100",
    };
  }

  if (evidenceLayoutMode === "two-per-page") {
    return {
      gridClassName: "grid grid-cols-1 gap-4",
      imageBoxClassName: "flex h-[74mm] items-center justify-center bg-slate-100",
    };
  }

  if (evidenceLayoutMode === "compact") {
    return {
      gridClassName: "grid grid-cols-2 gap-3",
      imageBoxClassName: "flex h-[42mm] items-center justify-center bg-slate-100",
    };
  }

  return {
    gridClassName: "grid grid-cols-2 gap-4",
    imageBoxClassName: "flex h-[58mm] items-center justify-center bg-slate-100",
  };
}

function getRuntimeValues(`
  );
}

fs.writeFileSync(rendererPath, renderer, "utf8");

/* 7) Patch preview page: read evidenceLayout and pass to renderer */
const previewPath = "app/dashboard/reports/[reportId]/preview/page.tsx";
let preview = fs.readFileSync(previewPath, "utf8");

if (!preview.includes("function normalizeEvidenceLayoutMode")) {
  preview += `

function normalizeEvidenceLayoutMode(value?: string | null) {
  if (
    value === "auto" ||
    value === "one-per-page" ||
    value === "two-per-page" ||
    value === "grid-2x2" ||
    value === "compact"
  ) {
    return value;
  }

  return "two-per-page";
}
`;
}

if (!preview.includes("const evidenceLayoutMode = normalizeEvidenceLayoutMode")) {
  preview = preview.replace(
`  const resolvedSearchParams = searchParams ? await searchParams : {};`,
`  const resolvedSearchParams = searchParams ? await searchParams : {};
  const evidenceLayoutMode = normalizeEvidenceLayoutMode(
    resolvedSearchParams.evidenceLayout
  );`
  );
}

preview = preview.replace(
`            editorialBlocks={parsedEditableContent.blocks || {}}
          />`,
`            editorialBlocks={parsedEditableContent.blocks || {}}
            evidenceLayoutMode={evidenceLayoutMode}
          />`
);

fs.writeFileSync(previewPath, preview, "utf8");

console.log("تم ربط evidenceLayout فعليًا داخل معاينة وPDF التقرير.");
