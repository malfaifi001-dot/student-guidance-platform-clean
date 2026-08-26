import { buildPortfolioReportPages, chunkPortfolioItems } from "@/components/portfolio/print/portfolio-print-pagination";
import type { PortfolioBlock } from "@/lib/portfolio/layout/portfolio-block-types";
import type { PortfolioLogicalDocument, PortfolioLogicalSection } from "@/lib/portfolio/layout/portfolio-logical-document";
import type { PortfolioPhysicalDocument, PortfolioPhysicalPage, PortfolioPhysicalPageRole, PortfolioPhysicalPageType } from "@/lib/portfolio/layout/portfolio-physical-types";
import { getPortfolioServiceOutputChunks, type PortfolioCurriculumWeek, type PortfolioServiceOutputChunk } from "@/lib/portfolio/service-outputs/service-output-types";
import { getPortfolioFrame } from "@/lib/portfolio/layout/portfolio-frame-registry";
import type { PortfolioThemeId } from "@/lib/portfolio/portfolio-theme-registry";

function roleForPageType(pageType: PortfolioPhysicalPageType): PortfolioPhysicalPageRole {
  if (pageType === "cover") return "cover";
  if (pageType === "performance-divider") return "performance-divider";
  if (pageType === "service-output") return "service-output";
  if (pageType === "report" || pageType === "report-evidence") return "report";
  if (pageType === "portfolio-evidence") return "evidence";
  if (pageType === "closing") return "closing";
  return "section";
}

function pageTypeForSection(section: PortfolioLogicalSection, block: PortfolioBlock): PortfolioPhysicalPageType {
  if (block.type === "cover") return "cover";
  if (block.type === "performance-divider") return "performance-divider";
  if (block.type === "service-output") return "service-output";
  if (block.type === "report") return "report";
  if (block.type === "evidence") return "report-evidence";
  if (section.type === "introduction") return "introduction";
  if (section.type === "table-of-contents") return "table-of-contents";
  if (section.type === "educational-identity") return "educational-identity";
  if (section.type === "biography") return "biography";
  if (section.type === "qualification") return "qualification";
  if (section.type === "evidence") return "portfolio-evidence";
  if (section.type === "closing") return "closing";
  return "introduction";
}

function makePage(section: PortfolioLogicalSection, block: PortfolioBlock, pageType: PortfolioPhysicalPageType, id: string, payload: unknown, continuationIndex?: number, continuationCount?: number): PortfolioPhysicalPage {
  return {
    id, role: roleForPageType(pageType), pageType, sectionKey: section.key, sectionTitle: section.title, sourceSectionId: section.id,
    sourceSectionIds: [section.id], blocks: [{ ...block, ...(payload === undefined ? {} : { payload } as never) } as PortfolioBlock],
    continuationIndex, continuationCount, dedicatedPage: section.dedicatedPage,
    startsNewPhysicalPage: section.pagePolicy?.startsNewPhysicalPage,
    canContinue: section.pagePolicy?.canContinue,
    canShareWithNextSection: section.pagePolicy?.canShareWithNextSection,
    density: payload && typeof payload === "object" && "page" in payload ? (payload as { page?: { layoutCandidate?: import("@/lib/portfolio/layout/portfolio-smart-a4-types").PortfolioSmartLayoutCandidate } }).page?.layoutCandidate : undefined,
    evidenceLayout: payload && typeof payload === "object" && "page" in payload ? (payload as { page?: { evidenceLayout?: import("@/lib/portfolio/layout/portfolio-smart-a4-types").PortfolioEvidenceLayout } }).page?.evidenceLayout : undefined,
    primaryEvidenceCount: payload && typeof payload === "object" && "page" in payload ? (payload as { page?: { primaryEvidenceCount?: 0 | 1 | 2 } }).page?.primaryEvidenceCount : undefined,
    overflowEvidenceCount: payload && typeof payload === "object" && "page" in payload ? (payload as { page?: { overflowEvidenceCount?: number } }).page?.overflowEvidenceCount : undefined,
    payload,
  };
}

