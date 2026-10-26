import { normalizeCaseValues, normalizeEvidence } from "@/lib/report-engine/smart-report-payload-builder";
import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";

type CaseValue = {
  fieldKey: string;
  value?: string | null;
  jsonValue?: unknown;
  field?: { key?: string | null; label?: string | null; type?: string | null } | null;
};

type CaseEntryForPortfolio = {
  id: string;
  title?: string | null;
  status: string;
  createdAt: Date;
  submittedAt?: Date | null;
  workflowSnapshot?: unknown;
  service?: { slug?: string | null; name?: string | null } | null;
  values: CaseValue[];
  evidences: Array<Record<string, unknown>>;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function fieldValue(value: string | string[]) {
  return Array.isArray(value) ? value : text(value);
}

function tableFromValue(value: CaseValue) {
  const key = text(value.field?.key || value.fieldKey).toLowerCase();
  if (!["committee_items", "committee_members"].includes(key)) return null;
  const raw = Array.isArray(value.jsonValue) ? value.jsonValue : [];
  const rows = raw.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const cells = Object.fromEntries(
      Object.entries(record)
        .map(([cellKey, cellValue]) => [cellKey, text(cellValue)] as const)
        .filter(([, cellValue]) => Boolean(cellValue)),
    );
    return Object.keys(cells).length ? [{ id: `${key}-${index + 1}`, cells }] : [];
  });
  if (!rows.length) return null;
  const columnKeys = Array.from(new Set(rows.flatMap((row) => Object.keys(row.cells))));
  return {
    id: key,
    sourceFieldKey: key,
    title: text(value.field?.label) || (key === "committee_items" ? "جدول الاجتماع" : "أعضاء اللجنة"),
    columns: columnKeys.map((columnKey) => ({ key: columnKey, label: columnKey })),
    rows,
    settings: { repeatHeader: true, compact: true, stripedRows: true, highlightFirstColumn: false },
  };
}

export function adaptCounselorCommitteeCaseToPortfolioReport(caseEntry: CaseEntryForPortfolio): PortfolioReportContent {
  const values = normalizeCaseValues({ ...caseEntry, values: caseEntry.values });
  const tables = caseEntry.values.flatMap((value) => {
    const table = tableFromValue(value);
    return table ? [table] : [];
  });
  const tableKeys = new Set(tables.map((table) => table.sourceFieldKey));
  const fields = values
    .filter((value) => !tableKeys.has(text(value.key).toLowerCase()))
    .map((value) => ({ key: value.key, label: value.label, value: fieldValue(value.value) }));
  const primaryFields = fields.filter((field) => {
    const source = caseEntry.values.find((value) => text(value.field?.key || value.fieldKey) === field.key);
    return text(source?.field?.type).toUpperCase() === "DATE" || /date|تاريخ/i.test(`${field.key} ${field.label}`);
  });
  const primaryKeys = new Set(primaryFields.map((field) => field.key));
  const evidence = normalizeEvidence(caseEntry).map((item) => ({
    id: item.id,
    title: item.title || item.fileName || "شاهد",
    description: item.caption || "",
    url: item.url || null,
    type: item.mimeType?.startsWith("image/") ? "IMAGE" : item.type || "FILE",
  }));
  const serviceName = text(caseEntry.service?.name) || "اللجان والاجتماعات";
  return {
    reportType: "MEETING_REPORT",
    title: text(caseEntry.title) || serviceName,
    subtitle: serviceName,
    schoolName: "",
    logoUrl: null,
    issuedAt: (caseEntry.submittedAt || caseEntry.createdAt).toISOString(),
    issuedBy: null,
    serviceName,
    primaryFields,
    detailFields: fields.filter((field) => !primaryKeys.has(field.key)),
    normalizedFields: fields,
    narrative: null,
    evidenceSettings: { layout: "TWO_PER_PAGE", fit: "contain", aspectRatio: "LANDSCAPE_4_3", showCaptions: true },
    evidenceItems: evidence,
    tables,
  };
}
