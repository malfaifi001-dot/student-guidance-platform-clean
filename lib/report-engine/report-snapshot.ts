import type { ReportMappedCase } from "@/lib/report-engine/report-case-data-mapper";

export type ReportTemplateSnapshot = {
  templateId: string;
  templateName: string;
  version: number;
  capturedAt: string;
  source: "DEFAULT_RUNTIME_TEMPLATE" | "TEMPLATE_BUILDER";
  settings: {
    showCover: boolean;
    defaultTemplate: string;
    defaultEvidenceLayout: string;
    pageSize: "A4";
    direction: "rtl";
  };
};

export type ReportDataSnapshot = {
  capturedAt: string;
  caseId: string;
  caseTitle: string;
  caseStatus: string;
  service: ReportMappedCase["service"];
  student: ReportMappedCase["student"];
  values: ReportMappedCase["values"];
  evidences: ReportMappedCase["evidences"];
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createDefaultTemplateSnapshot(
  templateId = "official-long"
): ReportTemplateSnapshot {
  return {
    templateId,
    templateName:
      templateId === "visual-activity"
        ? "القالب البصري"
        : templateId === "executive-brief"
          ? "القالب المختصر"
          : "القالب الرسمي",
    version: 1,
    capturedAt: new Date().toISOString(),
    source: "DEFAULT_RUNTIME_TEMPLATE",
    settings: {
      showCover: true,
      defaultTemplate: templateId,
      defaultEvidenceLayout: "grid-2x2",
      pageSize: "A4",
      direction: "rtl",
    },
  };
}

export function createReportDataSnapshot(
  reportData: ReportMappedCase
): ReportDataSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    caseId: reportData.id,
    caseTitle: reportData.title,
    caseStatus: reportData.status,
    service: reportData.service,
    student: reportData.student,
    values: reportData.values,
    evidences: reportData.evidences,
    submittedAt: reportData.submittedAt,
    createdAt: reportData.createdAt,
    updatedAt: reportData.updatedAt,
  };
}