import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { generateSystemHealthReport } from "@/lib/admin/system-health-service";

export const runtime = "nodejs";

export async function GET() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const report = await generateSystemHealthReport();

  return NextResponse.json(report);
}
