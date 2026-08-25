import { NextResponse } from "next/server";
import { PushDeliveryStatus, UserRole } from "@prisma/client";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { cancelPushCampaign, duplicatePushCampaign, resendPushCampaign, retryFailedPushCampaign, setRecurringCampaignActive } from "@/lib/notifications/push-center-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { campaignId } = await context.params;
  const url = new URL(request.url);
  const requestedPage = Number(url.searchParams.get("page") || "1");
  const requestedPageSize = Number(url.searchParams.get("pageSize") || "20");
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const pageSize = Number.isFinite(requestedPageSize) ? Math.min(50, Math.max(10, Math.floor(requestedPageSize))) : 20;
  const status = url.searchParams.get("deliveryStatus");
  const platform = url.searchParams.get("platform");
  const errorCategory = url.searchParams.get("errorCategory");
  const role = url.searchParams.get("role");
  const opened = url.searchParams.get("opened");
  const search = url.searchParams.get("search")?.trim();
  const userFilters = [
    role && Object.values(UserRole).includes(role as UserRole) ? { role: role as UserRole } : null,
    search ? { name: { contains: search } } : null,
  ].filter((filter): filter is { role: UserRole } | { name: { contains: string } } => Boolean(filter));
  const deliveryWhere = {
    ...(status && Object.values(PushDeliveryStatus).includes(status as PushDeliveryStatus) ? { status: status as PushDeliveryStatus } : {}),
    ...(platform === "android" || platform === "ios" ? { device: { platform } } : {}),
    ...(errorCategory ? { errorCategory } : {}),
    ...(userFilters.length ? { user: { AND: userFilters } } : {}),
    ...(opened === "opened" ? { openedAt: { not: null } } : opened === "not-opened" ? { openedAt: null } : {}),
  };
  const campaign = await prisma.pushCampaign.findUnique({ where: { id: campaignId }, include: { createdBy: { select: { name: true, role: true } }, deliveries: { where: deliveryWhere, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, userId: true, deviceId: true, status: true, provider: true, attemptCount: true, attemptedAt: true, sentAt: true, failedAt: true, firebaseMessageId: true, errorCode: true, errorCategory: true, safeErrorMessage: true, retryable: true, invalidToken: true, openedAt: true, openedRoute: true, retryCount: true, lastRetryAt: true, nextRetryAt: true, user: { select: { name: true, role: true } }, device: { select: { platform: true, packageName: true, enabled: true, revokedAt: true, lastSeenAt: true, tokenHash: true } } } }, _count: { select: { deliveries: true } } } });
  if (!campaign) return NextResponse.json({ ok: false, error: { code: "CAMPAIGN_NOT_FOUND" } }, { status: 404 });
  const [deliveryTotal, invalidTokenCount, openedCount, pending, retrying, statusCounts, androidSent, androidFailed, iosSent, iosFailed] = await Promise.all([
    prisma.pushDelivery.count({ where: { campaignId, ...deliveryWhere } }),
    prisma.pushDelivery.count({ where: { campaignId, invalidToken: true } }),
    prisma.pushDelivery.count({ where: { campaignId, openedAt: { not: null } } }),
    prisma.pushDelivery.count({ where: { campaignId, status: PushDeliveryStatus.PENDING } }),
    prisma.pushDelivery.count({ where: { campaignId, nextRetryAt: { not: null } } }),
    prisma.pushDelivery.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } }),
    prisma.pushDelivery.count({ where: { campaignId, status: PushDeliveryStatus.SUCCESS, device: { platform: "android" } } }),
    prisma.pushDelivery.count({ where: { campaignId, status: PushDeliveryStatus.FAILED, device: { platform: "android" } } }),
    prisma.pushDelivery.count({ where: { campaignId, status: PushDeliveryStatus.SUCCESS, device: { platform: "ios" } } }),
    prisma.pushDelivery.count({ where: { campaignId, status: PushDeliveryStatus.FAILED, device: { platform: "ios" } } }),
  ]);
  const deliveries = campaign.deliveries.map((delivery) => ({ ...delivery, tokenFingerprint: delivery.device.tokenHash.slice(0, 12), device: { platform: delivery.device.platform, packageName: delivery.device.packageName, enabled: delivery.device.enabled, revokedAt: delivery.device.revokedAt, lastSeenAt: delivery.device.lastSeenAt } }));
  const statusMap = Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all]));
  const platformCounts = { android: { sent: androidSent, failed: androidFailed }, ios: { sent: iosSent, failed: iosFailed } };
  return NextResponse.json({ ok: true, campaign: { ...campaign, invalidTokenCount, openedCount, successRate: campaign.sentCount ? Math.round(campaign.successCount / campaign.sentCount * 100) : 0, openRate: campaign.successCount ? Math.round(openedCount / campaign.successCount * 100) : 0, diagnostics: { pending, retrying, statusCounts: statusMap, platform: platformCounts }, deliveries: { items: deliveries, total: deliveryTotal, page, pageSize, pages: Math.ceil(deliveryTotal / pageSize) } } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const canceled = await cancelPushCampaign((await context.params).campaignId, current.user.id);
  return NextResponse.json({ ok: canceled, error: canceled ? undefined : { code: "CAMPAIGN_NOT_SCHEDULED" } }, { status: canceled ? 200 : 409 });
}

export async function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const campaignId = (await context.params).campaignId;
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  try {
    if (body?.action === "duplicate") return NextResponse.json({ ok: true, campaign: await duplicatePushCampaign(campaignId, current.user.id) }, { status: 201 });
    if (body?.action === "resend") return NextResponse.json({ ok: true, campaign: await resendPushCampaign(campaignId, current.user.id) }, { status: 201 });
    if (body?.action === "retry-failed") return NextResponse.json({ ok: true, result: await retryFailedPushCampaign(campaignId, current.user.id) });
    return NextResponse.json({ ok: false, error: { code: "INVALID_CAMPAIGN_ACTION" } }, { status: 400 });
  } catch (error) {
    const code = error instanceof Error && ["CAMPAIGN_NOT_FOUND", "NO_RETRYABLE_DELIVERIES"].includes(error.message) ? error.message : "CAMPAIGN_ACTION_FAILED";
    return NextResponse.json({ ok: false, error: { code } }, { status: 409 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const body = await request.json().catch(() => null) as { recurrenceActive?: unknown } | null;
  if (typeof body?.recurrenceActive !== "boolean") return NextResponse.json({ ok: false, error: { code: "INVALID_RECURRENCE_STATE" } }, { status: 400 });
  try { return NextResponse.json({ ok: true, campaign: await setRecurringCampaignActive((await context.params).campaignId, body.recurrenceActive, current.user.id) }); }
  catch { return NextResponse.json({ ok: false, error: { code: "CAMPAIGN_NOT_RECURRING" } }, { status: 409 }); }
}
