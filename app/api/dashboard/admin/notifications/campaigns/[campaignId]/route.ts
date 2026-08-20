import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { cancelPushCampaign, duplicatePushCampaign, resendPushCampaign } from "@/lib/notifications/push-center-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const { campaignId } = await context.params;
  const campaign = await prisma.pushCampaign.findUnique({ where: { id: campaignId }, include: { createdBy: { select: { name: true, role: true } }, deliveries: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, userId: true, deviceId: true, status: true, attemptedAt: true, errorCode: true, invalidToken: true, openedAt: true, openedRoute: true } } } });
  if (!campaign) return NextResponse.json({ ok: false, error: { code: "CAMPAIGN_NOT_FOUND" } }, { status: 404 });
  return NextResponse.json({ ok: true, campaign });
}

export async function DELETE(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { campaignId } = await context.params;
  const canceled = await cancelPushCampaign(campaignId, current.user.id);
  return NextResponse.json({ ok: canceled, error: canceled ? undefined : { code: "CAMPAIGN_NOT_SCHEDULED" } }, { status: canceled ? 200 : 409 });
}

export async function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const { campaignId } = await context.params;
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  try {
    if (body?.action === "duplicate") return NextResponse.json({ ok: true, campaign: await duplicatePushCampaign(campaignId, current.user.id) }, { status: 201 });
    if (body?.action === "resend") return NextResponse.json({ ok: true, campaign: await resendPushCampaign(campaignId, current.user.id) }, { status: 201 });
    return NextResponse.json({ ok: false, error: { code: "INVALID_CAMPAIGN_ACTION" } }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { code: error instanceof Error && error.message === "CAMPAIGN_NOT_FOUND" ? error.message : "CAMPAIGN_ACTION_FAILED" } }, { status: 400 });
  }
}
