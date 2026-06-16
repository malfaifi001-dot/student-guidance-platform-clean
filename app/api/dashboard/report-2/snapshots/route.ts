import { NextResponse } from "next/server";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { listReportTwoSnapshots } from "@/lib/report-2/report-snapshot-service";

export async function GET() {
  const context = await requireDashboardApiContext();

  if (context instanceof NextResponse) {
    return context;
  }

  const snapshots = await listReportTwoSnapshots(context);

  return NextResponse.json({
    snapshots,
  });
}
