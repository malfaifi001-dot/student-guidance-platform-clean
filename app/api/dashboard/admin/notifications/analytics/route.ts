import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getPushAnalytics } from "@/lib/notifications/push-center-service";
import { PushAudienceType, PushCampaignStatus, PushCampaignType, UserRole } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const type = url.searchParams.get("type") as PushCampaignType | null;
  const status = url.searchParams.get("status") as PushCampaignStatus | null;
  const audienceType = url.searchParams.get("audienceType") as PushAudienceType | null;
  const role = url.searchParams.get("role") as UserRole | null;
  const validType = type && Object.values(PushCampaignType).includes(type) ? type : undefined;
  const validStatus = status && Object.values(PushCampaignStatus).includes(status) ? status : undefined;
  const validAudience = audienceType && Object.values(PushAudienceType).includes(audienceType) ? audienceType : undefined;
  const validRole = role && Object.values(UserRole).includes(role) ? role : undefined;
  const preset = url.searchParams.get("preset");
  const now = new Date();
  const presetDays = preset === "today" ? 1 : preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const parse = (value: string | null) => { if (!value) return undefined; const date = new Date(value); return Number.isNaN(date.getTime()) ? undefined : date; };
  return NextResponse.json({ analytics: await getPushAnalytics({ from: parse(from) || new Date(now.getTime() - presetDays * 86_400_000), to: parse(to) || now, type: validType, status: validStatus, audienceType: validAudience, role: validRole }) });
}
