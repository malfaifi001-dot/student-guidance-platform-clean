import type { PortfolioBlock } from "@/lib/portfolio/layout/portfolio-block-types";
import type { PortfolioLogicalDocument } from "@/lib/portfolio/layout/portfolio-logical-document";
import type { PortfolioPhysicalDocument, PortfolioPhysicalPage, PortfolioPhysicalPageRole } from "@/lib/portfolio/layout/portfolio-physical-types";
import { getPortfolioServiceOutputChunks } from "@/lib/portfolio/service-outputs/service-output-types";

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
        const chunks = getPortfolioServiceOutputChunks(block.payload.output);
        const outputPages = chunks.map((chunk, index) => ({
          id: `${block.id}-page-${index + 1}`,
          role: "service-output" as const,
          sectionKey: section.key,
          sourceSectionIds: [section.id],
          continuationIndex: index,
          blocks: [{ ...block, payload: { ...block.payload, chunk } }],
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
  return pages.flatMap((page) => page.blocks.flatMap((block) => block.type === "service-output" && block.payload.chunk?.kind === "curriculum-distribution" ? [block.payload.chunk.weeks] : []));
}

export function getPlannedServiceOutputChunks(document: PortfolioPhysicalDocument | undefined, outputId: string) {
  return (document?.serviceOutputPages[outputId] || []).flatMap((page) =>
    page.blocks.flatMap((block) => block.type === "service-output" && block.payload.chunk ? [block.payload.chunk] : []),
  );
}
