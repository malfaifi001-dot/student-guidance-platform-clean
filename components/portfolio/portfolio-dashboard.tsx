import type { PortfolioWorkspaceData } from "@/lib/portfolio/portfolio-read-model";
import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";

export function PortfolioDashboard({ data }: { data: PortfolioWorkspaceData }) {
  return <PortfolioWorkspace initialData={data} />;
}
