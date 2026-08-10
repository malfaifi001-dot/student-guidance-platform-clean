import { PortfolioDashboardRoute } from "@/components/portfolio/portfolio-route-views";

export default function Page(props: Parameters<typeof PortfolioDashboardRoute>[0]) {
  return <PortfolioDashboardRoute {...props} sharedRoute />;
}
