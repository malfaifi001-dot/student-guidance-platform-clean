import { PortfolioPreviewRoute } from "@/components/portfolio/portfolio-route-views";

export default function Page(props: Parameters<typeof PortfolioPreviewRoute>[0]) {
  return <PortfolioPreviewRoute {...props} sharedRoute />;
}
