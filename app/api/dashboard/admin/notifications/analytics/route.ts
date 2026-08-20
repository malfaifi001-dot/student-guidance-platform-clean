import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getPushAnalytics } from "@/lib/notifications/push-center-service";
import { PushCampaignStatus, PushCampaignType } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const type = url.searchParams.get("type") as PushCampaignType | null;
  const status = url.searchParams.get("status") as PushCampaignStatus | null;
  const validType = type && Object.values(PushCampaignType).includes(type) ? type : undefined;
  const validStatus = status && Object.values(PushCampaignStatus).includes(status) ? status : undefined;
  const parse = (value: string | null) => value ? new Date(value) : undefined;
  return NextResponse.json({ analytics: await getPushAnalytics({ from: parse(from), to: parse(to), type: validType, status: validStatus }) });
}
