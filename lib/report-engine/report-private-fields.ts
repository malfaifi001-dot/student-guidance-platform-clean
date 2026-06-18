export const REPORT_ATTACHED_CERTIFICATES_FIELD_KEY =
  "report_attached_certificate_ids";

const PRIVATE_REPORT_FIELD_KEYS = new Set([
  REPORT_ATTACHED_CERTIFICATES_FIELD_KEY,
]);

export function isPrivateReportFieldKey(fieldKey: unknown) {
  return PRIVATE_REPORT_FIELD_KEYS.has(String(fieldKey || "").trim());
}

function getPossibleFieldKey(item: unknown) {
  if (!item || typeof item !== "object") {
    return "";
  }

  const record = item as Record<string, any>;

  return String(
    record.fieldKey ||
      record.key ||
      record.name ||
      record.id ||
      record.code ||
      record.slug ||
      record.field?.key ||
      record.field?.fieldKey ||
      record.dynamicField?.key ||
      record.dynamicField?.fieldKey ||
      "",
  ).trim();
}

export function filterPrivateReportValues<T>(values: T[] | null | undefined): T[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((item) => {
    const key = getPossibleFieldKey(item);

    return !isPrivateReportFieldKey(key);
  });
}