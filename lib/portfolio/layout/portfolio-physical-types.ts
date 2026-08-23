import type { PortfolioBlock } from "@/lib/portfolio/layout/portfolio-block-types";

export type PortfolioPhysicalPageRole = "cover" | "section" | "performance-divider" | "content" | "service-output" | "report" | "evidence" | "closing";

export type PortfolioPhysicalPage = {
  id: string;
  role: PortfolioPhysicalPageRole;
  sectionKey?: string;
  blocks: PortfolioBlock[];
  sourceSectionIds: string[];
  continuationIndex?: number;
};

export type PortfolioPhysicalDocument = {
  pages: PortfolioPhysicalPage[];
  serviceOutputPages: Record<string, PortfolioPhysicalPage[]>;
};

