import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import type { PortfolioServiceOutput, PortfolioCurriculumWeek } from "@/lib/portfolio/service-outputs/service-output-types";
import type { PortfolioBreakPolicy } from "@/lib/portfolio/layout/portfolio-page-policy";

export type PortfolioBlockType = "cover" | "section-divider" | "text" | "profile" | "qualification-list" | "performance-divider" | "service-output" | "report" | "evidence" | "closing" | "custom";

export type PortfolioBlock =
  | { id: string; type: "cover"; breakPolicy: "ALWAYS_NEW_PAGE"; sectionKey?: string; payload: { title: string } }
  | { id: string; type: "section-divider" | "text" | "profile" | "qualification-list" | "performance-divider" | "closing" | "custom"; breakPolicy: PortfolioBreakPolicy; sectionKey?: string; payload: { title: string; text?: string } }
  | { id: string; type: "service-output"; breakPolicy: PortfolioBreakPolicy; sectionKey: string; payload: { output: PortfolioServiceOutput; weeks: PortfolioCurriculumWeek[] } }
  | { id: string; type: "report"; breakPolicy: PortfolioBreakPolicy; sectionKey: string; payload: { reportId: string; title: string; content: PortfolioReportContent | null } }
  | { id: string; type: "evidence"; breakPolicy: PortfolioBreakPolicy; sectionKey: string; payload: { reportId: string; items: PortfolioReportContent["evidenceItems"] } };

