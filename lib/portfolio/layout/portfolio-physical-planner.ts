import type { PortfolioBlock } from "@/lib/portfolio/layout/portfolio-block-types";
import type { PortfolioLogicalDocument } from "@/lib/portfolio/layout/portfolio-logical-document";
import type { PortfolioPhysicalDocument, PortfolioPhysicalPage, PortfolioPhysicalPageRole } from "@/lib/portfolio/layout/portfolio-physical-types";

function roleForBlock(block: PortfolioBlock): PortfolioPhysicalPageRole {
  if (block.type === "cover") return "cover";
  if (block.type === "performance-divider") return "performance-divider";
  if (block.type === "service-output") return "service-output";
  if (block.type === "report") return "report";
  if (block.type === "evidence") return "evidence";
  if (block.type === "closing") return "closing";
  return "section";
}

export function planPortfolioPhysicalDocument(document: PortfolioLogicalDocument): PortfolioPhysicalDocument {
  const pages: PortfolioPhysicalPage[] = [];
  const serviceOutputPages: Record<string, PortfolioPhysicalPage[]> = {};
  const append = (page: PortfolioPhysicalPage) => pages.push(page);

  for (const section of document.sections.filter((item) => item.isEnabled)) {
    for (const block of section.blocks) {
      if (block.type === "service-output") {
        const weeksPerPage = Math.max(1, Math.ceil(block.payload.weeks.length / 2));
        const chunks: typeof block.payload.weeks[] = [];
        for (let index = 0; index < block.payload.weeks.length; index += weeksPerPage) chunks.push(block.payload.weeks.slice(index, index + weeksPerPage));
        const outputPages = chunks.map((weeks, index) => ({
          id: `${block.id}-page-${index + 1}`,
          role: "service-output" as const,
          sectionKey: section.key,
          sourceSectionIds: [section.id],
          continuationIndex: index,
          blocks: [{ ...block, payload: { ...block.payload, weeks } }],
        }));
        serviceOutputPages[block.payload.output.id] = outputPages;
        outputPages.forEach(append);
        continue;
      }
      const page: PortfolioPhysicalPage = { id: `${block.id}-page`, role: roleForBlock(block), sectionKey: section.key, blocks: [block], sourceSectionIds: [section.id] };
      append(page);
    }
  }
  return { pages, serviceOutputPages };
}

export function getPlannedServiceOutputWeeks(document: PortfolioPhysicalDocument | undefined, outputId: string) {
  const pages = document?.serviceOutputPages[outputId] || [];
  return pages.flatMap((page) => page.blocks.flatMap((block) => block.type === "service-output" ? [block.payload.weeks] : []));
}