export function planPortfolioPhysicalDocument(document: PortfolioLogicalDocument, themeId: PortfolioThemeId = "ministry-elegant"): PortfolioPhysicalDocument {
  const pages: PortfolioPhysicalPage[] = [];
  const serviceOutputPages: Record<string, PortfolioPhysicalPage[]> = {};
  const reportPages: Record<string, PortfolioPhysicalPage[]> = {};
  const evidencePages: Record<string, PortfolioPhysicalPage[]> = {};

  for (const section of document.sections.filter((item) => item.isEnabled)) {
    for (const block of section.blocks) {
      if (block.type === "service-output") {
        const chunks = getPortfolioServiceOutputChunks(block.payload.output);
        const outputPages = chunks.map((chunk, index) => makePage(section, block, "service-output", `${block.id}-page-${index + 1}`, { ...block.payload, chunk }, index, chunks.length));
        serviceOutputPages[block.payload.output.id] = outputPages;
        pages.push(...outputPages);
        continue;
      }
      if (block.type === "report" && block.payload.content) {
        const models = buildPortfolioReportPages(block.payload.content);
        const planned = models.map((model, index) => makePage(section, block, "report", `${block.id}-page-${index + 1}`, { ...block.payload, page: model }, index, models.length));
        reportPages[block.payload.reportId] = planned;
        evidencePages[block.payload.reportId] = planned.filter((page) => {
          const payload = page.payload;
          return Boolean(payload && typeof payload === "object" && "page" in payload && Array.isArray((payload as { page?: { sections?: unknown[] } }).page?.sections) && (payload as { page: { sections: Array<{ kind?: string }> } }).page.sections.some((section) => section.kind === "evidence"));
        });
        pages.push(...planned);
        continue;
      }
      if (block.type === "evidence") {
        // Report evidence is negotiated with the report body above; do not add a second copy.
        continue;
      }
      if (block.type === "custom" && section.type === "evidence" && Array.isArray(block.payload.data)) {
        const chunks = chunkPortfolioItems(block.payload.data, 2);
        const planned = chunks.map((items, index) => makePage(section, block, "portfolio-evidence", `${block.id}-page-${index + 1}`, { ...block.payload, data: items }, index, chunks.length));
        pages.push(...planned);
        continue;
      }
      pages.push(makePage(section, block, pageTypeForSection(section, block), `${block.id}-page`, block.payload, 0, 1));
    }
  }
  return { pages, frame: getPortfolioFrame(themeId), serviceOutputPages, reportPages, evidencePages };
}

export function getPlannedServiceOutputWeeks(document: PortfolioPhysicalDocument | undefined, outputId: string): PortfolioCurriculumWeek[][] {
  return (document?.serviceOutputPages[outputId] || []).flatMap((page) => {
    const chunk = page.payload && typeof page.payload === "object" && "chunk" in page.payload ? (page.payload as { chunk?: { kind?: string; weeks?: unknown[] } }).chunk : undefined;
    return chunk?.kind === "curriculum-distribution" ? [chunk.weeks || []] : [];
  }) as PortfolioCurriculumWeek[][];
}

export function getPlannedServiceOutputChunks(document: PortfolioPhysicalDocument | undefined, outputId: string) {
  return (document?.serviceOutputPages[outputId] || []).flatMap((page) => {
    const chunk = page.payload && typeof page.payload === "object" && "chunk" in page.payload ? (page.payload as { chunk?: unknown }).chunk : undefined;
    return chunk ? [chunk] : [];
  }) as PortfolioServiceOutputChunk[];
}

export function getPlannedReportPages(document: PortfolioPhysicalDocument, reportId: string) {
  return (document.reportPages[reportId] || []).flatMap((page) => {
    const payload = page.payload;
    return payload && typeof payload === "object" && "page" in payload ? [(payload as { page: unknown }).page] : [];
  }) as import("@/components/portfolio/print/portfolio-print-types").PortfolioReportPageModel[];
}
