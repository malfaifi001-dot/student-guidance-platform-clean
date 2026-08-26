import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import type { PortfolioServiceOutput } from "@/lib/portfolio/service-outputs/service-output-types";
import { PORTFOLIO_DEFAULT_BREAK_POLICIES, PORTFOLIO_PAGE_POLICIES } from "@/lib/portfolio/layout/portfolio-page-policy";
import type { PortfolioBlock } from "@/lib/portfolio/layout/portfolio-block-types";

export type PortfolioLogicalSection = {
  id: string;
  key: string;
  title: string;
  type: "cover" | "table-of-contents" | "introduction" | "educational-identity" | "biography" | "qualification" | "performance" | "evidence" | "closing";
  sortOrder: number;
  isEnabled: boolean;
  dedicatedPage: boolean;
  continuationBehavior: "none" | "continue";
  pagePolicy?: import("@/lib/portfolio/layout/portfolio-page-policy").PortfolioPagePolicy;
  blocks: PortfolioBlock[];
};

export type PortfolioLogicalDocument = { sections: PortfolioLogicalSection[] };

type StaticSection = { id: string; key: string; title: string; kind: string; sortOrder: number; isEnabled: boolean };
type Qualification = { id: string; title: string; type: string; issuer: string; date: string; hours: string; description: string; attachmentUrl: string; attachmentMimeType: string; attachmentKind: string; sortOrder: number; isVisible: boolean };

export type PortfolioLogicalInput = {
  title: string;
  introText?: string;
  conclusionText?: string;
  bioText?: string;
  sections: StaticSection[];
  biography?: unknown;
  educationIdentity?: unknown;
  qualificationItems?: Qualification[];
  customEvidence?: unknown[];
  preferences?: { showTableOfContents?: boolean; showPerformanceDividers?: boolean };
  performanceSections: Array<{
    id: string; key: string; title: string; sortOrder: number; isEnabled: boolean; intro: string;
    linkedOutputs: PortfolioServiceOutput[];
    reports: Array<{ id: string; title: string; content: PortfolioReportContent | null }>;
  }>;
};

function enabledSection(input: PortfolioLogicalInput, key: string) {
  return input.sections.find((section) => section.key === key)?.isEnabled !== false;
}

function orderOf(input: PortfolioLogicalInput, key: string, fallback: number) {
  return input.sections.find((section) => section.key === key)?.sortOrder ?? fallback;
}

export function buildPortfolioLogicalDocument(input: PortfolioLogicalInput): PortfolioLogicalDocument {
  const sections: PortfolioLogicalSection[] = [{
    id: "portfolio-cover", key: "cover", title: input.title, type: "cover", sortOrder: -1,
    isEnabled: true, dedicatedPage: true, continuationBehavior: "none", pagePolicy: PORTFOLIO_PAGE_POLICIES.cover,
    blocks: [{ id: "portfolio-cover-block", type: "cover", breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.cover, payload: { title: input.title } }],
  }];

  const addDedicated = (key: string, title: string, type: PortfolioLogicalSection["type"], sortOrder: number, data?: unknown) => {
    if (!enabledSection(input, key)) return;
    sections.push({
      id: `portfolio-${key}`, key, title, type, sortOrder, isEnabled: true, dedicatedPage: true, continuationBehavior: "none", pagePolicy: PORTFOLIO_PAGE_POLICIES[type] || PORTFOLIO_PAGE_POLICIES.introduction,
      blocks: [{ id: `portfolio-${key}-block`, type: "custom", breakPolicy: "ALWAYS_NEW_PAGE", sectionKey: key, payload: { title, data } }],
    });
  };

  if (input.preferences?.showTableOfContents) {
    addDedicated("table-of-contents", "فهرس الملف", "table-of-contents", 0, input.sections.filter((section) => section.isEnabled).map((section) => ({ key: section.key, title: section.title })));
  }
  addDedicated("introduction", "المقدمة", "introduction", orderOf(input, "introduction", 10), input.introText);
  addDedicated("educational-identity", "الهوية التعليمية", "educational-identity", orderOf(input, "introduction", 10) + 1, input.educationIdentity);
  addDedicated("profile", "السيرة المهنية", "biography", orderOf(input, "profile", 20), { biography: input.biography, bioText: input.bioText });

  const qualifications = (input.qualificationItems || []).filter((item) => item.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
  if (enabledSection(input, "qualifications") && qualifications.length) {
    for (const item of qualifications) {
      sections.push({
        id: `portfolio-qualification-${item.id}`, key: `qualification-${item.id}`, title: item.title, type: "qualification",
        sortOrder: orderOf(input, "qualifications", 30) + item.sortOrder / 1000, isEnabled: true, dedicatedPage: true, continuationBehavior: "none",
        blocks: [{ id: `portfolio-qualification-${item.id}-block`, type: "custom", breakPolicy: "ALWAYS_NEW_PAGE", sectionKey: "qualifications", payload: { title: item.title, data: item } }],
      });
    }
  }

  const performances = input.performanceSections
    .filter((section) => section.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  for (const performance of performances) {
    const blocks: PortfolioBlock[] = [];
    if (input.preferences?.showPerformanceDividers !== false) {
      blocks.push({ id: `${performance.id}-divider`, type: "performance-divider", sectionKey: performance.key, breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.performanceDivider, payload: { title: performance.title, text: performance.intro } });
    }
    blocks.push(...performance.linkedOutputs.map((output) => ({ id: `${output.id}-service-output`, type: "service-output" as const, sectionKey: performance.key, breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.serviceOutput, payload: { output } })));
    blocks.push(...performance.reports.flatMap((report) => [
      { id: `${report.id}-report`, type: "report" as const, sectionKey: performance.key, breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.report, payload: { reportId: report.id, title: report.title, content: report.content } },
      ...(report.content?.evidenceItems.length ? [{ id: `${report.id}-evidence`, type: "evidence" as const, sectionKey: performance.key, breakPolicy: PORTFOLIO_DEFAULT_BREAK_POLICIES.evidence, payload: { reportId: report.id, items: report.content.evidenceItems } }] : []),
    ]));
    if (blocks.length) sections.push({ id: performance.id, key: performance.key, title: performance.title, type: "performance", sortOrder: performance.sortOrder, isEnabled: true, dedicatedPage: false, continuationBehavior: "continue", pagePolicy: PORTFOLIO_PAGE_POLICIES.performance, blocks });
  }

  const standaloneEvidence = (input.customEvidence || []).filter((item) => Boolean(item));
  if (standaloneEvidence.length) {
    sections.push({ id: "portfolio-evidence", key: "reports-evidence", title: "التقارير والشواهد", type: "evidence", sortOrder: orderOf(input, "reports-evidence", 900), isEnabled: true, dedicatedPage: false, continuationBehavior: "continue", blocks: [{ id: "portfolio-evidence-block", type: "custom", breakPolicy: "CONTINUE_ON_NEXT_PAGE", sectionKey: "reports-evidence", payload: { title: "التقارير والشواهد", data: standaloneEvidence } }] });
  }
  if (enabledSection(input, "closing")) addDedicated("closing", "الخاتمة", "closing", orderOf(input, "closing", 1000), input.conclusionText);
  return { sections: sections.sort((a, b) => a.sortOrder - b.sortOrder) };
}
