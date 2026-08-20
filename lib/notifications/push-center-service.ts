import {
  Prisma,
  PushAudienceType,
  PushCampaignStatus,
  PushCampaignType,
  PushDeliveryStatus,
  PushRecurrenceFrequency,
  UserRole,
} from "@prisma/client";

import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";
import { getSafePushRoute } from "@/lib/notifications/push-routing";
import { sendPushToDeviceBatch } from "@/lib/notifications/fcm-server";

const ACTIVE_DEVICE_WHERE = {
  platform: "android",
  packageName: "sa.teachix.app",
  enabled: true,
  revokedAt: null,
} as const;

const SUPPORTED_ROLES = Object.values(UserRole);

export type PushAudienceInput = {
  audienceType: "ALL_USERS" | "ROLE" | "USER" | "USERS" | "SCHOOL";
  role?: string;
  userId?: string;
  userIds?: string[];
  schoolAccountId?: string;
};

export type CreatePushCampaignInput = PushAudienceInput & {
  campaignType?: PushCampaignType;
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
  const message = validateMessage(input);
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

export async function executePushCampaign(campaignId: string, actorUserId?: string) {
  const campaign = await prisma.pushCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status === PushCampaignStatus.CANCELED) throw new Error("CAMPAIGN_NOT_EXECUTABLE");

  const audience = await resolvePushAudience(campaign.audienceType, campaign.audienceConfig as Record<string, unknown>);
  await prisma.pushDelivery.createMany({
    data: audience.devices.map((device) => ({ campaignId, userId: device.userId, deviceId: device.id })),
    skipDuplicates: true,
  });
  const deliveries = await prisma.pushDelivery.findMany({
    where: { campaignId, status: PushDeliveryStatus.PENDING },
    select: { id: true, userId: true, deviceId: true, device: { select: { tokenHash: true, encryptedToken: true } } },
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
    return prisma.pushDelivery.update({ where: { id: delivery.id }, data: { status: result?.success ? PushDeliveryStatus.SUCCESS : PushDeliveryStatus.FAILED, attemptedAt: new Date(), firebaseMessageId: result?.messageId || null, errorCode: result?.errorCode || null, invalidToken: result?.invalidToken || false } });
  }));

  const successCount = results.filter((result) => result.success).length;
  const failureCount = results.length - successCount;
  const next = campaign.recurrenceActive ? nextRecurringDate(campaign) : null;
  const recurrenceStillActive = Boolean(next && (!campaign.recurrenceEndAt || next <= campaign.recurrenceEndAt));
  await prisma.pushCampaign.update({
    where: { id: campaignId },
    data: {
      status: recurrenceStillActive ? PushCampaignStatus.SCHEDULED : successCount > 0 && failureCount > 0 ? PushCampaignStatus.PARTIALLY_FAILED : successCount > 0 ? PushCampaignStatus.SENT : PushCampaignStatus.FAILED,
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

export async function runPushScheduler() {
  const candidates = await prisma.pushCampaign.findMany({ where: { status: PushCampaignStatus.SCHEDULED, scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: "asc" }, take: 20, select: { id: true } });
  const results = [];
  for (const candidate of candidates) {
    const claim = await prisma.pushCampaign.updateMany({ where: { id: candidate.id, status: PushCampaignStatus.SCHEDULED }, data: { status: PushCampaignStatus.PROCESSING, startedAt: new Date() } });
    if (claim.count !== 1) continue;
    try { results.push(await executePushCampaign(candidate.id)); } catch { await prisma.pushCampaign.update({ where: { id: candidate.id }, data: { status: PushCampaignStatus.FAILED, lastErrorCode: "SCHEDULER_EXECUTION_FAILED", completedAt: new Date() } }); }
  }
  return results;
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

export async function listPushCampaigns() {
  return prisma.pushCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, title: true, body: true, route: true, type: true, status: true, audienceType: true, scheduledAt: true, sentCount: true, successCount: true, failureCount: true, openedCount: true, createdAt: true, createdBy: { select: { name: true } } } });
}

export async function listPushDevices() {
  return prisma.pushDevice.findMany({ orderBy: { lastSeenAt: "desc" }, take: 200, select: { id: true, platform: true, packageName: true, enabled: true, revokedAt: true, lastSeenAt: true, createdAt: true, updatedAt: true, user: { select: { id: true, name: true, role: true } } } });
}

export async function revokePushCenterDevice(deviceId: string) {
  return prisma.pushDevice.updateMany({ where: { id: deviceId }, data: { enabled: false, revokedAt: new Date() } });
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

export async function dispatchAutomaticPushEvent(input: { triggerKey: string; actorUserId: string; variables?: Record<string, string> }) {
  const rule = await prisma.pushAutomaticRule.findUnique({ where: { triggerKey: input.triggerKey } });
  if (!rule?.enabled) return { dispatched: false, reason: "RULE_DISABLED" as const };
  const replace = (template: string) => template.replace(/\{\{(userName|serviceName|surveyTitle|assignmentTitle)\}\}/g, (_match, key: string) => input.variables?.[key] || "");
  const config = rule.audienceConfig as Record<string, unknown>;
  const campaign = await createPushCampaign({ title: replace(rule.titleTemplate), body: replace(rule.bodyTemplate), route: rule.route, campaignType: PushCampaignType.AUTOMATIC, sendNow: true, audienceType: rule.audienceType, ...(typeof config.role === "string" ? { role: config.role } : {}), ...(typeof config.userId === "string" ? { userId: config.userId } : {}), ...(Array.isArray(config.userIds) ? { userIds: config.userIds as string[] } : {}), ...(typeof config.schoolAccountId === "string" ? { schoolAccountId: config.schoolAccountId } : {}) }, input.actorUserId);
  await prisma.pushAutomaticRule.update({ where: { id: rule.id }, data: { lastTriggeredAt: new Date(), totalSends: { increment: 1 } } });
  return { dispatched: true, campaignId: campaign?.id || null };
}

const AUTOMATIC_RULE_CATALOG = [
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

export async function cancelPushCampaign(campaignId: string, actorUserId: string) {
  const result = await prisma.pushCampaign.updateMany({ where: { id: campaignId, status: PushCampaignStatus.SCHEDULED }, data: { status: PushCampaignStatus.CANCELED, canceledAt: new Date(), recurrenceActive: false } });
  if (result.count) await logAdminActivity({ actorUserId, category: "SYSTEM", action: "push-campaign-canceled", severity: "WARNING", title: "Push campaign canceled", details: { campaignId } });
  return result.count > 0;
}
