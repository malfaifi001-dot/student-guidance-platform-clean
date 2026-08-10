import { PortfolioSnapshotRoute } from "@/components/portfolio/portfolio-route-views";

export default function Page(props: Parameters<typeof PortfolioSnapshotRoute>[0]) {
  return <PortfolioSnapshotRoute {...props} sharedRoute />;
}
