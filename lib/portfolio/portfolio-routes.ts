export type PortfolioRouteSet = {
  base: string;
  preview: string;
  print: string;
  snapshots: string;
};

export function getPortfolioRoutes(role?: string | null): PortfolioRouteSet {
  const base = role === "TEACHER"
    ? "/dashboard/teacher/portfolio"
    : role === "ACTIVITY_LEADER"
      ? "/dashboard/activity-leader/portfolio"
      : role === "PRINCIPAL"
        ? "/dashboard/principal/portfolio"
        : "/dashboard/portfolio";

  return {
    base,
    preview: `${base}/preview`,
    print: role === "TEACHER" ? "/teacher/portfolio/print" : `${base}/print`,
    snapshots: `${base}/snapshots`,
  };
}
