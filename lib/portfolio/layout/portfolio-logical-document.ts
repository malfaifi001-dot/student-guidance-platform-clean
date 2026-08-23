import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import type { PortfolioServiceOutput } from "@/lib/portfolio/service-outputs/service-output-types";
import { PORTFOLIO_DEFAULT_BREAK_POLICIES } from "@/lib/portfolio/layout/portfolio-page-policy";
import type { PortfolioBlock } from "@/lib/portfolio/layout/portfolio-block-types";

export type PortfolioLogicalSection = {
  id: string;
  key: string;
  title: string;
  sortOrder: number;
  isEnabled: boolean;
  blocks: PortfolioBlock[];
};

export type PortfolioLogicalDocument = {
  sections: PortfolioLogicalSection[];
};

export type PortfolioLogicalInput = {
  title: string;
  sections: Array<{ id: string; key: string; title: string; kind: string; sortOrder: number; isEnabled: boolean }>;
  performanceSections: Array<{
    id: string;
    key: string;
    title: string;
    sortOrder: number;
    isEnabled: boolean;
    intro: string;
    linkedOutputs: PortfolioServiceOutput[];
    reports: Array<{ id: string; title: string; content: PortfolioReportContent | null }>;
  }>;
};

export function buildPortfolioLogicalDocument(input: PortfolioLogicalInput): PortfolioLogicalDocument {
  const performanceByKey = new Map(input.performanceSections.map((section) => [section.key, section]));
  const sections: PortfolioLogicalSection[] = [{
    id: "portfolio-cover",
    key: "cover",
    title: input.title,
    sortOrder: -1,
    isEnabled: true,
    blocks: [{ id: "portfolio-cover-block", type: "cover", breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.cover, payload: { title: input.title } }],
  }];

  for (const section of [...input.sections].sort((first, second) => first.sortOrder - second.sortOrder)) {
    const performance = performanceByKey.get(section.key);
    const blocks: PortfolioBlock[] = performance
      ? [
          { id: `${section.id}-divider`, type: "performance-divider", sectionKey: section.key, breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.performanceDivider, payload: { title: section.title, text: performance.intro } },
          ...performance.linkedOutputs.flatMap((output) => [{ id: `${output.id}-service-output`, type: "service-output" as const, sectionKey: section.key, breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.serviceOutput, payload: { output } }]),
          ...performance.reports.flatMap((report) => [
            { id: `${report.id}-report`, type: "report" as const, sectionKey: section.key, breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.report, payload: { reportId: report.id, title: report.title, content: report.content } },
            ...(report.content?.evidenceItems.length ? [{ id: `${report.id}-evidence`, type: "evidence" as const, sectionKey: section.key, breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.evidence, payload: { reportId: report.id, items: report.content.evidenceItems } }] : []),
          ]),
        ]
      : [{ id: `${section.id}-section`, type: section.kind === "profile" ? "profile" : "section-divider", sectionKey: section.key, breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.sectionDivider, payload: { title: section.title } }];
    sections.push({ id: section.id, key: section.key, title: section.title, sortOrder: section.sortOrder, isEnabled: section.isEnabled, blocks });
  }

  sections.push({ id: "portfolio-closing", key: "closing", title: "closing", sortOrder: Number.MAX_SAFE_INTEGER, isEnabled: true, blocks: [{ id: "portfolio-closing-block", type: "closing", breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.closing, payload: { title: "closing" } }] });
  return { sections };
}
