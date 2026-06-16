import { NextResponse } from "next/server";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { getReportTwoSnapshotById } from "@/lib/report-2/report-snapshot-service";

type RouteContext = {
  params: Promise<{
    snapshotId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const dashboardContext = await requireDashboardApiContext();

  if (dashboardContext instanceof NextResponse) {
    return dashboardContext;
  }

  const { snapshotId } = await context.params;
  const snapshot = await getReportTwoSnapshotById(dashboardContext, snapshotId);

  if (!snapshot) {
    return NextResponse.json(
      {
        error: "التقرير المعتمد غير موجود.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    snapshot,
  });
}
