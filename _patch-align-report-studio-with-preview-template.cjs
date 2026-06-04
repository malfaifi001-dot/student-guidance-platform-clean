const fs = require("fs");

const studioPagePath = "app\\dashboard\\reports\\[reportId]\\studio\\page.tsx";
const editorPath = "components\\reports\\report-studio-editor.tsx";
const rendererPath = "components\\report-engine\\design-renderers\\report-design-renderer.tsx";

let studioPage = fs.readFileSync(studioPagePath, "utf8");
let editor = fs.readFileSync(editorPath, "utf8");
let renderer = fs.readFileSync(rendererPath, "utf8");

function replaceNamedFunction(source, functionName, replacement) {
  const needle = "function " + functionName;
  const start = source.indexOf(needle);

  if (start === -1) {
    throw new Error("لم أجد الدالة: " + functionName);
  }

  const braceStart = source.indexOf("{", start);
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

/* =========================================================
   1) studio/page.tsx uses the same builder template as preview/page.tsx
========================================================= */

if (!studioPage.includes("resolveBuilderTemplateForReport")) {
  studioPage = studioPage.replace(
    'import { ReportStudioEditor } from "@/components/reports/report-studio-editor";',
    'import { ReportStudioEditor } from "@/components/reports/report-studio-editor";\nimport { resolveBuilderTemplateForReport } from "@/lib/report-engine/report-builder-template-runtime";'
  );
}

if (!studioPage.includes("const builderTemplateForStudio")) {
  studioPage = studioPage.replace(
    `  if (!report) {
    notFound();
  }

  const parsedEditableContent = parseEditableContent(report.editableContent);`,
    `  if (!report) {
    notFound();
  }

  const builderTemplateForStudio = await resolveBuilderTemplateForReport(report, {
    templateIdOverride: report.templateId,
  });

  const parsedEditableContent = parseEditableContent(report.editableContent);`
  );
}

if (!studioPage.includes("templateSnapshot: builderTemplateForStudio")) {
  studioPage = studioPage.replace(
    `    hasTemplateSnapshot: Boolean(report.templateSnapshot),
    hasReportDataSnapshot: Boolean(report.reportDataSnapshot),
    editableContent: report.editableContent || "",`,
    `    hasTemplateSnapshot: Boolean(builderTemplateForStudio || report.templateSnapshot),
    hasReportDataSnapshot: Boolean(report.reportDataSnapshot),
    templateSnapshot: builderTemplateForStudio
      ? JSON.parse(JSON.stringify(builderTemplateForStudio))
      : report.templateSnapshot
        ? JSON.parse(JSON.stringify(report.templateSnapshot))
        : null,
    reportDataSnapshot: report.reportDataSnapshot
      ? JSON.parse(JSON.stringify(report.reportDataSnapshot))
      : null,
    editableContent: report.editableContent || "",`
  );
}

/* =========================================================
   2) report-studio-editor.tsx: never use renderedContent as fallback
========================================================= */

editor = replaceNamedFunction(
  editor,
  "normalizeTemplateSnapshot",
  String.raw`function normalizeTemplateSnapshot(report: StudioReport) {
  const snapshot =
    report.templateSnapshot?.builderTemplate ||
    report.templateSnapshot?.templateJson ||
    report.templateSnapshot?.smartStudio ||
    report.templateSnapshot ||
    null;

  const pages = Array.isArray(snapshot?.pages)
    ? snapshot.pages.map((page: any, index: number) => ({
        ...page,
        id: String(page.id || \`page-\${index + 1}\`),
        title: String(page.title || \`صفحة \${index + 1}\`),
        kind: page.kind || "content",
        blocks: Array.isArray(page.blocks) ? page.blocks : [],
      }))
    : [];

  if (pages.length) {
    return {
      ...snapshot,
      pages,
    };
  }

  return {
    id: "fallback-template",
    name: report.title,
    designTemplateId: "ministry-form",
    pages: [
      {
        id: "fallback-page",
        title: "صفحة التقرير",
        kind: "content",
        blocks: [
          {
            id: "fallback-empty",
            kind: "section-text",
            title: "لا توجد صفحات محفوظة",
            content:
              "لم يتم العثور على صفحات القالب داخل نسخة التقرير. أعد إنشاء التقرير من قالب منشور.",
            variant: "soft",
            align: "right",
            showTitle: true,
          },
        ],
      },
    ],
  };
}`
);

editor = replaceNamedFunction(
  editor,
  "parseEditableContent",
  String.raw`function parseEditableContent(
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

editor = replaceNamedFunction(
  editor,
  "buildPageOverrides",
  String.raw`function buildPageOverrides(
  pages: TemplatePage[],
  blocks: Record<string, string>,
) {
  const pageOverrides: EditableContentPayload["pageOverrides"] = {};

  for (const page of pages) {
    page.blocks.forEach((block, index) => {
      const blockKey = getBlockKey(page, block, index);
      const content = blocks[blockKey];

      if (!content?.trim() || isLegacyRenderedReportDump(content)) {
        return;
      }

      pageOverrides[page.id] ||= {};
      pageOverrides[page.id][blockKey] = {
        content,
      };
    });
  }

  return pageOverrides;
}`
);

editor = replaceNamedFunction(
  editor,
  "buildRenderedContentFromPages",
  String.raw`function buildRenderedContentFromPages({
  pages,
  blocks,
  context,
}: {
  pages: TemplatePage[];
  blocks: Record<string, string>;
  context: Record<string, string>;
}) {
  return pages
    .map((page) => {
      const blockText = page.blocks
        .map((block, index) => {
          const blockKey = getBlockKey(page, block, index);
          const value = blocks[blockKey]?.trim();

          if (!value || isLegacyRenderedReportDump(value)) return "";

          return \`\${page.title} - \${getBlockTitle(block)}\\n\${renderText(
            value,
            context,
          )}\`;
        })
        .filter(Boolean)
        .join("\\n\\n");

      return blockText;
    })
    .filter(Boolean)
    .join("\\n\\n");
}`
);

/* Make rotateSuggestion use the real rendered block key, not index 0 */
editor = editor.replace(
  `function rotateSuggestion(page: TemplatePage, block: TemplateBlock) {
    const blockKey = getBlockKey(page, block, 0);`,
  `function rotateSuggestion(page: TemplatePage, block: TemplateBlock) {
    const blockIndex = page.blocks.findIndex((item) => item === block);
    const blockKey = getBlockKey(page, block, blockIndex >= 0 ? blockIndex : 0);`
);

/* Ensure sanitizer helpers exist */
if (!editor.includes("function sanitizeInitialBlockOverrides")) {
  const helper = String.raw`
function sanitizeInitialBlockOverrides(
  pages: TemplatePage[],
  blocks: Record<string, string>,
) {
  const allowedKeys = new Set<string>();

  for (const page of pages) {
    page.blocks.forEach((block, index) => {
      if (!isEditableTextBlock(block)) {
        return;
      }

      allowedKeys.add(getBlockKey(page, block, index));

      if (block.id) {
        allowedKeys.add(String(block.id));
      }
    });
  }

  const clean: Record<string, string> = {};

  for (const [key, value] of Object.entries(blocks || {})) {
    if (!allowedKeys.has(key)) {
      continue;
    }

    if (isLegacyRenderedReportDump(value)) {
      continue;
    }

    clean[key] = repairArabicMojibake(value);
  }

  return clean;
}

function flattenEditablePageOverrides(
  pageOverrides: EditableContentPayload["pageOverrides"],
) {
  const blocks: Record<string, string> = {};

  for (const page of Object.values(pageOverrides || {})) {
    for (const [blockKey, override] of Object.entries(page || {})) {
      const content = override?.content || "";

      if (!content.trim() || isLegacyRenderedReportDump(content)) {
        continue;
      }

      blocks[blockKey] = repairArabicMojibake(content);
    }
  }

  return blocks;
}

function isLegacyRenderedReportDump(value: string) {
  const text = String(value || "");

  if (!text.trim()) {
    return false;
  }

  const hasReplacementChars = /�/.test(text);
  const hasMojibakeMarks = /[ØÙÃ]/.test(text);
  const hasReportDumpLabels =
    /program_name\s*:|semester\s*:|gregorian_date\s*:|beneficiaries\s*:|execution_action\s*:|execution_mechanism\s*:|performance_indicator\s*:|selectedStudent\s*:/.test(
      text,
    );

  const hasOldArabicDump =
    text.includes("ملخص التقرير") ||
    text.includes("بيانات الحالة") ||
    text.includes("القيم المسجلة") ||
    text.includes("الشواهد:") ||
    text.includes("تقرير:");

  const tooLongForBlock = text.length > 1200;

  return (
    hasReplacementChars ||
    hasMojibakeMarks ||
    hasReportDumpLabels ||
    (hasOldArabicDump && tooLongForBlock)
  );
}

`;

  editor = editor.replace("function formatDate", helper + "\nfunction formatDate");
}

/* =========================================================
   3) report-design-renderer.tsx: strict block override only by block.id
========================================================= */

renderer = renderer.replace(
  /const editedContent =\s*editorialBlocks\[blockId\] \|\|\s*editorialBlocks\[rawKind\] \|\|\s*editorialBlocks\[block\?\.title\] \|\|\s*"";/,
  `const editedContent = getFinalEditedBlockContent(
    block,
    blockId,
    editorialBlocks,
  );`
);

if (!renderer.includes("function getFinalEditedBlockContent")) {
  const helper = String.raw`
function getFinalEditedBlockContent(
  block: any,
  blockId: string,
  editorialBlocks: Record<string, string>,
) {
  const candidateKeys = [
    blockId,
    block?.id ? String(block.id) : "",
  ].filter(Boolean);

  for (const key of candidateKeys) {
    const value = editorialBlocks[key];

    if (!value || !String(value).trim()) {
      continue;
    }

    if (isFinalLegacyRenderedReportDump(value)) {
      continue;
    }

    return value;
  }

  return "";
}

function isFinalLegacyRenderedReportDump(value: string) {
  const text = String(value || "");

  if (!text.trim()) {
    return false;
  }

  const hasReplacementChars = /�/.test(text);
  const hasMojibakeMarks = /[ØÙÃ]/.test(text);
  const hasReportDumpLabels =
    /program_name\s*:|semester\s*:|gregorian_date\s*:|beneficiaries\s*:|execution_action\s*:|execution_mechanism\s*:|performance_indicator\s*:|selectedStudent\s*:/.test(
      text,
    );

  const hasOldArabicDump =
    text.includes("ملخص التقرير") ||
    text.includes("بيانات الحالة") ||
    text.includes("القيم المسجلة") ||
    text.includes("الشواهد:") ||
    text.includes("تقرير:");

  const tooLongForBlock = text.length > 1200;

  return (
    hasReplacementChars ||
    hasMojibakeMarks ||
    hasReportDumpLabels ||
    (hasOldArabicDump && tooLongForBlock)
  );
}

`;

  renderer = renderer.replace(
    "function resolveFinalBlockContent",
    helper + "\nfunction resolveFinalBlockContent"
  );
}

renderer = renderer.replace(
  `  return (
    block?.content ||
    settings?.content ||
    block?.customContent ||
    block?.defaultContent ||
    ""
  );`,
  `  const candidateContent =
    block?.content ||
    settings?.content ||
    block?.customContent ||
    block?.defaultContent ||
    "";

  return isFinalLegacyRenderedReportDump(candidateContent)
    ? ""
    : candidateContent;`
);

fs.writeFileSync(studioPagePath, studioPage, "utf8");
fs.writeFileSync(editorPath, editor, "utf8");
fs.writeFileSync(rendererPath, renderer, "utf8");

console.log("Studio editor now uses the same template as preview, keeps cover page, and ignores legacy rendered dumps.");
