import {
  Prisma,
  PushCampaignStatus,
  PushCampaignType,
  PushAudienceType,
  PushDeliveryStatus,
  PushRecurrenceFrequency,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";

import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";
import { getSafePushRoute } from "@/lib/notifications/push-routing";
import { sendPushToDevice, sendPushToDeviceBatch } from "@/lib/notifications/fcm-server";

const ACTIVE_DEVICE_WHERE = {
  platform: { in: ["android", "ios"] },
  packageName: "sa.teachix.app",
  enabled: true,
  revokedAt: null,
};

const SUPPORTED_ROLES = Object.values(UserRole);
const MAX_DELIVERY_RETRIES = 3;
const TRANSIENT_PUSH_ERRORS = new Set([
  "messaging/internal-error",
  "messaging/server-unavailable",
  "messaging/quota-exceeded",
  "messaging/unknown-error",
]);

export type PushAudienceInput = {
  audienceType: "ALL_USERS" | "ROLE" | "USER" | "USERS" | "SCHOOL";
  role?: string;
  userId?: string;
  userIds?: string[];
  schoolAccountId?: string;
};

export type CreatePushCampaignInput = PushAudienceInput & {
  campaignType?: PushCampaignType;
  templateId?: string;
  name?: string;
  title: string;
  body: string;
  route: string;
  internalNote?: string;
  sendNow?: boolean;
  scheduledAt?: string | null;
  timezone?: string | null;
  recurrenceFrequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "WEEKDAYS" | null;
  recurrenceDays?: number[];
  recurrenceEndAt?: string | null;
};

function normalizeAudience(input: PushAudienceInput): { type: PushAudienceType; config: Prisma.InputJsonValue } {
  const type = input.audienceType as PushAudienceType;
  if (!Object.values(PushAudienceType).includes(type)) throw new Error("INVALID_AUDIENCE_TYPE");

  if (type === PushAudienceType.ROLE) {
    if (!input.role || !SUPPORTED_ROLES.includes(input.role as UserRole)) throw new Error("INVALID_AUDIENCE_ROLE");
    return { type, config: { role: input.role } };
  }
  if (type === PushAudienceType.USER) {
    if (!input.userId) throw new Error("MISSING_AUDIENCE_USER");
    return { type, config: { userId: input.userId } };
  }
  if (type === PushAudienceType.USERS) {
    const userIds = [...new Set(input.userIds || [])].filter(Boolean);
    if (userIds.length === 0 || userIds.length > 1000) throw new Error("INVALID_AUDIENCE_USERS");
    return { type, config: { userIds } };
  }
  if (type === PushAudienceType.SCHOOL) {
    if (!input.schoolAccountId) throw new Error("MISSING_AUDIENCE_SCHOOL");
    return { type, config: { schoolAccountId: input.schoolAccountId } };
  }
  return { type: PushAudienceType.ALL_USERS, config: {} };
}

function audienceWhere(type: PushAudienceType, config: Record<string, unknown>): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { isActive: true };
  if (type === PushAudienceType.ROLE && typeof config.role === "string") where.role = config.role as UserRole;
  if (type === PushAudienceType.USER && typeof config.userId === "string") where.id = config.userId;
  if (type === PushAudienceType.USERS && Array.isArray(config.userIds)) where.id = { in: config.userIds.filter((id): id is string => typeof id === "string") };
  if (type === PushAudienceType.SCHOOL && typeof config.schoolAccountId === "string") where.schoolAccountId = config.schoolAccountId;
  return where;
}

export async function resolvePushAudience(type: PushAudienceType, config: Record<string, unknown>) {
  const users = await prisma.user.findMany({
    where: {
      ...audienceWhere(type, config),
      pushDevices: { some: ACTIVE_DEVICE_WHERE },
    },
    select: {
      id: true,
      role: true,
      pushDevices: { where: ACTIVE_DEVICE_WHERE, select: { id: true, tokenHash: true, encryptedToken: true } },
    },
  });

  const allUsers = await prisma.user.count({ where: audienceWhere(type, config) });
  const devices = users.flatMap((user) => user.pushDevices.map((device) => ({ ...device, userId: user.id })));
  return { users, devices, userCount: allUsers, deviceCount: devices.length };
}

function validateMessage(input: Pick<CreatePushCampaignInput, "title" | "body" | "route">) {
  const title = input.title.trim();
  const body = input.body.trim();
  const route = getSafePushRoute(input.route);
  if (!title || title.length > 120) throw new Error("INVALID_PUSH_TITLE");
  if (!body || body.length > 500) throw new Error("INVALID_PUSH_BODY");
  if (!route) throw new Error("INVALID_PUSH_ROUTE");
  return { title, body, route };
}

function parseFutureDate(value: string | null | undefined, required: boolean) {
  if (!value) {
    if (required) throw new Error("MISSING_SCHEDULE_DATE");
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) throw new Error("INVALID_SCHEDULE_DATE");
  return date;
}

export async function getPushAudienceEstimate(input: PushAudienceInput) {
  const audience = normalizeAudience(input);
  const result = await resolvePushAudience(audience.type, audience.config as Record<string, unknown>);
  return { audienceType: audience.type, userCount: result.userCount, deviceCount: result.deviceCount };
}

