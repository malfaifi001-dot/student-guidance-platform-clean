import type { CurriculumCalendarItem } from "@/lib/curriculum-distribution/calendar";
import type { WeeklyActivityPlan } from "@/lib/activity-plan/weekly-activity-plan-service";
import type { ActivityPlanTenPercentRow } from "@/lib/activity-plan/ten-percent-activity-plan-types";

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
  stage: string;
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
  weeklyPlans?: Array<{ stage: string; weeks: WeeklyActivityPlan[] }>;
  tenPercentPlans?: Array<{ stage: string; rows: ActivityPlanTenPercentRow[] }>;
};

export type PortfolioActivityTeamContent = {
  kind: "activity-team";
  updatedAt: string;
  rows: Array<{ key: string; label: string; supervisor: string; signatureUrl?: string }>;
};

export type PortfolioServiceOutputChunk =
  | { kind: "curriculum-distribution"; weeks: PortfolioCurriculumWeek[] }
  | { kind: "activity-plan"; rows: PortfolioActivityPlanRow[]; summary?: Omit<PortfolioActivityPlanContent, "kind" | "rows">; shareUrl?: string; shareQrDataUrl?: string }
  | { kind: "weekly-activity-plan"; stage: string; weeks: WeeklyActivityPlan[] }
  | { kind: "ten-percent-activity-plan"; stage: string; rows: ActivityPlanTenPercentRow[] }
  | { kind: "activity-team"; rows: PortfolioActivityTeamContent["rows"] };

export function normalizePortfolioServiceOutput(output: PortfolioServiceOutput): PortfolioServiceOutputChunk[] {
  const content = output.content;
  if (content.kind === "activity-team") {
    const rows = (content as PortfolioActivityTeamContent).rows;
    return [{ kind: "activity-team" as const, rows }];
  }

  if (content.kind === "activity-plan") {
    const plan = content as PortfolioActivityPlanContent;
    const chunks: PortfolioServiceOutputChunk[] = [{
      kind: "activity-plan" as const,
      rows: plan.rows,
      summary: { title: plan.title, academicYear: plan.academicYear, semester: plan.semester, totalWeeks: plan.totalWeeks, populatedWeeks: plan.populatedWeeks, totalEntries: plan.totalEntries, activityAreas: plan.activityAreas, shareUrl: plan.shareUrl, shareQrDataUrl: plan.shareQrDataUrl },
      shareUrl: plan.shareUrl,
      shareQrDataUrl: plan.shareQrDataUrl,
    }];
    for (const weeklyPlan of plan.weeklyPlans || []) {
      chunks.push({ kind: "weekly-activity-plan", stage: weeklyPlan.stage, weeks: weeklyPlan.weeks });
    }
    for (const tenPercentPlan of plan.tenPercentPlans || []) {
      chunks.push({ kind: "ten-percent-activity-plan", stage: tenPercentPlan.stage, rows: tenPercentPlan.rows });
    }
    return chunks;
  }

  const weeks = (content as PortfolioCurriculumContent).weeks;
  return [{ kind: "curriculum-distribution" as const, weeks }];
}
