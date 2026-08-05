export type PortfolioReportField = {
  key: string;
  label: string;
  value: string | string[];
  group?: string | null;
};

export type PortfolioReportEvidenceItem = {
  id: string;
  title: string;
  description?: string;
  url: string | null;
  type: string;
};

export type PortfolioReportEvidenceLayout =
  | "ONE_PER_PAGE"
  | "TWO_PER_PAGE"
  | "GRID_2X2"
  | "ATTACHMENT_LIST";

export type PortfolioReportEvidenceFit = "contain" | "cover";

export type PortfolioReportEvidenceAspectRatio =
  | "LANDSCAPE_4_3"
  | "LANDSCAPE_16_9"
  | "SQUARE_1_1"
  | "PORTRAIT_3_4";

export type PortfolioReportEvidenceSettings = {
  layout: PortfolioReportEvidenceLayout;
  fit: PortfolioReportEvidenceFit;
  aspectRatio: PortfolioReportEvidenceAspectRatio;
  showCaptions: boolean;
};

export type PortfolioReportContent = {
  reportType: string;
  title: string;
  subtitle: string;
  schoolName: string;
  logoUrl: string | null;
  issuedAt: string | null;
  issuedBy: string | null;
  serviceName: string;
  primaryFields: PortfolioReportField[];
  detailFields: PortfolioReportField[];
  normalizedFields: PortfolioReportField[];
  narrative: {
    title: string;
    body: string;
  } | null;
  evidenceSettings: PortfolioReportEvidenceSettings;
  evidenceItems: PortfolioReportEvidenceItem[];
};

type JsonRecord = Record<string, unknown>;

type RawFieldInput = {
  key?: unknown;
  label?: unknown;
  value?: unknown;
  group?: unknown;
};

type RawEvidenceInput = {
  id?: unknown;
  title?: unknown;
  url?: unknown;
  type?: unknown;
};

type RawEvidenceSettingsInput = {
  layout?: unknown;
  evidenceLayout?: unknown;
  fit?: unknown;
  evidenceFit?: unknown;
  aspectRatio?: unknown;
  evidenceAspectRatio?: unknown;
  showCaptions?: unknown;
  evidenceShowCaptions?: unknown;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function cleanText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function serializeObjectValue(value: unknown): string {
  if (!value || typeof value !== "object") {
    return cleanText(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function normalizeArrayValue(value: unknown[]): string[] {
  return value
    .flatMap((item) => {
      if (Array.isArray(item)) {
        return normalizeArrayValue(item);
      }

      const text = cleanText(item) || serializeObjectValue(item);
      return text ? [text] : [];
    })
    .filter(Boolean);
}

function hasMeaningfulValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return normalizeArrayValue(value).length > 0;
  }

  return Boolean(cleanText(value) || serializeObjectValue(value));
}

function normalizeValue(value: unknown): string | string[] {
  if (Array.isArray(value)) {
    return normalizeArrayValue(value);
  }

  return cleanText(value) || serializeObjectValue(value);
}

function normalizeField(fieldValue: unknown): PortfolioReportField | null {
  const field = asRecord(fieldValue) as RawFieldInput;
  const key = cleanText(field.key);
  const label = cleanText(field.label);

  if (!key && !label) {
    return null;
  }

  if (!hasMeaningfulValue(field.value)) {
    return null;
  }

  return {
    key: key || label,
    label: label || key,
    value: normalizeValue(field.value),
    group: cleanText(field.group) || null,
  };
}

function dedupeFields(fields: PortfolioReportField[]): PortfolioReportField[] {
  const seen = new Set<string>();

  return fields.filter((field) => {
    const dedupeKey = `${field.key}::${field.label}`;

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

function normalizeFields(value: unknown): PortfolioReportField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeFields(
    value
      .map((field) => normalizeField(field))
      .filter((field): field is PortfolioReportField => field !== null),
  );
}

function normalizeEvidenceItems(value: unknown): PortfolioReportEvidenceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const evidence = asRecord(item) as RawEvidenceInput;
      const title = cleanText(evidence.title);
      const url = cleanText(evidence.url) || null;
      const type = cleanText(evidence.type) || "FILE";
      const id = cleanText(evidence.id) || url || `evidence-${index + 1}`;

      if (!title && !url && !type) {
        return null;
      }

      return {
        id,
        title,
        url,
        type,
      };
    })
    .filter((item): item is PortfolioReportEvidenceItem => item !== null);
}

function normalizeEvidenceSettings(value: unknown): PortfolioReportEvidenceSettings {
  const evidence = asRecord(value) as RawEvidenceSettingsInput;
  const layout = cleanText(evidence.layout || evidence.evidenceLayout);
  const fit = cleanText(evidence.fit || evidence.evidenceFit);
  const aspectRatio = cleanText(evidence.aspectRatio || evidence.evidenceAspectRatio);

  return {
    layout:
      layout === "ONE_PER_PAGE" ||
      layout === "TWO_PER_PAGE" ||
      layout === "GRID_2X2" ||
      layout === "ATTACHMENT_LIST"
        ? layout
        : "TWO_PER_PAGE",
    fit: fit === "cover" ? "cover" : "contain",
    aspectRatio:
      aspectRatio === "LANDSCAPE_16_9" ||
      aspectRatio === "SQUARE_1_1" ||
      aspectRatio === "PORTRAIT_3_4" ||
      aspectRatio === "LANDSCAPE_4_3"
        ? aspectRatio
        : "LANDSCAPE_4_3",
    showCaptions:
      typeof evidence.showCaptions === "boolean"
        ? evidence.showCaptions
        : evidence.evidenceShowCaptions !== false,
  };
}

export function normalizePortfolioReportPayload(
  payload: unknown,
): PortfolioReportContent | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const source = asRecord(payload);
  const identity = asRecord(source.identity);
  const caseInfo = asRecord(source.caseInfo);
  const service = asRecord(source.service);
  const narrativeRecord = asRecord(source.narrative);
  const evidence = asRecord(source.evidence);

  const primaryFields = normalizeFields(source.primaryFields);
  const detailFields = normalizeFields(source.detailFields);
  const normalizedFields = detailFields.length > 0 ? detailFields : primaryFields;

  const narrativeBody = cleanText(narrativeRecord.body);
  const narrativeVisible = narrativeRecord.visible !== false;

  return {
    reportType: cleanText(source.reportType) || "GENERAL_CASE_REPORT",
    title:
      cleanText(source.title) ||
      cleanText(caseInfo.title) ||
      cleanText(service.name) ||
      "تقرير",
    subtitle: cleanText(service.name) || cleanText(source.serviceName) || "",
    schoolName: cleanText(identity.schoolName),
    logoUrl: cleanText(identity.schoolLogoUrl) || null,
    issuedAt: cleanText(caseInfo.issuedAt) || cleanText(caseInfo.createdAt) || null,
    issuedBy: cleanText(caseInfo.issuedBy) || null,
    serviceName: cleanText(service.name) || cleanText(source.serviceName) || cleanText(source.serviceSlug),
    primaryFields,
    detailFields,
    normalizedFields,
    narrative: narrativeBody && narrativeVisible
      ? {
          title: cleanText(narrativeRecord.title) || "وصف التنفيذ",
          body: narrativeBody,
        }
      : null,
    evidenceSettings: normalizeEvidenceSettings(evidence),
    evidenceItems: normalizeEvidenceItems(evidence.items),
  };
}