export async function createPushCampaign(input: CreatePushCampaignInput, createdById: string) {
  const template = input.templateId ? await prisma.pushTemplate.findFirst({ where: { id: input.templateId, enabled: true }, select: { title: true, body: true, route: true } }) : null;
  const message = validateMessage({ title: template?.title || input.title, body: template?.body || input.body, route: template?.route || input.route });
  const audience = normalizeAudience(input);
  const isRecurring = Boolean(input.recurrenceFrequency);
  const scheduledAt = input.sendNow ? null : parseFutureDate(input.scheduledAt, true);
  if (isRecurring && !scheduledAt) throw new Error("RECURRING_REQUIRES_SCHEDULE");
  if (input.recurrenceEndAt && !isRecurring) throw new Error("RECURRENCE_REQUIRES_FREQUENCY");

  const estimate = await resolvePushAudience(audience.type, audience.config as Record<string, unknown>);
  const campaign = await prisma.pushCampaign.create({
    data: {
      name: input.name?.trim() || null,
      title: message.title,
      body: message.body,
      route: message.route,
      type: input.campaignType || (isRecurring ? PushCampaignType.RECURRING : input.sendNow ? PushCampaignType.MANUAL : PushCampaignType.SCHEDULED),
      status: input.sendNow ? PushCampaignStatus.PROCESSING : PushCampaignStatus.SCHEDULED,
      processingStartedAt: input.sendNow ? new Date() : null,
      audienceType: audience.type,
      audienceConfig: audience.config,
      internalNote: input.internalNote?.trim() || null,
      scheduledAt,
      timezone: input.timezone || "Asia/Riyadh",
      recurrenceFrequency: input.recurrenceFrequency ? input.recurrenceFrequency as PushRecurrenceFrequency : null,
      recurrenceDays: input.recurrenceDays?.length ? input.recurrenceDays : Prisma.JsonNull,
      recurrenceEndAt: input.recurrenceEndAt ? parseFutureDate(input.recurrenceEndAt, false) : null,
      recurrenceActive: isRecurring,
      estimatedUserCount: estimate.userCount,
      estimatedDeviceCount: estimate.deviceCount,
      createdById,
    },
  });

  await logAdminActivity({ actorUserId: createdById, category: "SYSTEM", action: "push-campaign-created", severity: "INFO", title: "Push campaign created", details: { campaignId: campaign.id, type: campaign.type } });
  if (input.sendNow) {
    try {
      await executePushCampaign(campaign.id, createdById);
    } catch (error) {
      await prisma.pushCampaign.update({ where: { id: campaign.id }, data: { status: PushCampaignStatus.FAILED, lastErrorCode: "PUSH_CAMPAIGN_EXECUTION_FAILED", completedAt: new Date() } });
      throw error;
    }
  }
  return prisma.pushCampaign.findUnique({ where: { id: campaign.id } });
}

