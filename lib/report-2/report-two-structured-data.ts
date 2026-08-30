import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function fieldItems(payload: SmartReportPayload) {
  return [
    ...(Array.isArray(payload.primaryFields) ? payload.primaryFields : []),
    ...(Array.isArray(payload.detailFields) ? payload.detailFields : []),
  ] as Array<Record<string, unknown>>;
}

export function dedupeReportTwoDateRows<T extends Record<string, unknown>>(rows: T[]) {
  const aliases = new Set(
    rows
      .filter((row) => /^execution_date(?:_\d+)?$/i.test(clean(row.fieldKey || row.key)))
      .map((row) => clean(row.value)),
  );

  if (!aliases.size) return rows;

  return rows.filter((row) => {
    const key = clean(row.fieldKey || row.key);
    const isDate = clean(row.fieldType).toUpperCase() === "DATE";
    return !isDate || /^execution_date(?:_\d+)?$/i.test(key) || !aliases.has(clean(row.value));
  });
}

export function buildReportTwoRenderContext(payload: SmartReportPayload) {
  const data = payload as unknown as Record<string, any>;
  const caseInfo = asRecord(data.caseInfo);
  const service = asRecord(data.service);
  const identity = asRecord(data.identity);
  const student = asRecord(data.student || caseInfo.student);
  const context: Record<string, string> = {
    "case.id": clean(caseInfo.id),
    "case.title": clean(caseInfo.title || data.title),
    "case.status": clean(caseInfo.status),
    "case.createdAt": clean(caseInfo.createdAt),
    "case.updatedAt": clean(caseInfo.updatedAt),
    "service.name": clean(service.name),
    "service.slug": clean(service.slug),
    "student.name": clean(student.name || student.fullName),
    "student.grade": clean(student.grade),
    "student.classroom": clean(student.classroom),
    "student.stage": clean(student.stage),
    "student.guardianName": clean(student.guardianName),
    "student.guardianPhone": clean(student.guardianPhone),
    "identity.ministryName": clean(identity.ministryName || "وزارة التعليم"),
    "identity.educationDepartment": clean(
      identity.educationDepartment || "الإدارة العامة للتعليم",
    ),
    "identity.schoolName": clean(identity.schoolName),
  };

  for (const [index, field] of fieldItems(payload).entries()) {
    const key = clean(field.key) || `field-${index + 1}`;
    const label = clean(field.label);
    const value = clean(field.value);
    context[key] = value;
    context[`field.${key}`] = value;
    if (label) {
      context[label] = value;
      context[`field.${label}`] = value;
    }
  }

  return context;
}

function collectEvidence(payload: SmartReportPayload) {
  const data = payload as unknown as Record<string, any>;
  const caseInfo = asRecord(data.caseInfo) as Record<string, any>;
  const candidates = [
    data.evidenceItems,
    data.evidences,
    data.attachments,
    data.evidence?.items,
    caseInfo.evidenceItems,
    caseInfo.evidences,
  ];
  const seen = new Set<string>();

  return candidates.flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((item) => item && typeof item === "object")
    .filter((item: Record<string, unknown>) => {
      const id = clean(item.id || item.fileUrl || item.url || item.fileName);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

export function buildReportTwoPreviewCase(payload: SmartReportPayload) {
  const data = payload as unknown as Record<string, any>;
  const caseInfo = asRecord(data.caseInfo) as Record<string, any>;
  const service = asRecord(data.service);

  return {
    caseId: clean(caseInfo.id),
    title: clean(caseInfo.title || data.title),
    status: clean(caseInfo.status),
    createdAt: clean(caseInfo.createdAt),
    updatedAt: clean(caseInfo.updatedAt),
    serviceName: clean(service.name),
    serviceSlug: clean(service.slug),
    values: dedupeReportTwoDateRows(fieldItems(payload).map((field, index) => ({
      fieldKey: clean(field.key) || `field-${index + 1}`,
      fieldType: clean(field.fieldType),
      fieldLabel: clean(field.label) || clean(field.key),
      value: clean(field.value),
      valueItems: Array.isArray(field.payloadValue)
        ? field.payloadValue.map(clean).filter(Boolean)
        : undefined,
    }))),
    evidences: collectEvidence(payload),
  };
}

export function getReportTwoSourceFields(payload: unknown) {
  const record = payload as SmartReportPayload;
  return new Map(
    fieldItems(record).flatMap((field, index) => {
      const key = clean(field.key) || `field-${index + 1}`;
      const entry = {
        key,
        label: clean(field.label),
        value: clean(field.value),
        valueItems: Array.isArray(field.payloadValue)
          ? field.payloadValue.map(clean).filter(Boolean)
          : [],
      };
      return [key, entry.label]
        .filter(Boolean)
        .map((lookup) => [clean(lookup).toLowerCase(), entry] as const);
    }),
  );
}
