import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getAdminInsightData, isAdminInsightMetric } from "@/lib/admin-insights/admin-insights-service";

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const metric = new URL(request.url).searchParams.get("metric") || "cases";
  if (!isAdminInsightMetric(metric)) return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
  return NextResponse.json(await getAdminInsightData(metric));
}