function nextRecurringDate(campaign: { scheduledAt: Date | null; recurrenceFrequency: PushRecurrenceFrequency | null; recurrenceDays: Prisma.JsonValue }) {
  if (!campaign.scheduledAt || !campaign.recurrenceFrequency) return null;
  const next = new Date(campaign.scheduledAt);
  if (campaign.recurrenceFrequency === PushRecurrenceFrequency.DAILY) next.setUTCDate(next.getUTCDate() + 1);
  if (campaign.recurrenceFrequency === PushRecurrenceFrequency.WEEKLY) next.setUTCDate(next.getUTCDate() + 7);
  if (campaign.recurrenceFrequency === PushRecurrenceFrequency.MONTHLY) next.setUTCMonth(next.getUTCMonth() + 1);
  if (campaign.recurrenceFrequency === PushRecurrenceFrequency.WEEKDAYS) {
    next.setUTCDate(next.getUTCDate() + 1);
    while ([0, 6].includes(next.getUTCDay())) next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

function isRetryablePushError(code: string | null | undefined) {
  return Boolean(code && TRANSIENT_PUSH_ERRORS.has(code));
}

function retryAt(attempt: number) {
  const minutes = Math.min(30, 2 ** Math.max(0, attempt - 1));
  return new Date(Date.now() + minutes * 60_000);
}

export async function executePushCampaign(campaignId: string, actorUserId?: string) {
  const campaign = await prisma.pushCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status === PushCampaignStatus.CANCELED) throw new Error("CAMPAIGN_NOT_EXECUTABLE");

  const audience = await resolvePushAudience(campaign.audienceType, campaign.audienceConfig as Record<string, unknown>);
  await prisma.pushDelivery.createMany({
    data: audience.devices.map((device) => ({ campaignId, userId: device.userId, deviceId: device.id })),
    skipDuplicates: true,
  });
  const now = new Date();
  const deliveries = await prisma.pushDelivery.findMany({
    where: {
      campaignId,
      OR: [
        { status: PushDeliveryStatus.PENDING },
        { status: PushDeliveryStatus.FAILED, nextRetryAt: { lte: now }, retryCount: { lt: MAX_DELIVERY_RETRIES } },
      ],
    },
    select: { id: true, userId: true, deviceId: true, retryCount: true, device: { select: { tokenHash: true, encryptedToken: true } } },
  });
  const results = await sendPushToDeviceBatch(deliveries.map((delivery) => ({ id: delivery.id, ...delivery.device })), {
    title: campaign.title,
    body: campaign.body,
    route: campaign.route,
    type: "system-announcement",
    campaignId: campaign.id,
  });
  const resultById = new Map(results.map((result) => [result.id, result]));
  await Promise.all(deliveries.map((delivery) => {
    const result = resultById.get(delivery.id);
    const attemptedAt = new Date();
    const nextRetry = !result?.success && !result?.invalidToken && (result?.retryable || isRetryablePushError(result?.errorCode)) && delivery.retryCount + 1 < MAX_DELIVERY_RETRIES ? retryAt(delivery.retryCount + 1) : null;
    return prisma.pushDelivery.update({ where: { id: delivery.id }, data: { status: result?.success ? PushDeliveryStatus.SUCCESS : PushDeliveryStatus.FAILED, provider: "firebase-cloud-messaging", attemptCount: { increment: 1 }, attemptedAt, sentAt: result?.success ? attemptedAt : undefined, failedAt: result?.success ? undefined : attemptedAt, firebaseMessageId: result?.messageId || null, errorCode: result?.errorCode || null, errorCategory: result?.errorCategory || null, safeErrorMessage: result?.safeErrorMessage || null, retryable: Boolean(nextRetry), invalidToken: result?.invalidToken || false, retryCount: { increment: 1 }, lastRetryAt: delivery.retryCount ? attemptedAt : null, nextRetryAt: nextRetry } });
  }));

  const successCount = results.filter((result) => result.success).length;
  const failureCount = results.length - successCount;
  const pendingRetry = await prisma.pushDelivery.count({ where: { campaignId, nextRetryAt: { not: null } } });
  const next = campaign.recurrenceActive ? nextRecurringDate(campaign) : null;
  const recurrenceStillActive = Boolean(next && (!campaign.recurrenceEndAt || next <= campaign.recurrenceEndAt));
  await prisma.pushCampaign.update({
    where: { id: campaignId },
    data: {
      status: recurrenceStillActive ? PushCampaignStatus.SCHEDULED : pendingRetry > 0 ? PushCampaignStatus.PARTIALLY_FAILED : successCount > 0 && failureCount > 0 ? PushCampaignStatus.PARTIALLY_FAILED : successCount > 0 ? PushCampaignStatus.SENT : PushCampaignStatus.FAILED,
      scheduledAt: recurrenceStillActive ? next : campaign.scheduledAt,
      recurrenceActive: recurrenceStillActive,
      startedAt: campaign.startedAt || new Date(),
      completedAt: recurrenceStillActive ? null : new Date(),
      sentCount: { increment: results.length },
      successCount: { increment: successCount },
      failureCount: { increment: failureCount },
    },
  });
  if (actorUserId) await logAdminActivity({ actorUserId, category: "SYSTEM", action: "push-campaign-sent", severity: successCount ? "SUCCESS" : "ERROR", title: "Push campaign sent", details: { campaignId, successCount, failureCount } });
  return { campaignId, attempted: results.length, successCount, failureCount };
}

export async function sendPushTestToDevice(device: { id: string; userId: string; tokenHash: string; encryptedToken: string; platform: string; packageName: string; lastSeenAt: Date }, actorUserId: string) {
  const campaign = await prisma.pushCampaign.create({
    data: {
      name: "ADMIN device test",
      title: "Teachix notification test",
      body: "This is a device-specific Teachix test notification.",
      route: "/dashboard",
      type: PushCampaignType.SYSTEM_TEST,
      status: PushCampaignStatus.PROCESSING,
      processingStartedAt: new Date(),
      audienceType: PushAudienceType.USER,
      audienceConfig: { userId: device.userId },
      estimatedUserCount: 1,
      estimatedDeviceCount: 1,
      createdById: actorUserId,
    },
  });
  const delivery = await prisma.pushDelivery.create({ data: { campaignId: campaign.id, userId: device.userId, deviceId: device.id } });
  const attemptedAt = new Date();
  try {
    const result = await sendPushToDevice(device, { title: "Teachix test", body: "Your Teachix device is connected.", route: "/dashboard", type: "system-announcement", campaignId: campaign.id });
    const failed = !result.success;
    await prisma.pushDelivery.update({ where: { id: delivery.id }, data: { status: failed ? PushDeliveryStatus.FAILED : PushDeliveryStatus.SUCCESS, provider: "firebase-cloud-messaging", attemptCount: 1, attemptedAt, sentAt: failed ? null : attemptedAt, failedAt: failed ? attemptedAt : null, firebaseMessageId: result.messageId || null, errorCode: result.errorCode || null, errorCategory: result.errorCategory || null, safeErrorMessage: result.safeErrorMessage || null, retryable: Boolean(result.retryable), invalidToken: result.invalidToken, retryCount: 1 } });
    await prisma.pushCampaign.update({ where: { id: campaign.id }, data: { status: failed ? PushCampaignStatus.FAILED : PushCampaignStatus.SENT, completedAt: attemptedAt, sentCount: 1, successCount: result.success ? 1 : 0, failureCount: result.success ? 0 : 1 } });
    await logAdminActivity({ actorUserId, category: "SYSTEM", action: "push-device-test-sent", severity: result.success ? "SUCCESS" : "ERROR", title: "Push device test sent", details: { campaignId: campaign.id, deliveryId: delivery.id, deviceId: device.id, platform: device.platform, success: result.success } });
    return { ...result, campaignId: campaign.id, deliveryId: delivery.id, platform: device.platform };
  } catch {
    await prisma.pushDelivery.update({ where: { id: delivery.id }, data: { status: PushDeliveryStatus.FAILED, provider: "firebase-cloud-messaging", attemptCount: 1, attemptedAt, failedAt: attemptedAt, errorCode: "PUSH_TEST_SEND_FAILED", errorCategory: "UNKNOWN", safeErrorMessage: "The test delivery could not be completed.", retryable: false, retryCount: 1 } });
    await prisma.pushCampaign.update({ where: { id: campaign.id }, data: { status: PushCampaignStatus.FAILED, completedAt: attemptedAt, sentCount: 1, failureCount: 1, lastErrorCode: "PUSH_TEST_SEND_FAILED" } });
    return { success: false, invalidToken: false, campaignId: campaign.id, deliveryId: delivery.id, platform: device.platform, errorCode: "PUSH_TEST_SEND_FAILED", errorCategory: "UNKNOWN", safeErrorMessage: "The test delivery could not be completed.", retryable: false };
  }
}

export async function retryFailedPushCampaign(campaignId: string, actorUserId: string) {
  const result = await prisma.pushDelivery.updateMany({ where: { campaignId, status: PushDeliveryStatus.FAILED, retryable: true, invalidToken: false, retryCount: { lt: MAX_DELIVERY_RETRIES } }, data: { nextRetryAt: new Date() } });
  if (!result.count) throw new Error("NO_RETRYABLE_DELIVERIES");
  const campaign = await prisma.pushCampaign.update({ where: { id: campaignId }, data: { status: PushCampaignStatus.PROCESSING, processingStartedAt: new Date() } });
  const sent = await executePushCampaign(campaign.id, actorUserId);
  return { queued: result.count, ...sent };
}

export async function runPushScheduler() {
  await runSubscriptionPushEvents();
  const now = new Date();
  await prisma.pushCampaign.updateMany({ where: { status: PushCampaignStatus.PROCESSING, processingStartedAt: { lt: new Date(now.getTime() - 15 * 60_000) } }, data: { status: PushCampaignStatus.SCHEDULED, lastErrorCode: "PROCESSING_LEASE_EXPIRED" } });
  const candidates = await prisma.pushCampaign.findMany({ where: { OR: [{ status: PushCampaignStatus.SCHEDULED, scheduledAt: { lte: now } }, { status: PushCampaignStatus.PARTIALLY_FAILED, deliveries: { some: { nextRetryAt: { lte: now }, retryCount: { lt: MAX_DELIVERY_RETRIES } } } }] }, orderBy: { scheduledAt: "asc" }, take: 20, select: { id: true, status: true } });
  const results = [];
  for (const candidate of candidates) {
    const claim = await prisma.pushCampaign.updateMany({ where: { id: candidate.id, status: candidate.status }, data: { status: PushCampaignStatus.PROCESSING, processingStartedAt: new Date(), startedAt: new Date() } });
    if (claim.count !== 1) continue;
    try { results.push(await executePushCampaign(candidate.id)); } catch { await prisma.pushCampaign.update({ where: { id: candidate.id }, data: { status: PushCampaignStatus.FAILED, lastErrorCode: "SCHEDULER_EXECUTION_FAILED", completedAt: new Date() } }); }
  }
  return results;
}

async function runSubscriptionPushEvents() {
  const actor = await prisma.user.findFirst({ where: { role: UserRole.ADMIN, isActive: true }, select: { id: true } });
  if (!actor) return;
  const now = new Date();
  const horizon = new Date(now.getTime() + 3 * 86_400_000);
  const subscriptions = await prisma.subscription.findMany({ where: { endsAt: { lte: horizon }, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } }, select: { id: true, schoolAccountId: true, endsAt: true } });
  for (const subscription of subscriptions) {
    if (!subscription.endsAt) continue;
    const triggerKey = subscription.endsAt <= now ? "subscription-expired" : "subscription-expiring";
    const eventDate = subscription.endsAt.toISOString().slice(0, 10);
    await dispatchAutomaticPushEvent({ triggerKey, actorUserId: actor.id, sourceRecordId: `${subscription.id}:${eventDate}`, variables: { serviceName: "Teachix" } }).catch(() => undefined);
  }
}

