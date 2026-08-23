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
  displayTitle: string;
  createdAt: string;
  content: PortfolioCurriculumContent;
};

