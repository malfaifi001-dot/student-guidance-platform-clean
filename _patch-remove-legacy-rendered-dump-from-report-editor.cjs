const fs = require("fs");

const editorPath = "components\\reports\\report-studio-editor.tsx";
const rendererPath = "components\\report-engine\\design-renderers\\report-design-renderer.tsx";

let editor = fs.readFileSync(editorPath, "utf8");
let renderer = fs.readFileSync(rendererPath, "utf8");

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

/* =========================================================
   1) Report Studio Editor: لا تعرض renderedContent القديم أبدًا
========================================================= */

editor = editor.replace(
/const \[blockOverrides, setBlockOverrides\] = useState<Record<string, string>>\(\s*parsed\.blocks \|\| {},\s*\);/,
`const [blockOverrides, setBlockOverrides] = useState<Record<string, string>>(() =>
    sanitizeInitialBlockOverrides(pages, parsed.blocks || {}),
  );`
);

editor = editor.replace(
/const cleanBlockOverrides = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[blockOverrides\]\);/,
`const cleanBlockOverrides = useMemo(() => {
    const sanitized = sanitizeInitialBlockOverrides(pages, blockOverrides);
    const clean: Record<string, string> = {};

    for (const [key, value] of Object.entries(sanitized)) {
      const text = value.trim();

      if (text && !isLegacyRenderedReportDump(text)) {
        clean[key] = value;
      }
    }

    return clean;
  }, [pages, blockOverrides]);`
);

editor = editor.replace(
`const currentText =
                      blockOverrides[blockKey] !== undefined
                        ? blockOverrides[blockKey]
                        : automaticText;`,
`const overrideText = blockOverrides[blockKey];
                    const currentText =
                      overrideText !== undefined && !isLegacyRenderedReportDump(overrideText)
                        ? overrideText
                        : automaticText;`
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

  const tooLongForBlock = text.length > 1800;

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
   2) Final Renderer: لا تطبق overrides قديمة على البلوكات
========================================================= */

renderer = renderer.replace(
/const editedContent =\s*editorialBlocks\[blockId\] \|\|\s*editorialBlocks\[smartKind\] \|\|\s*editorialBlocks\[block\?\.title\] \|\|\s*"";/,
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

  const tooLongForBlock = text.length > 1800;

  return (
    hasReplacementChars ||
    hasMojibakeMarks ||
    hasReportDumpLabels ||
    (hasOldArabicDump && tooLongForBlock)
  );
}

`;

  renderer = renderer.replace("function resolveFinalBlockContent", helper + "\nfunction resolveFinalBlockContent");
}

/* Hide legacy dump even if it was accidentally stored as block.content */
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

fs.writeFileSync(editorPath, editor, "utf8");
fs.writeFileSync(rendererPath, renderer, "utf8");

console.log("Legacy rendered report dump removed from editor and final renderer.");
