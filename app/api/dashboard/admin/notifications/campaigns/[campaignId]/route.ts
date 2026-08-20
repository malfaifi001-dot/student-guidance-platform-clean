import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { cancelPushCampaign, duplicatePushCampaign, resendPushCampaign, setRecurringCampaignActive } from "@/lib/notifications/push-center-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const { campaignId } = await context.params;
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(10, Number(url.searchParams.get("pageSize") || "20")));
  const deliveryStatus = url.searchParams.get("deliveryStatus");
  const role = url.searchParams.get("role");
  const deliveryWhere = {
    ...(deliveryStatus && ["PENDING", "SUCCESS", "FAILED"].includes(deliveryStatus) ? { status: deliveryStatus as "PENDING" | "SUCCESS" | "FAILED" } : {}),
    ...(role ? { user: { role: role as "ADMIN" | "COUNSELOR" | "ACTIVITY_LEADER" | "TEACHER" | "PRINCIPAL" | "SCHOOL_OWNER" | "STAFF" } } : {}),
  };
  const campaign = await prisma.pushCampaign.findUnique({ where: { id: campaignId }, include: { createdBy: { select: { name: true, role: true } }, deliveries: { where: deliveryWhere, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, userId: true, deviceId: true, status: true, attemptedAt: true, errorCode: true, invalidToken: true, openedAt: true, openedRoute: true, retryCount: true, lastRetryAt: true, nextRetryAt: true, user: { select: { name: true, role: true } }, device: { select: { platform: true, packageName: true } } } }, _count: { select: { deliveries: true } } } });
  if (!campaign) return NextResponse.json({ ok: false, error: { code: "CAMPAIGN_NOT_FOUND" } }, { status: 404 });
  const [invalidTokenCount, openedCount, deliveryTotal] = await Promise.all([
    prisma.pushDelivery.count({ where: { campaignId, invalidToken: true } }),
    prisma.pushDelivery.count({ where: { campaignId, openedAt: { not: null } } }),
    prisma.pushDelivery.count({ where: { campaignId, ...deliveryWhere } }),
  ]);
  return NextResponse.json({ ok: true, campaign: { ...campaign, invalidTokenCount, openedCount, successRate: campaign.sentCount ? Math.round(campaign.successCount / campaign.sentCount * 100) : 0, openRate: campaign.successCount ? Math.round(openedCount / campaign.successCount * 100) : 0, deliveries: { items: campaign.deliveries, total: deliveryTotal, page, pageSize, pages: Math.ceil(deliveryTotal / pageSize) } } });
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

export async function PATCH(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const { campaignId } = await context.params;
  const body = await request.json().catch(() => null) as { recurrenceActive?: unknown } | null;
  if (typeof body?.recurrenceActive !== "boolean") return NextResponse.json({ ok: false, error: { code: "INVALID_RECURRENCE_STATE" } }, { status: 400 });
  try { return NextResponse.json({ ok: true, campaign: await setRecurringCampaignActive(campaignId, body.recurrenceActive, current.user.id) }); }
  catch { return NextResponse.json({ ok: false, error: { code: "CAMPAIGN_NOT_RECURRING" } }, { status: 409 }); }
}
