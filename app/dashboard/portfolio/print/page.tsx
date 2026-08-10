import { PortfolioPrintRoute } from "@/components/portfolio/portfolio-route-views";

export default function Page(props: Parameters<typeof PortfolioPrintRoute>[0]) {
  return <PortfolioPrintRoute {...props} sharedRoute />;
}
