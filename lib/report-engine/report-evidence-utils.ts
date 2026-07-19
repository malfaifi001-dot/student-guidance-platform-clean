export type ReportEvidenceLike = Record<string, unknown> | null | undefined;

type EvidenceValidationOptions = {
  allowSampleEvidence?: boolean;
};

const EVIDENCE_REFERENCE_KEYS = [
  "url",
  "fileUrl",
  "imageUrl",
  "publicUrl",
  "storagePath",
  "attachmentId",
  "fileId",
  "evidenceId",
  "path",
  "filePath",
  "thumbnailUrl",
  "previewUrl",
  "downloadUrl",
  "secureUrl",
  "src",
];

const INVALID_REFERENCE_VALUES = new Set([
  "#",
  "-",
  "null",
  "undefined",
  "about:blank",
]);

function cleanEvidenceText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEvidenceReference(value: unknown) {
  return cleanEvidenceText(value).replaceAll("\\", "/");
}

function isPlaceholderEvidenceItem(item: Record<string, unknown>) {
  const id = cleanEvidenceText(item.id);
  const title = cleanEvidenceText(item.title);
  const caption = cleanEvidenceText(item.caption);
  const description = cleanEvidenceText(item.description);
  const text = `${id} ${title} ${caption} ${description}`.toLowerCase();

  return (
    /^placeholder-evidence(?:-|$)/i.test(id) ||
    /^preview-evidence(?:-|$)/i.test(id) ||
    text.includes("مساحة شاهد") ||
    text.includes("مكان الشاهد") ||
    text.includes("للمعاينة") ||
    text.includes("placeholder evidence") ||
    text.includes("preview evidence")
  );
}

function isUsableEvidenceReference(value: unknown) {
  const reference = normalizeEvidenceReference(value);
  const normalized = reference.toLowerCase();

  if (!reference || INVALID_REFERENCE_VALUES.has(normalized)) {
    return false;
  }

  if (normalized.startsWith("javascript:")) {
    return false;
  }

  if (
    normalized === "preview" ||
    normalized === "placeholder" ||
    normalized.includes("placeholder-evidence")
  ) {
    return false;
  }

  return true;
}

function isSampleEvidenceReference(value: unknown) {
  const normalized = normalizeEvidenceReference(value).toLowerCase();

  return (
    normalized.includes("/sample/report-evidence/") ||
    normalized.startsWith("sample/report-evidence/")
  );
}

export function isValidReportEvidenceItem(
  item: ReportEvidenceLike,
  options: EvidenceValidationOptions = {},
) {
  if (!item || typeof item !== "object") {
    return false;
  }

  if (isPlaceholderEvidenceItem(item)) {
    return false;
  }

  const references = EVIDENCE_REFERENCE_KEYS.map((key) => item[key]);
  const usableReferences = references.filter(isUsableEvidenceReference);

  if (!usableReferences.length) {
    return false;
  }

  if (options.allowSampleEvidence) {
    return true;
  }

  return usableReferences.some((reference) => !isSampleEvidenceReference(reference));
}

export function filterValidReportEvidenceItems<T extends ReportEvidenceLike>(
  items: T[] | null | undefined,
  options: EvidenceValidationOptions = {},
): T[] {
  return (items || []).filter((item): item is T =>
    isValidReportEvidenceItem(item, options),
  );
}