export async function getPushOverview() {
  const [campaigns, sent, scheduled, automatic, devices, activeDevices, deliveries, successes, failures, opened] = await Promise.all([
    prisma.pushCampaign.count(),
    prisma.pushCampaign.count({ where: { status: { in: [PushCampaignStatus.SENT, PushCampaignStatus.PARTIALLY_FAILED] } } }),
    prisma.pushCampaign.count({ where: { status: PushCampaignStatus.SCHEDULED } }),
    prisma.pushCampaign.count({ where: { type: PushCampaignType.AUTOMATIC } }),
    prisma.pushDevice.count(),
    prisma.pushDevice.count({ where: ACTIVE_DEVICE_WHERE }),
    prisma.pushDelivery.count(),
    prisma.pushDelivery.count({ where: { status: PushDeliveryStatus.SUCCESS } }),
    prisma.pushDelivery.count({ where: { status: PushDeliveryStatus.FAILED } }),
    prisma.pushDelivery.count({ where: { openedAt: { not: null } } }),
  ]);
  return { campaigns, sent, scheduled, automatic, devices, activeDevices, deliveries, successes, failures, opened, successRate: deliveries ? Math.round(successes / deliveries * 100) : 0, openRate: successes ? Math.round(opened / successes * 100) : 0 };
}

export async function listPushCampaigns(input: { page?: number; pageSize?: number; search?: string; type?: PushCampaignType; status?: PushCampaignStatus } = {}) {
  const page = Math.max(1, input.page || 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize || 20));
  const where: Prisma.PushCampaignWhereInput = {
    ...(input.type ? { type: input.type } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.search ? { OR: [{ title: { contains: input.search } }, { name: { contains: input.search } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.pushCampaign.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, name: true, title: true, body: true, route: true, type: true, status: true, audienceType: true, scheduledAt: true, sentCount: true, successCount: true, failureCount: true, openedCount: true, createdAt: true, createdBy: { select: { name: true } } } }),
    prisma.pushCampaign.count({ where }),
  ]);
  return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}

