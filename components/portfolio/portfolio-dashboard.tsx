import type { TeacherPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";

export function PortfolioDashboard({ data }: { data: TeacherPortfolioWorkspace }) {
  return <PortfolioWorkspace initialData={data} />;
}
