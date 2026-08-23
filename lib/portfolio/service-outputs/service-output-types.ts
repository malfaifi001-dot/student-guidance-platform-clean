import type { CurriculumCalendarItem } from "@/lib/curriculum-distribution/calendar";

export type PortfolioCurriculumWeek = Pick<CurriculumCalendarItem, "id" | "kind" | "sequence" | "title" | "hijriRange" | "gregorianRange"> & {
  units: Array<{ name: string; lessons: string[] }>;
  standalone: string[];
};

export type PortfolioCurriculumContent = {
  kind: "curriculum-distribution";
  subject: string;
  stage: string;
  track: string;
  grade: string;
  semester: string;
  weeks: PortfolioCurriculumWeek[];
};

export type PortfolioServiceOutput = {
  id: string;
  serviceSlug: string;
  resourceType: string;
  performanceItemKey: string;
  targetSectionKey?: string;
  displayTitle: string;
  createdAt: string;
  content: PortfolioCurriculumContent | PortfolioActivityPlanContent | PortfolioActivityTeamContent;
};

export type PortfolioActivityPlanWeek = {
  weekNumber: number;
  dateRange: string;
  entries: Array<{
    day: string;
    date: string;
    period: string;
    activityArea: string;
    grade: string;
    supervisor: string;
  }>;
};

export type PortfolioActivityPlanRow = {
  id: string;
  week: string;
  day: string;
  date: string;
  activityArea: string;
  activity: string;
  period: string;
  grade: string;
  supervisor: string;
};

export type PortfolioActivityPlanContent = {
  kind: "activity-plan";
  title: string;
  academicYear: string;
  semester: string;
  totalWeeks: number;
  populatedWeeks: number;
  totalEntries: number;
  activityAreas: string[];
  rows: PortfolioActivityPlanRow[];
  shareUrl: string;
  shareQrDataUrl: string;
};

export type PortfolioActivityTeamContent = {
  kind: "activity-team";
  updatedAt: string;
  rows: Array<{ key: string; label: string; supervisor: string; signatureUrl?: string }>;
};

export type PortfolioServiceOutputChunk =
  | { kind: "curriculum-distribution"; weeks: PortfolioCurriculumWeek[] }
  | { kind: "activity-plan"; rows: PortfolioActivityPlanRow[]; summary?: Omit<PortfolioActivityPlanContent, "kind" | "rows">; shareUrl?: string; shareQrDataUrl?: string }
  | { kind: "activity-team"; rows: PortfolioActivityTeamContent["rows"] };

export function getPortfolioServiceOutputChunks(output: PortfolioServiceOutput): PortfolioServiceOutputChunk[] {
  const content = output.content;
  if (content.kind === "activity-team") {
    const rows = (content as PortfolioActivityTeamContent).rows;
    const size = Math.max(1, Math.ceil(rows.length / 2));
    return Array.from({ length: Math.max(1, Math.ceil(rows.length / size)) }, (_, index) => ({
      kind: "activity-team" as const,
      rows: rows.slice(index * size, (index + 1) * size),
    }));
  }

  if (content.kind === "activity-plan") {
    const plan = content as PortfolioActivityPlanContent;
    const size = Math.max(8, Math.min(14, Math.ceil(plan.rows.length / 2) || 1));
    const chunks = Array.from({ length: Math.max(1, Math.ceil(plan.rows.length / size)) }, (_, index) => ({
      kind: "activity-plan" as const,
      rows: plan.rows.slice(index * size, (index + 1) * size),
      ...(index === 0 ? { summary: { title: plan.title, academicYear: plan.academicYear, semester: plan.semester, totalWeeks: plan.totalWeeks, populatedWeeks: plan.populatedWeeks, totalEntries: plan.totalEntries, activityAreas: plan.activityAreas, shareUrl: plan.shareUrl, shareQrDataUrl: plan.shareQrDataUrl } } : {}),
      ...(index === Math.max(1, Math.ceil(plan.rows.length / size)) - 1 ? { shareUrl: plan.shareUrl, shareQrDataUrl: plan.shareQrDataUrl } : {}),
    }));
    return chunks;
  }

  const weeks = (content as PortfolioCurriculumContent).weeks;
  const size = Math.max(1, Math.ceil(weeks.length / 2));
  return Array.from({ length: Math.max(1, Math.ceil(weeks.length / size)) }, (_, index) => ({
    kind: "curriculum-distribution" as const,
    weeks: weeks.slice(index * size, (index + 1) * size),
  }));
}
