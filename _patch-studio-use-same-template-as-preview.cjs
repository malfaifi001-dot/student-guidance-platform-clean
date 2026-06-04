const fs = require("fs");

const previewPath = "app\\dashboard\\reports\\[reportId]\\preview\\page.tsx";
const studioPath = "app\\dashboard\\reports\\[reportId]\\studio\\page.tsx";
const editorPath = "components\\reports\\report-studio-editor.tsx";

let preview = fs.readFileSync(previewPath, "utf8");
let studio = fs.readFileSync(studioPath, "utf8");
let editor = fs.readFileSync(editorPath, "utf8");

function replaceNamedFunction(source, functionName, replacement) {
  const needle = "function " + functionName;
  const start = source.indexOf(needle);

  if (start === -1) {
    throw new Error("لم أجد الدالة: " + functionName);
  }

  const braceStart = source.indexOf("{", start);

  if (braceStart === -1) {
    throw new Error("لم أجد بداية الدالة: " + functionName);
  }

  let depth = 0;
  let end = -1;

  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") depth += 1;

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error("لم أستطع تحديد نهاية الدالة: " + functionName);
  }

  return source.slice(0, start) + replacement + source.slice(end);
}

function removeNamedFunction(source, functionName) {
  const needle = "function " + functionName;
  const start = source.indexOf(needle);

  if (start === -1) {
    return source;
  }

  const braceStart = source.indexOf("{", start);

  if (braceStart === -1) {
    return source;
  }

  let depth = 0;
  let end = -1;

  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") depth += 1;

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  if (end === -1) {
    return source;
  }

  while (source[end] === "\n" || source[end] === "\r") {
    end += 1;
  }

  return source.slice(0, start) + source.slice(end);
}

/* =========================================================
   1) Preview: pass the same selected template to studio
========================================================= */

preview = preview.replace(
  /const editReportUrl = `\/dashboard\/reports\/\$\{report\.id\}\/studio`;?/,
  'const editReportUrl = `/dashboard/reports/${report.id}/studio?template=${encodeURIComponent(resolvedSearchParams.template || report.templateId || "")}`;'
);

/* =========================================================
   2) Studio page: accept searchParams.template and use same resolver
========================================================= */

if (!studio.includes("resolveBuilderTemplateForReport")) {
  studio = studio.replace(
    'import { ReportStudioEditor } from "@/components/reports/report-studio-editor";',
    'import { ReportStudioEditor } from "@/components/reports/report-studio-editor";\nimport { resolveBuilderTemplateForReport } from "@/lib/report-engine/report-builder-template-runtime";'
  );
}

studio = studio.replace(
  /type PageProps = \{\s*params: Promise<\{\s*reportId: string;\s*\}>;\s*\};/,
  `type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<{
    template?: string;
  }>;
};`
);

studio = studio.replace(
  /export default async function ReportStudioPage\(\{ params \}: PageProps\)/,
  "export default async function ReportStudioPage({ params, searchParams }: PageProps)"
);

if (!studio.includes("const resolvedSearchParams = searchParams ? await searchParams : {};")) {
  studio = studio.replace(
    "  const { reportId } = await params;",
    `  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};`
  );
}

if (studio.includes("const builderTemplateForStudio")) {
  studio = studio.replace(
    /const builderTemplateForStudio = await resolveBuilderTemplateForReport\([\s\S]*?\);\s*\n/,
    ""
  );
}

studio = studio.replace(
  `  const parsedEditableContent = parseEditableContent(report.editableContent);`,
  `  const templateIdOverride =
    resolvedSearchParams.template || report.templateId || "";

  const builderTemplateForStudio = await resolveBuilderTemplateForReport(report, {
    templateIdOverride,
  });

  const parsedEditableContent = parseEditableContent(report.editableContent);`
);

studio = studio.replace(
  /templateId:\s*report\.templateId,\s*hasTemplateSnapshot:[\s\S]*?editableContent:/,
  `templateId: templateIdOverride || report.templateId,
    hasTemplateSnapshot: Boolean(builderTemplateForStudio || report.templateSnapshot),
    hasReportDataSnapshot: Boolean(report.reportDataSnapshot),
    templateSnapshot: builderTemplateForStudio
      ? JSON.parse(JSON.stringify(builderTemplateForStudio))
      : report.templateSnapshot
        ? JSON.parse(JSON.stringify(report.templateSnapshot))
        : null,
    reportDataSnapshot: report.reportDataSnapshot
      ? JSON.parse(JSON.stringify(report.reportDataSnapshot))
      : null,
    editableContent:`
);

