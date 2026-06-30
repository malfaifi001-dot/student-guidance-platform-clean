import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import xlsx from "xlsx";

const root = process.cwd();

const sourcePath = path.join(
  root,
  "data",
  "ai-report",
  "source",
  "teacher_performance_value_bank_master_batch09_final.xlsx",
);

const outputPath = path.join(
  root,
  "data",
  "ai-report",
  "generated",
  "teacher-performance-knowledge-bank.json",
);

function normalizeArabic(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeArabic(value)
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return [];
  }

  return xlsx.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function makeStableId(parts) {
  const base = parts.map(cleanText).filter(Boolean).join("|");
  const hash = crypto.createHash("sha1").update(base).digest("hex").slice(0, 10);
  const readable = slugify(parts[0] || "item").slice(0, 48) || "item";

  return `${readable}-${hash}`;
}

function keywordsFromParts(parts) {
  const text = parts.map(cleanText).filter(Boolean).join(" ");
  const normalized = normalizeArabic(text);

  const words = normalized
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);

  const phrases = parts
    .map(cleanText)
    .filter((item) => item.length >= 3)
    .map(normalizeArabic);

  return Array.from(new Set([...phrases, ...words])).slice(0, 40);
}

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source Excel not found: ${sourcePath}`);
}

let xlsxModuleOk = true;

const workbook = xlsx.readFile(sourcePath, {
  cellDates: false,
  cellFormula: false,
  cellHTML: false,
  cellStyles: false,
});

const reportsRows = readSheet(workbook, "Reports");
const valueRows = readSheet(workbook, "ValueBank");
const manualRows = readSheet(workbook, "ManualFields");
const coverageRows = readSheet(workbook, "Coverage");

const reportsBySlug = new Map();

const reports = reportsRows
  .map((row) => {
    const reportSlug = cleanText(row.report_slug);
    const reportName = cleanText(row.report_name);

    if (!reportSlug || !reportName) return null;

    return {
      batchId: cleanText(row.batch_id),
      reportSlug,
      reportName,
      performanceElement: cleanText(row.performance_element),
      reportCategory: cleanText(row.report_category),
      templatePattern: cleanText(row.template_pattern),
      keywords: keywordsFromParts([
        reportName,
        reportSlug,
        row.performance_element,
        row.report_category,
        row.template_pattern,
      ]),
    };
  })
  .filter(Boolean);

for (const report of reports) {
  reportsBySlug.set(report.reportSlug, report);
}

function makeKnowledgeItem(row, sourceType, index) {
  const reportSlug = cleanText(row.report_slug);
  const report = reportsBySlug.get(reportSlug);

  const fieldKey = cleanText(row.field_key);
  const fieldLabel = cleanText(row.field_label);
  const inputType = cleanText(row.input_type);
  const optionLabel = cleanText(row.option_label);
  const sourcePage = cleanText(row.source_page);

  if (!reportSlug || !fieldLabel || !optionLabel) {
    return null;
  }

  const category =
    fieldKey === "manual"
      ? "manual"
      : fieldKey || inputType || "value";

  return {
    id: makeStableId([
      reportSlug,
      fieldKey,
      fieldLabel,
      inputType,
      optionLabel,
      sourceType,
      String(index),
    ]),
    sourceType,
    reportSlug,
    reportName: report?.reportName || reportSlug,
    performanceElement: report?.performanceElement || "",
    reportCategory: report?.reportCategory || "",
    templatePattern: report?.templatePattern || "",
    category,
    fieldKey,
    fieldLabel,
    inputType,
    optionLabel,
    sourcePage,
    searchableText: normalizeArabic(
      [
        report?.reportName,
        reportSlug,
        report?.performanceElement,
        report?.reportCategory,
        report?.templatePattern,
        fieldKey,
        fieldLabel,
        inputType,
        optionLabel,
        sourcePage,
      ].join(" "),
    ),
    keywords: keywordsFromParts([
      report?.reportName,
      reportSlug,
      report?.performanceElement,
      report?.reportCategory,
      report?.templatePattern,
      fieldKey,
      fieldLabel,
      inputType,
      optionLabel,
      sourcePage,
    ]),
  };
}

const valueItems = valueRows
  .map((row, index) => makeKnowledgeItem(row, "value_bank", index + 1))
  .filter(Boolean);

const manualItems = manualRows
  .map((row, index) => makeKnowledgeItem(row, "manual_field", index + 1))
  .filter(Boolean);

const seen = new Set();
const items = [];

for (const item of [...valueItems, ...manualItems]) {
  const duplicateKey = [
    item.reportSlug,
    item.fieldKey,
    item.fieldLabel,
    item.inputType,
    item.optionLabel,
  ].join("|");

  if (seen.has(duplicateKey)) continue;

  seen.add(duplicateKey);
  items.push(item);
}

const coverage = coverageRows
  .map((row) => ({
    reportSlug: cleanText(row.report_slug),
    totalValues: Number(row.total_values || 0),
    manual: Number(row.manual || 0),
    tools: Number(row.tools || 0),
    grouping: Number(row.grouping || 0),
    roles: Number(row.roles || 0),
    objectives: Number(row.objectives || 0),
    executionSteps: Number(row.execution_steps || 0),
    evaluationItems: Number(row.evaluation_items || 0),
    challenges: Number(row.challenges || 0),
    recommendations: Number(row.recommendations || 0),
    evidence: Number(row.evidence || 0),
    resultsOrOther: Number(row.results_or_other || 0),
  }))
  .filter((row) => row.reportSlug);

const bank = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceFile: "teacher_performance_value_bank_master_batch09_final.xlsx",
  counts: {
    reports: reports.length,
    valueRows: valueRows.length,
    manualRows: manualRows.length,
    items: items.length,
    coverage: coverage.length,
  },
  reports,
  items,
  coverage,
};

fs.writeFileSync(outputPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");

console.log("AI report knowledge bank generated.");
console.log(`Reports: ${bank.counts.reports}`);
console.log(`Value rows: ${bank.counts.valueRows}`);
console.log(`Manual rows: ${bank.counts.manualRows}`);
console.log(`Unique items: ${bank.counts.items}`);
console.log(`Output: ${outputPath}`);