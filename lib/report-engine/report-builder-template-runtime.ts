import { prisma } from "@/lib/prisma";

type LegacyReportTemplateId =
  | "official-long"
  | "visual-activity"
  | "executive-brief";

const LEGACY_REPORT_TEMPLATE_IDS: LegacyReportTemplateId[] = [
  "official-long",
  "visual-activity",
  "executive-brief",
];

export function isLegacyReportTemplateId(value?: string | null) {
  return Boolean(
    value &&
      LEGACY_REPORT_TEMPLATE_IDS.includes(value as LegacyReportTemplateId)
  );
}

export function parseBuilderTemplateJson(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    return value as Record<string, any>;
  }

  return null;
}

export function getBuilderTemplateFromSnapshot(snapshot: unknown) {
  const data = snapshot as
    | {
        source?: string;
        builderTemplate?: any;
      }
    | null
    | undefined;

  if (data?.source !== "TEMPLATE_BUILDER") {
    return null;
  }

  if (!data.builderTemplate || !Array.isArray(data.builderTemplate.pages)) {
    return null;
  }

  return data.builderTemplate;
}

export async function getBuilderTemplateFromDatabase(templateId?: string | null) {
  if (!templateId || isLegacyReportTemplateId(templateId)) {
    return null;
  }

  const templateRecord = await prisma.reportTemplate.findUnique({
    where: {
      id: templateId,
    },
  });

  if (!templateRecord) {
    return null;
  }

  const templateJson =
    parseBuilderTemplateJson(templateRecord.templateJson) ||
    parseBuilderTemplateJson(templateRecord.content);

  if (!templateJson || !Array.isArray(templateJson.pages)) {
    return null;
  }

  return {
    ...templateJson,
    id: templateRecord.id,
    name: templateRecord.name || templateJson.name,
    description:
      templateRecord.description ||
      templateJson.description ||
      "قالب تقرير محفوظ من صانع القوالب.",
    serviceSlug: templateRecord.serviceSlug || templateJson.serviceSlug || null,
    status: templateJson.status || "PUBLISHED",
  };
}

export async function resolveBuilderTemplateForReport(
  report: {
    templateId?: string | null;
    templateSnapshot?: unknown;
  },
  options?: {
    templateIdOverride?: string | null;
  }
) {
  const snapshotTemplate = getBuilderTemplateFromSnapshot(report.templateSnapshot);

  if (snapshotTemplate) {
    return snapshotTemplate;
  }

  return getBuilderTemplateFromDatabase(
    options?.templateIdOverride || report.templateId
  );
}

export function buildBuilderPreviewCaseData(
  report: any,
  values: Array<{
    fieldKey: string;
    fieldLabel: string;
    value?: string;
    displayValue?: string;
  }>
) {
  const student = report.caseEntry.student;
  const guardian = student?.guardian;

  const reportEvidenceItems = Array.isArray(report.evidenceItems)
    ? report.evidenceItems
    : [];

  const caseEvidenceItems = Array.isArray(report.caseEntry?.evidences)
    ? report.caseEntry.evidences
    : [];

  const evidences = reportEvidenceItems.length
    ? reportEvidenceItems
        .filter((item: any) => item.visible !== false)
        .map((item: any) => ({
          id: item.id,
          title: item.caption || item.fileName,
          fileName: item.fileName,
          fileUrl: item.fileUrl || "",
          imageUrl:
            item.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif)$/i.test(item.fileName || "")
              ? item.fileUrl || ""
              : undefined,
          mimeType: item.mimeType || "",
          note: item.caption || "",
        }))
    : caseEvidenceItems.map((item: any) => ({
        id: item.id,
        title: item.note || item.fileName || "شاهد",
        fileName: item.fileName || "مرفق",
        fileUrl: item.fileUrl || "",
        imageUrl:
          item.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif)$/i.test(item.fileName || "")
            ? item.fileUrl || ""
            : undefined,
        mimeType: item.mimeType || "",
        note: item.note || "",
      }));

  return {
    id: report.caseEntry.id,
    title: report.caseEntry.title || report.title,
    status: report.caseEntry.status,
    createdAt: report.caseEntry.createdAt?.toISOString?.() || "",
    updatedAt: report.caseEntry.updatedAt?.toISOString?.() || "",
    submittedAt: report.caseEntry.submittedAt?.toISOString?.() || null,
    serviceName: report.caseEntry.service.name,
    serviceSlug: report.caseEntry.service.slug,

    service: {
      id: report.caseEntry.service.id,
      name: report.caseEntry.service.name,
      slug: report.caseEntry.service.slug,
    },

    student: student
      ? {
          id: student.id,
          fullName: student.fullName,
          nationalId: student.nationalId,
          stage: student.stage,
          grade: student.grade,
          classroom: student.classroom,
          guardianName: guardian?.name || student.guardianName || null,
          guardianPhone: guardian?.phone || student.guardianPhone || null,
        }
      : null,

    values: values.map((item) => ({
      fieldKey: item.fieldKey,
      fieldLabel: item.fieldLabel,
      value: item.displayValue ?? item.value ?? "",
    })),

    evidences,
  };
}
