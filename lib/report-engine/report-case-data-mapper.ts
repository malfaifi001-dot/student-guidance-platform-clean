import { filterPrivateReportValues } from "@/lib/report-engine/report-private-fields";
export type ReportMappedStudent = {
  id?: string;
  fullName: string;
  nationalId?: string | null;
  stage?: string | null;
  grade?: string | null;
  classroom?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
};

export type ReportMappedService = {
  id: string;
  name: string;
  slug: string;
};

export type ReportMappedValue = {
  fieldKey: string;
  fieldLabel: string;
  value: string;
};

export type ReportMappedEvidence = {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  size?: number | null;
  note?: string | null;
  imageUrl?: string;
};

export type ReportMappedCase = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  service: ReportMappedService;
  student?: ReportMappedStudent | null;
  values: ReportMappedValue[];
  evidences: ReportMappedEvidence[];
};

type CaseEntryForReport = {
  id: string;
  title?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date | null;

  service: {
    id: string;
    name: string;
    slug: string;
  };

  student?: {
    id: string;
    fullName: string;
    nationalId?: string | null;
    stage?: string | null;
    grade?: string | null;
    classroom?: string | null;
    guardian?: {
      name?: string | null;
      phone?: string | null;
    } | null;
  } | null;

  values: Array<{
    fieldKey: string;
    value?: string | null;
    jsonValue?: unknown;
    field?: {
      key?: string | null;
      label?: string | null;
    } | null;
  }>;

  evidences?: Array<{
    id: string;
    title?: string | null;
    fileName?: string | null;
    fileUrl?: string | null;
    url?: string | null;
    mimeType?: string | null;
    size?: number | null;
    note?: string | null;
    caption?: string | null;
  }>;

  caseEvidences?: Array<{
    id: string;
    title?: string | null;
    fileName: string;
    fileUrl: string;
    url?: string | null;
    mimeType?: string | null;
    size?: number | null;
    note?: string | null;
    caption?: string | null;
  }>;
};

function stringifyReportValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyReportValue(item))
      .filter(Boolean)
      .join("، ");
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
const REPORT_IMAGE_EVIDENCE_EXTENSION_PATTERN =
  /\.(png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i;

function hasReportImageEvidenceExtension(value: unknown) {
  const text = String(value || "").trim().replaceAll("\\", "/");

  if (!text) {
    return false;
  }

  return REPORT_IMAGE_EVIDENCE_EXTENSION_PATTERN.test(text);
}

function isImageEvidence(item: {
  type?: string | null;
  mimeType?: string | null;
  fileUrl?: string | null;
  url?: string | null;
  fileName?: string | null;
  title?: string | null;
}) {
  if (String(item.type || "").trim().toUpperCase() === "IMAGE") {
    return true;
  }

  if (String(item.mimeType || "").toLowerCase().startsWith("image/")) {
    return true;
  }

  return [item.fileUrl, item.url, item.fileName, item.title].some((value) =>
    hasReportImageEvidenceExtension(value)
  );
}

function normalizeReportValues(
  values: CaseEntryForReport["values"]
): ReportMappedValue[] {
  return values.map((item) => ({
    fieldKey: item.field?.key || item.fieldKey,
    fieldLabel: item.field?.label || item.fieldKey,
    value: stringifyReportValue(item.jsonValue ?? item.value),
  }));
}

function normalizeReportEvidences(
  caseEntry: CaseEntryForReport
): ReportMappedEvidence[] {
  const normalEvidences: ReportMappedEvidence[] = (caseEntry.evidences || [])
    .filter((item) => Boolean(item.fileUrl || item.url))
    .map((item) => {
      const fileUrl = item.fileUrl || item.url || "";
      const evidenceTitle = item.title || item.note || item.fileName || "Ø´Ø§Ù‡Ø¯";

      return {
        id: item.id,
        title: item.note || item.fileName || "شاهد",
        fileName: item.fileName || "شاهد",
        fileUrl,
        mimeType: item.mimeType,
        size: item.size,
        note: item.note,
        ...(evidenceTitle ? { title: evidenceTitle } : {}),
        imageUrl: isImageEvidence(item) ? fileUrl : undefined,
      };
    });

  const legacyCaseEvidences: ReportMappedEvidence[] = (
    caseEntry.caseEvidences || []
  )
    .filter((item) => Boolean(item.fileUrl || item.url))
    .map((item) => {
      const fileUrl = item.fileUrl || item.url || "";
      const evidenceTitle = item.title || item.note || item.fileName || "Ø´Ø§Ù‡Ø¯";

      return {
        id: item.id,
        title: item.fileName || "شاهد",
        fileName: item.fileName || "شاهد",
        fileUrl,
        mimeType: item.mimeType,
        size: item.size,
        note: item.note,
        ...(evidenceTitle ? { title: evidenceTitle } : {}),
        imageUrl: isImageEvidence(item) ? fileUrl : undefined,
      };
    });

  return [...normalEvidences, ...legacyCaseEvidences];
}

export function mapCaseEntryToReportData(
  caseEntry: CaseEntryForReport
): ReportMappedCase {
  return {
    id: caseEntry.id,
    title: caseEntry.title || caseEntry.service.name,
    status: caseEntry.status,
    createdAt: caseEntry.createdAt.toISOString(),
    updatedAt: caseEntry.updatedAt.toISOString(),
    submittedAt: caseEntry.submittedAt?.toISOString() || null,

    service: {
      id: caseEntry.service.id,
      name: caseEntry.service.name,
      slug: caseEntry.service.slug,
    },

    student: caseEntry.student
      ? {
          id: caseEntry.student.id,
          fullName: caseEntry.student.fullName,
          nationalId: caseEntry.student.nationalId,
          stage: caseEntry.student.stage,
          grade: caseEntry.student.grade,
          classroom: caseEntry.student.classroom,
          guardianName: caseEntry.student.guardian?.name || null,
          guardianPhone: caseEntry.student.guardian?.phone || null,
        }
      : null,

    values: normalizeReportValues(caseEntry.values),
    evidences: normalizeReportEvidences(caseEntry),
  };
}

export function findReportValue(
  reportData: ReportMappedCase,
  fieldKey: string,
  fallback = ""
) {
  return (
    reportData.values.find((item) => item.fieldKey === fieldKey)?.value ||
    fallback
  );
}