export async function listPushDevices() {
  const devices = await prisma.pushDevice.findMany({ where: { platform: { in: ["android", "ios"] }, packageName: "sa.teachix.app" }, orderBy: { lastSeenAt: "desc" }, take: 200, select: { id: true, tokenHash: true, platform: true, packageName: true, enabled: true, revokedAt: true, lastSeenAt: true, createdAt: true, updatedAt: true, user: { select: { id: true, name: true, role: true } } } });
  const ids = devices.map((device) => device.id);
  if (!ids.length) return [];
  const [counts, openedCounts, latestFailures] = await Promise.all([
    prisma.pushDelivery.groupBy({ by: ["deviceId", "status"], where: { deviceId: { in: ids } }, _count: { _all: true }, _max: { attemptedAt: true } }),
    prisma.pushDelivery.groupBy({ by: ["deviceId"], where: { deviceId: { in: ids }, openedAt: { not: null } }, _count: { _all: true } }),
    prisma.pushDelivery.findMany({ where: { deviceId: { in: ids }, status: PushDeliveryStatus.FAILED }, orderBy: { attemptedAt: "desc" }, select: { deviceId: true, errorCategory: true, errorCode: true }, take: 1000 }),
  ]);
  const countByDevice = new Map<string, { total: number; failed: number; lastDeliveryAt: Date | null; lastSuccessAt: Date | null; lastFailureAt: Date | null }>();
  counts.forEach((row) => { const current = countByDevice.get(row.deviceId) || { total: 0, failed: 0, lastDeliveryAt: null, lastSuccessAt: null, lastFailureAt: null }; current.total += row._count._all; if (row.status === PushDeliveryStatus.FAILED) { current.failed += row._count._all; current.lastFailureAt = row._max.attemptedAt; } if (row.status === PushDeliveryStatus.SUCCESS) current.lastSuccessAt = row._max.attemptedAt; if (!current.lastDeliveryAt || (row._max.attemptedAt && row._max.attemptedAt > current.lastDeliveryAt)) current.lastDeliveryAt = row._max.attemptedAt; countByDevice.set(row.deviceId, current); });
  const failureByDevice = new Map<string, { errorCategory: string | null; errorCode: string | null }>();
  latestFailures.forEach((row) => { if (!failureByDevice.has(row.deviceId)) failureByDevice.set(row.deviceId, row); });
  const openedByDevice = new Map(openedCounts.map((row) => [row.deviceId, row._count._all]));
  return devices.map((device) => {
    const row = countByDevice.get(device.id);
    const failure = failureByDevice.get(device.id);
    const { tokenHash, ...safeDevice } = device;
    return { ...safeDevice, tokenFingerprint: tokenHash.slice(0, 12), totalSent: row?.total || 0, totalOpened: openedByDevice.get(device.id) || 0, totalFailed: row?.failed || 0, lastDeliveryAt: row?.lastDeliveryAt || null, lastSuccessAt: row?.lastSuccessAt || null, lastFailureAt: row?.lastFailureAt || null, lastErrorCategory: failure?.errorCategory || null, lastErrorCode: failure?.errorCode || null };
  });
}

export async function setPushCenterDeviceEnabled(deviceId: string, enabled: boolean, actorUserId?: string) {
  const result = await prisma.pushDevice.updateMany({ where: { id: deviceId }, data: { enabled, revokedAt: enabled ? null : new Date() } });
  if (result.count && actorUserId) await logAdminActivity({ actorUserId, category: "SYSTEM", action: enabled ? "push-device-enabled" : "push-device-disabled", severity: "WARNING", title: "Push device state changed", details: { deviceId, enabled } });
  return result;
}

export async function revokePushCenterDevice(deviceId: string, actorUserId?: string) {
  return setPushCenterDeviceEnabled(deviceId, false, actorUserId);
}

export async function recordPushOpen(input: { deliveryId?: string; campaignId?: string; userId: string; route: string }) {
  const safeRoute = getSafePushRoute(input.route);
  if (!safeRoute) throw new Error("INVALID_PUSH_ROUTE");
  const delivery = input.deliveryId
    ? await prisma.pushDelivery.findFirst({ where: { id: input.deliveryId, userId: input.userId }, select: { id: true, campaignId: true } })
    : input.campaignId
      ? await prisma.pushDelivery.findFirst({ where: { campaignId: input.campaignId, userId: input.userId }, orderBy: { createdAt: "desc" }, select: { id: true, campaignId: true } })
      : null;
  if (!delivery) return { recorded: false };
  const result = await prisma.pushDelivery.updateMany({ where: { id: delivery.id, openedAt: null }, data: { openedAt: new Date(), openedRoute: safeRoute } });
  if (result.count) await prisma.pushCampaign.update({ where: { id: delivery.campaignId }, data: { openedCount: { increment: 1 } } });
  return { recorded: result.count > 0 };
}

