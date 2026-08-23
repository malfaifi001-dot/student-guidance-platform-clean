import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { z } from "zod";

export const PORTFOLIO_SNAPSHOT_VERSION = 1 as const;

export const portfolioSnapshotCreateSchema = z.object({
  name: z.string().trim().max(180, "اسم النسخة طويل جدًا.").optional().default(""),
  notes: z.string().trim().max(2000, "ملاحظات النسخة طويلة جدًا.").optional().default(""),
});

export type PortfolioSnapshotDocumentV1 = PortfolioPrintData & {
  snapshotVersion: typeof PORTFOLIO_SNAPSHOT_VERSION;
  capturedAt: string;
  ownerUserId: string;
  schoolAccountId: string;
};

export type PortfolioSnapshotSummary = {
  title: string;
  academicYear: string;
  term: string;
  themeId: string;
  ownerName: string;
  reportCount: number;
  evidenceCount: number;
};

export type PortfolioSnapshotListItem = {
  id: string;
  name: string;
  notes: string;
  roleAtCreation: string;
  snapshotVersion: number;
  createdAt: string;
  summary: PortfolioSnapshotSummary | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parsePortfolioSnapshotDocument(value: unknown): PortfolioSnapshotDocumentV1 {
  if (!isRecord(value) || value.snapshotVersion !== PORTFOLIO_SNAPSHOT_VERSION) {
    throw new Error("إصدار نسخة ملف الإنجاز غير مدعوم.");
  }
  if (
    !isRecord(value.portfolio) ||
    !isRecord(value.owner) ||
    !isRecord(value.school) ||
    !Array.isArray(value.sections) ||
    !Array.isArray(value.qualificationItems) ||
    !Array.isArray(value.performanceSections) ||
    !Array.isArray(value.customEvidence) ||
    !isRecord(value.biography) ||
    !isRecord(value.educationIdentity) ||
    !isRecord(value.totals)
  ) {
    throw new Error("بيانات نسخة ملف الإنجاز غير مكتملة.");
  }

  const performanceSections = value.performanceSections.map((section) => {
    if (!isRecord(section)) return section;
    return { ...section, linkedOutputs: Array.isArray(section.linkedOutputs) ? section.linkedOutputs : [] };
  });
  return { ...value, performanceSections } as PortfolioSnapshotDocumentV1;
}

export function readPortfolioSnapshotSummary(value: unknown): PortfolioSnapshotSummary | null {
  if (!isRecord(value)) return null;
  return {
    title: typeof value.title === "string" ? value.title : "",
    academicYear: typeof value.academicYear === "string" ? value.academicYear : "",
    term: typeof value.term === "string" ? value.term : "",
    themeId: typeof value.themeId === "string" ? value.themeId : "",
    ownerName: typeof value.ownerName === "string" ? value.ownerName : "",
    reportCount: typeof value.reportCount === "number" ? value.reportCount : 0,
    evidenceCount: typeof value.evidenceCount === "number" ? value.evidenceCount : 0,
  };
}