/* =========================================================
   3) Editor: robust template pages extraction, no rendered fallback
========================================================= */

editor = removeNamedFunction(editor, "pickReportTemplateSnapshot");
editor = removeNamedFunction(editor, "extractReportTemplatePages");

editor = replaceNamedFunction(
  editor,
  "normalizeTemplateSnapshot",
  `function pickReportTemplateSnapshot(source: any) {
  if (!source) {
    return null;
  }

  if (Array.isArray(source.pages)) {
    return source;
  }

  if (Array.isArray(source.smartStudio?.pages)) {
    return source.smartStudio;
  }

  if (Array.isArray(source.templateJson?.pages)) {
    return source.templateJson;
  }

  if (Array.isArray(source.templateJson?.smartStudio?.pages)) {
    return source.templateJson.smartStudio;
  }

  if (Array.isArray(source.builderTemplate?.pages)) {
    return source.builderTemplate;
  }

  if (Array.isArray(source.snapshot?.pages)) {
    return source.snapshot;
  }

  return source;
}

function extractReportTemplatePages(snapshot: any): TemplatePage[] {
  const candidates = [
    snapshot?.pages,
    snapshot?.smartStudio?.pages,
    snapshot?.templateJson?.pages,
    snapshot?.templateJson?.smartStudio?.pages,
    snapshot?.builderTemplate?.pages,
    snapshot?.snapshot?.pages,
  ];

  const pagesCandidate = candidates.find((item) => Array.isArray(item));

  if (!Array.isArray(pagesCandidate)) {
    return [];
  }

  return pagesCandidate.map((page: any, index: number) => ({
    ...page,
    id: String(page?.id || "page-" + (index + 1)),
    title: String(page?.title || "صفحة " + (index + 1)),
    kind: page?.kind || "content",
    blocks: Array.isArray(page?.blocks) ? page.blocks : [],
  }));
}

function normalizeTemplateSnapshot(report: StudioReport) {
  const source =
    report.templateSnapshot?.builderTemplate ||
    report.templateSnapshot?.templateJson ||
    report.templateSnapshot?.smartStudio ||
    report.templateSnapshot ||
    null;

  const snapshot = pickReportTemplateSnapshot(source);
  const pages = extractReportTemplatePages(snapshot);

  if (pages.length) {
    return {
      ...(snapshot || {}),
      pages,
    };
  }

  return {
    id: "missing-template-pages",
    name: report.title,
    designTemplateId: "ministry-form",
    pages: [
      {
        id: "missing-template-pages",
        title: "لم يتم العثور على صفحات القالب",
        kind: "content",
        blocks: [],
      },
    ],
  };
}`
);

editor = replaceNamedFunction(
  editor,
  "parseEditableContent",
  `function parseEditableContent(
  editableContent?: string | null,
  _renderedContent?: string | null,
): EditableContentPayload {
  const content = editableContent?.trim();

  if (!content) {
    return {
      blocks: {},
      workflowValueOverrides: [],
      evidenceLayoutMode: "two-per-page",
    };
  }

  try {
    const parsed = JSON.parse(content) as EditableContentPayload;
    const pageBlocks = flattenEditablePageOverrides(parsed.pageOverrides || {});
    const rawBlocks = parsed.blocks || {};

    return {
      ...parsed,
      blocks: {
        ...rawBlocks,
        ...pageBlocks,
      },
      pageOverrides: parsed.pageOverrides || {},
      workflowValueOverrides: Array.isArray(parsed.workflowValueOverrides)
        ? parsed.workflowValueOverrides
        : [],
      evidenceLayoutMode: parsed.evidenceLayoutMode || "two-per-page",
    };
  } catch {
    return {
      blocks: {},
      workflowValueOverrides: [],
      evidenceLayoutMode: "two-per-page",
    };
  }
}`
);

/* If fallback page has zero blocks, do not show weird editable block */
editor = editor.replace(
  `const [activePageId, setActivePageId] = useState(
    pages[0]?.id || "fallback-page",
  );`,
  `const [activePageId, setActivePageId] = useState(
    pages[0]?.id || "missing-template-pages",
  );`
);

fs.writeFileSync(previewPath, preview, "utf8");
fs.writeFileSync(studioPath, studio, "utf8");
fs.writeFileSync(editorPath, editor, "utf8");

console.log("Studio now receives the same template runtime as preview and extracts template pages robustly.");