export async function dispatchAutomaticPushEvent(input: { triggerKey: string; actorUserId: string; sourceRecordId?: string; variables?: Record<string, string> }) {
  const rule = await prisma.pushAutomaticRule.findUnique({ where: { triggerKey: input.triggerKey } });
  if (!rule?.enabled) return { dispatched: false, reason: "RULE_DISABLED" as const };
  const eventKey = input.sourceRecordId ? `${input.triggerKey}:${input.sourceRecordId}` : null;
  let eventId: string | null = null;
  if (eventKey) {
    try {
      const event = await prisma.pushAutomaticEvent.create({ data: { ruleId: rule.id, eventKey } });
      eventId = event.id;
    } catch {
      return { dispatched: false, reason: "DUPLICATE_EVENT" as const };
    }
  }
  const replace = (template: string) => template.replace(/\{\{(userName|serviceName|surveyTitle|assignmentTitle)\}\}/g, (_match, key: string) => input.variables?.[key] || "");
  const config = rule.audienceConfig as Record<string, unknown>;
  const campaign = await createPushCampaign({ title: replace(rule.titleTemplate), body: replace(rule.bodyTemplate), route: rule.route, campaignType: PushCampaignType.AUTOMATIC, sendNow: true, audienceType: rule.audienceType, ...(typeof config.role === "string" ? { role: config.role } : {}), ...(typeof config.userId === "string" ? { userId: config.userId } : {}), ...(Array.isArray(config.userIds) ? { userIds: config.userIds as string[] } : {}), ...(typeof config.schoolAccountId === "string" ? { schoolAccountId: config.schoolAccountId } : {}) }, input.actorUserId);
  if (eventId && campaign?.id) await prisma.pushAutomaticEvent.update({ where: { id: eventId }, data: { campaignId: campaign.id } });
  await prisma.pushAutomaticRule.update({ where: { id: rule.id }, data: { lastTriggeredAt: new Date(), totalSends: { increment: 1 }, lastResult: "SUCCESS", lastErrorCode: null } });
  return { dispatched: true, campaignId: campaign?.id || null };
}

const AUTOMATIC_RULE_CATALOG = [
  { triggerKey: "activity-assignment-returned", name: "إرجاع تكليف نشاط", description: "تنبيه عند إرجاع التكليف للمعلم.", titleTemplate: "تم إرجاع التكليف", bodyTemplate: "تم إرجاع تكليف {{assignmentTitle}} للمراجعة.", route: "/dashboard/activity-leader/assignments" },
  { triggerKey: "activity-assignment-approved", name: "اعتماد تكليف نشاط", description: "تنبيه عند اعتماد التكليف.", titleTemplate: "تم اعتماد التكليف", bodyTemplate: "تم اعتماد تكليف {{assignmentTitle}}.", route: "/dashboard/activity-leader/assignments" },
  { triggerKey: "survey-receiving-opened", name: "فتح استقبال الاستبيان", description: "تنبيه عند بدء استقبال الردود.", titleTemplate: "بدأ استقبال الاستبيان", bodyTemplate: "يمكنك الآن المشاركة في استبيان {{surveyTitle}}.", route: "/dashboard/surveys" },
  { triggerKey: "subscription-activated", name: "تفعيل الاشتراك", description: "تنبيه عند تفعيل اشتراك الحساب.", titleTemplate: "تم تفعيل الاشتراك", bodyTemplate: "تم تفعيل اشتراك Teachix بنجاح.", route: "/dashboard/subscription" },
  { triggerKey: "subscription-expired", name: "انتهاء الاشتراك", description: "تنبيه عند انتهاء الاشتراك.", titleTemplate: "انتهى الاشتراك", bodyTemplate: "انتهى اشتراك Teachix ويحتاج إلى التجديد.", route: "/dashboard/subscription" },
  { triggerKey: "survey-published", name: "نشر استبيان", description: "تنبيه عند نشر استبيان جديد.", titleTemplate: "استبيان جديد", bodyTemplate: "تم نشر استبيان جديد.", route: "/dashboard/surveys" },
  { triggerKey: "activity-assignment-created", name: "إنشاء تكليف نشاط", description: "تنبيه عند إنشاء تكليف نشاط جديد.", titleTemplate: "تكليف نشاط جديد", bodyTemplate: "لديك تكليف نشاط جديد.", route: "/dashboard/activity-leader/assignments" },
  { triggerKey: "report-ready", name: "جاهزية تقرير", description: "تنبيه عند جاهزية تقرير.", titleTemplate: "التقرير جاهز", bodyTemplate: "أصبح التقرير جاهزًا للمراجعة.", route: "/dashboard/reports" },
  { triggerKey: "subscription-expiring", name: "اقتراب انتهاء الاشتراك", description: "تنبيه تذكيري قبل انتهاء الاشتراك.", titleTemplate: "تذكير بالاشتراك", bodyTemplate: "اقترب موعد انتهاء الاشتراك.", route: "/dashboard/subscription" },
] as const;

export async function getAutomaticRules() {
  await Promise.all(AUTOMATIC_RULE_CATALOG.map((rule) => prisma.pushAutomaticRule.upsert({
    where: { triggerKey: rule.triggerKey },
    create: { ...rule, audienceType: PushAudienceType.ALL_USERS, audienceConfig: {}, enabled: false },
    update: { name: rule.name, description: rule.description, titleTemplate: rule.titleTemplate, bodyTemplate: rule.bodyTemplate, route: rule.route },
  })));
  return prisma.pushAutomaticRule.findMany({ orderBy: { createdAt: "asc" } });
}

export async function toggleAutomaticRule(ruleId: string, enabled: boolean, actorUserId: string) {
  const rule = await prisma.pushAutomaticRule.update({ where: { id: ruleId }, data: { enabled, createdById: actorUserId } });
  await logAdminActivity({ actorUserId, category: "SYSTEM", action: enabled ? "push-automatic-rule-enabled" : "push-automatic-rule-disabled", severity: "INFO", title: "Automatic push rule changed", details: { ruleId, enabled } });
  return rule;
}

