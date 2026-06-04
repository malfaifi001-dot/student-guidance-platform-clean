const fs = require("fs");

const files = [
  "components\\report-engine\\report-template-studio.tsx",
  "components\\report-engine\\design-renderers\\report-design-renderer.tsx",
];

const editorPath = "components\\reports\\report-studio-editor.tsx";

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

for (const filePath of files) {
  let content = fs.readFileSync(filePath, "utf8");

  content = replaceNamedFunction(
    content,
    "getEvidencePerPage",
    `function getEvidencePerPage(block: any) {
  return getSmartEvidencePerPage(block);
}

function getSmartEvidencePerPage(block: any) {
  const layout = String(block?.evidenceLayout || "TWO_PER_PAGE");
  const ratio = String(block?.evidenceAspectRatio || "LANDSCAPE_4_3");
  const fit = String(block?.evidenceFit || "contain");

  if (layout === "ATTACHMENT_LIST") return 10;
  if (layout === "ONE_PER_PAGE") return 1;
  if (layout === "TWO_PER_PAGE") return 2;

  /*
    GRID_2X2 is a maximum capacity, not a forced capacity.
    The system must keep every evidence card inside the A4 frame.
    Portrait images are tall, so 4 cards can overflow the page.
  */
  if (layout === "GRID_2X2") {
    if (ratio === "PORTRAIT_3_4") return 2;
    if (ratio === "SQUARE_1_1" && fit === "cover") return 4;
    if (ratio === "SQUARE_1_1") return 4;
    if (ratio === "LANDSCAPE_16_9") return 4;
    return 4;
  }

  return 2;
}`
  );

  content = replaceNamedFunction(
    content,
    "getEvidenceGridClass",
    `function getEvidenceGridClass(block: any) {
  const perPage = getEvidencePerPage(block);

  if (block.evidenceLayout === "ATTACHMENT_LIST") {
    return "grid gap-2";
  }

  if (perPage <= 1) {
    return "grid gap-3";
  }

  return "grid gap-3 md:grid-cols-2";
}`
  );

  content = replaceNamedFunction(
    content,
    "getEvidenceImageHeightClass",
    `function getEvidenceImageHeightClass(block: any) {
  const perPage = getEvidencePerPage(block);
  const ratio = block.evidenceAspectRatio || "LANDSCAPE_4_3";

  /*
    Fixed heights are intentional:
    they keep evidence inside the printable A4 area.
    Extra evidence must go to a new Evidence Page instead of stretching A4.
  */
  if (perPage <= 1) {
    switch (ratio) {
      case "PORTRAIT_3_4":
        return "h-[185mm]";
      case "SQUARE_1_1":
        return "h-[160mm]";
      case "LANDSCAPE_16_9":
        return "h-[122mm]";
      case "LANDSCAPE_4_3":
      default:
        return "h-[138mm]";
    }
  }

  if (perPage === 2) {
    switch (ratio) {
      case "PORTRAIT_3_4":
        return "h-[92mm]";
      case "SQUARE_1_1":
        return "h-[82mm]";
      case "LANDSCAPE_16_9":
        return "h-[58mm]";
      case "LANDSCAPE_4_3":
      default:
        return "h-[66mm]";
    }
  }

  switch (ratio) {
    case "SQUARE_1_1":
      return "h-[56mm]";
    case "LANDSCAPE_16_9":
      return "h-[42mm]";
    case "PORTRAIT_3_4":
      return "h-[82mm]";
    case "LANDSCAPE_4_3":
    default:
      return "h-[48mm]";
  }
}`
  );

  content = replaceNamedFunction(
    content,
    "getEvidenceImageClass",
    `function getEvidenceImageClass(block: any) {
  const fit = block.evidenceFit === "cover" ? "object-cover" : "object-contain";
  return \`\${getEvidenceImageHeightClass(block)} w-full \${fit}\`;
}`
  );

  content = content.replaceAll(
    'className="overflow-hidden rounded-2xl border border-slate-200 bg-white"',
    'className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white"'
  );

  content = content.replaceAll(
    'className="border-t border-slate-100 px-3 py-2 text-xs font-bold leading-6 text-slate-600"',
    'className="max-h-12 overflow-hidden border-t border-slate-100 px-3 py-2 text-xs font-bold leading-6 text-slate-600"'
  );

  content = content.replaceAll(
    'يوجد {hiddenCount} شاهد إضافي لم يظهر لأن إنشاء الصفحات التلقائية غير مفعل.',
    'يوجد {hiddenCount} شاهد إضافي. سيتم نقله إلى صفحة شواهد إضافية حتى لا يتمدد إطار A4.'
  );

  fs.writeFileSync(filePath, content, "utf8");
}

/* Show evidence controls in report studio whenever report has evidence */
let editor = fs.readFileSync(editorPath, "utf8");

editor = editor.replace(
`  const activePageHasEvidence = useMemo(() => {
    return (activePage?.blocks || []).some(
      (block) => normalizeBlockKind(block) === "evidence-gallery",
    );
  }, [activePage]);`,
`  const activePageHasEvidence = useMemo(() => {
    const pageHasEvidenceBlock = (activePage?.blocks || []).some(
      (block) => normalizeBlockKind(block) === "evidence-gallery",
    );

    return pageHasEvidenceBlock || report.evidenceItems.length > 0;
  }, [activePage, report.evidenceItems.length]);`
);

fs.writeFileSync(editorPath, editor, "utf8");

console.log("Smart evidence pagination applied to template studio, final renderer, and report editor.");