export async function updateAutomaticRule(ruleId: string, input: { titleTemplate?: string; bodyTemplate?: string; route?: string; enabled?: boolean }, actorUserId: string) {
  const route = input.route ? getSafePushRoute(input.route) : undefined;
  if (input.route && !route) throw new Error("INVALID_PUSH_ROUTE");
  const data = { ...(input.titleTemplate !== undefined ? { titleTemplate: input.titleTemplate.trim().slice(0, 120) } : {}), ...(input.bodyTemplate !== undefined ? { bodyTemplate: input.bodyTemplate.trim().slice(0, 500) } : {}), ...(route ? { route } : {}), ...(typeof input.enabled === "boolean" ? { enabled: input.enabled, createdById: actorUserId } : {}) };
  if (!Object.keys(data).length) throw new Error("INVALID_RULE_INPUT");
  return prisma.pushAutomaticRule.update({ where: { id: ruleId }, data });
}

export async function cancelPushCampaign(campaignId: string, actorUserId: string) {
  const result = await prisma.pushCampaign.updateMany({ where: { id: campaignId, status: PushCampaignStatus.SCHEDULED }, data: { status: PushCampaignStatus.CANCELED, canceledAt: new Date(), recurrenceActive: false } });
  if (result.count) await logAdminActivity({ actorUserId, category: "SYSTEM", action: "push-campaign-canceled", severity: "WARNING", title: "Push campaign canceled", details: { campaignId } });
  return result.count > 0;
}

export async function duplicatePushCampaign(campaignId: string, actorUserId: string) {
  const source = await prisma.pushCampaign.findUnique({ where: { id: campaignId } });
  if (!source) throw new Error("CAMPAIGN_NOT_FOUND");
  const duplicate = await prisma.pushCampaign.create({ data: { name: source.name ? `${source.name} - copy` : null, title: source.title, body: source.body, route: source.route, type: PushCampaignType.MANUAL, status: PushCampaignStatus.DRAFT, audienceType: source.audienceType, audienceConfig: source.audienceConfig as Prisma.InputJsonValue, internalNote: source.internalNote, timezone: source.timezone, createdById: actorUserId } });
  await logAdminActivity({ actorUserId, category: "SYSTEM", action: "push-campaign-duplicated", severity: "INFO", title: "Push campaign duplicated", details: { sourceCampaignId: campaignId, campaignId: duplicate.id } });
  return duplicate;
}

export async function resendPushCampaign(campaignId: string, actorUserId: string) {
  const source = await prisma.pushCampaign.findUnique({ where: { id: campaignId } });
  if (!source) throw new Error("CAMPAIGN_NOT_FOUND");
  return createPushCampaign({ title: source.title, body: source.body, route: source.route, campaignType: PushCampaignType.MANUAL, sendNow: true, audienceType: source.audienceType, ...(source.audienceConfig as Record<string, unknown>) }, actorUserId);
}

export async function setRecurringCampaignActive(campaignId: string, active: boolean, actorUserId: string) {
  const campaign = await prisma.pushCampaign.findUnique({ where: { id: campaignId }, select: { type: true, status: true } });
  if (!campaign || campaign.type !== PushCampaignType.RECURRING || campaign.status === PushCampaignStatus.PROCESSING) throw new Error("CAMPAIGN_NOT_RECURRING");
  const updated = await prisma.pushCampaign.update({ where: { id: campaignId }, data: { recurrenceActive: active, status: PushCampaignStatus.SCHEDULED, canceledAt: null } });
  await logAdminActivity({ actorUserId, category: "SYSTEM", action: active ? "push-recurring-enabled" : "push-recurring-disabled", severity: "INFO", title: "Recurring push changed", details: { campaignId, active } });
  return updated;
}

export async function listPushTemplates() {
  return prisma.pushTemplate.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, title: true, body: true, route: true, type: true, category: true, enabled: true, createdAt: true, updatedAt: true } });
}

function validateTemplateInput(input: { name?: string; title?: string; body?: string; route?: string; category?: string; type?: PushCampaignType }) {
  const name = input.name?.trim();
  const message = validateMessage({ title: input.title || "", body: input.body || "", route: input.route || "" });
  if (!name || name.length > 160) throw new Error("INVALID_TEMPLATE_NAME");
  return { name, ...message, category: input.category?.trim().slice(0, 80) || null, type: input.type || PushCampaignType.MANUAL };
}

export async function createPushTemplate(input: { name?: string; title?: string; body?: string; route?: string; category?: string; type?: PushCampaignType }, createdById: string) {
  const data = validateTemplateInput(input);
  return prisma.pushTemplate.create({ data: { ...data, createdById } });
}

export async function updatePushTemplate(id: string, input: { name?: string; title?: string; body?: string; route?: string; category?: string; type?: PushCampaignType; enabled?: boolean }) {
  const current = await prisma.pushTemplate.findUnique({ where: { id } });
  if (!current) throw new Error("TEMPLATE_NOT_FOUND");
  const data = validateTemplateInput({ name: input.name ?? current.name, title: input.title ?? current.title, body: input.body ?? current.body, route: input.route ?? current.route, category: (input.category ?? current.category) || undefined, type: input.type ?? current.type });
  return prisma.pushTemplate.update({ where: { id }, data: { ...data, enabled: input.enabled ?? current.enabled } });
}

export async function deletePushTemplate(id: string) {
  const template = await prisma.pushTemplate.findUnique({ where: { id }, select: { enabled: true } });
  if (!template) throw new Error("TEMPLATE_NOT_FOUND");
  if (template.enabled) throw new Error("TEMPLATE_MUST_BE_DISABLED");
  await prisma.pushTemplate.delete({ where: { id } });
  return true;
}

export async function getPushAnalytics(input: { from?: Date; to?: Date; type?: PushCampaignType; status?: PushCampaignStatus; audienceType?: PushAudienceType; role?: UserRole } = {}) {
  const to = input.to || new Date();
  const from = input.from || new Date(to.getTime() - 30 * 86_400_000);
  const campaignWhere: Prisma.PushCampaignWhereInput = { createdAt: { gte: from, lte: to }, ...(input.type ? { type: input.type } : {}), ...(input.status ? { status: input.status } : {}), ...(input.audienceType ? { audienceType: input.audienceType } : {}), ...(input.role ? { audienceConfig: { path: "role", equals: input.role } } : {}) };
  const deliveryWhere: Prisma.PushDeliveryWhereInput = { createdAt: { gte: from, lte: to }, campaign: campaignWhere };
  const [campaigns, success, failed, invalid, opened, targeted, byType, byError, topOpen, topFailure, deviceTotal, deviceActive, deviceAndroid, trendRows] = await Promise.all([
    prisma.pushCampaign.count({ where: campaignWhere }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, status: PushDeliveryStatus.SUCCESS } }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, status: PushDeliveryStatus.FAILED } }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, invalidToken: true } }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, openedAt: { not: null } } }),
    prisma.pushCampaign.aggregate({ where: campaignWhere, _sum: { estimatedUserCount: true, estimatedDeviceCount: true } }),
    prisma.pushCampaign.groupBy({ by: ["type"], where: campaignWhere, _count: { _all: true }, _sum: { successCount: true, failureCount: true } }),
    prisma.pushDelivery.groupBy({ by: ["errorCode"], where: { ...deliveryWhere, status: PushDeliveryStatus.FAILED }, _count: { _all: true }, orderBy: { _count: { errorCode: "desc" } }, take: 10 }),
    prisma.pushCampaign.findMany({ where: campaignWhere, orderBy: { openedCount: "desc" }, take: 5, select: { id: true, title: true, openedCount: true, successCount: true } }),
    prisma.pushCampaign.findMany({ where: campaignWhere, orderBy: { failureCount: "desc" }, take: 5, select: { id: true, title: true, failureCount: true, sentCount: true } }),
    prisma.pushDevice.count(),
    prisma.pushDevice.count({ where: ACTIVE_DEVICE_WHERE }),
    prisma.pushDevice.count({ where: { ...ACTIVE_DEVICE_WHERE, platform: "android" } }),
    prisma.pushDelivery.findMany({ where: deliveryWhere, select: { createdAt: true, status: true, openedAt: true }, take: 10000, orderBy: { createdAt: "asc" } }),
  ]);
  const attempts = success + failed;
  const buckets = new Map<string, { accepted: number; failed: number; opened: number }>();
  for (const row of trendRows) { const key = row.createdAt.toISOString().slice(0, 10); const bucket = buckets.get(key) || { accepted: 0, failed: 0, opened: 0 }; if (row.status === PushDeliveryStatus.SUCCESS) bucket.accepted += 1; if (row.status === PushDeliveryStatus.FAILED) bucket.failed += 1; if (row.openedAt) bucket.opened += 1; buckets.set(key, bucket); }
  const staleCutoff = new Date(Date.now() - 30 * 86_400_000);
  const staleDevices = await prisma.pushDevice.count({ where: { ...ACTIVE_DEVICE_WHERE, lastSeenAt: { lt: staleCutoff } } });
  const [deviceIos, androidSuccess, androidFailed, iosSuccess, iosFailed, androidOpened, iosOpened] = await Promise.all([
    prisma.pushDevice.count({ where: { ...ACTIVE_DEVICE_WHERE, platform: "ios" } }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, status: PushDeliveryStatus.SUCCESS, device: { platform: "android" } } }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, status: PushDeliveryStatus.FAILED, device: { platform: "android" } } }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, status: PushDeliveryStatus.SUCCESS, device: { platform: "ios" } } }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, status: PushDeliveryStatus.FAILED, device: { platform: "ios" } } }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, openedAt: { not: null }, device: { platform: "android" } } }),
    prisma.pushDelivery.count({ where: { ...deliveryWhere, openedAt: { not: null }, device: { platform: "ios" } } }),
  ]);
  const averageOpenRate = topOpen.length ? Math.round(topOpen.reduce((sum, item) => sum + (item.successCount ? item.openedCount / item.successCount * 100 : 0), 0) / topOpen.length) : 0;
  return { from, to, campaigns, targetedUsers: targeted._sum.estimatedUserCount || 0, targetedDevices: targeted._sum.estimatedDeviceCount || 0, accepted: success, failed, invalid, opened, successRate: attempts ? Math.round(success / attempts * 100) : 0, failureRate: attempts ? Math.round(failed / attempts * 100) : 0, openRate: success ? Math.round(opened / success * 100) : 0, averageOpenRate, byType, byError, topOpen, topFailure, devices: { total: deviceTotal, active: deviceActive, disabled: deviceTotal - deviceActive, android: deviceAndroid, ios: deviceIos, stale: staleDevices }, platform: { android: { sent: androidSuccess, failed: androidFailed, opened: androidOpened, successRate: androidSuccess + androidFailed ? Math.round(androidSuccess / (androidSuccess + androidFailed) * 100) : 0, openRate: androidSuccess ? Math.round(androidOpened / androidSuccess * 100) : 0 }, ios: { sent: iosSuccess, failed: iosFailed, opened: iosOpened, successRate: iosSuccess + iosFailed ? Math.round(iosSuccess / (iosSuccess + iosFailed) * 100) : 0, openRate: iosSuccess ? Math.round(iosOpened / iosSuccess * 100) : 0 } }, trend: [...buckets.entries()].map(([date, values]) => ({ date, ...values })) };
}
