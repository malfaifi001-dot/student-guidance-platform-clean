import { getPlanServiceSlugs, getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";
import { prisma } from "@/lib/prisma";
import type { DashboardContext } from "@/lib/auth/dashboard-context";

export const MAX_STATISTICS_SERVICES = 20;
const SERVICE_SLUG_PATTERN = /^[a-z0-9_-]+$/;

export class StatisticsServiceSelectionError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "StatisticsServiceSelectionError";
  }
}

export function normalizeStatisticsServiceSelection(input: {
  serviceSlug?: unknown;
  serviceSlugs?: unknown;
}) {
  const values = Array.isArray(input.serviceSlugs)
    ? input.serviceSlugs
    : input.serviceSlugs == null
      ? Array.isArray(input.serviceSlug) ? input.serviceSlug : [input.serviceSlug]
      : [input.serviceSlugs];
  const normalized = Array.from(new Set(values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)));

  if (!normalized.length) {
    throw new StatisticsServiceSelectionError("اختر خدمة واحدة على الأقل.", "STATISTICS_SERVICE_REQUIRED");
  }
  if (normalized.length > MAX_STATISTICS_SERVICES) {
    throw new StatisticsServiceSelectionError(
      `يمكن اختيار ${MAX_STATISTICS_SERVICES} خدمة كحد أقصى.`,
      "STATISTICS_SERVICE_LIMIT_EXCEEDED",
    );
  }
  if (normalized.some((slug) => slug.length > 191 || !SERVICE_SLUG_PATTERN.test(slug))) {
    throw new StatisticsServiceSelectionError("إحدى الخدمات المحددة غير صحيحة.", "INVALID_STATISTICS_SERVICE");
  }
  return normalized;
}

export async function listAllowedStatisticsServices(context: DashboardContext) {
  if (context.isAdmin) {
    return prisma.service.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
    });
  }
  if (!context.schoolAccountId) return [];
  const overview = await getSchoolSubscriptionOverview(context.schoolAccountId);
  if (!overview.usable) return [];
  const allowedSlugs = getPlanServiceSlugs(overview.subscription?.plan?.features || []);
  return prisma.service.findMany({
    where: { status: "ACTIVE", slug: { in: allowedSlugs } },
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function requireAllowedStatisticsServices(
  context: DashboardContext,
  serviceSlugs: string[],
) {
  const services = await listAllowedStatisticsServices(context);
  const bySlug = new Map(services.map((service) => [service.slug, service]));
  if (serviceSlugs.some((slug) => !bySlug.has(slug))) {
    throw new StatisticsServiceSelectionError(
      "إحدى الخدمات المحددة غير متاحة ضمن الاشتراك.",
      "STATISTICS_SERVICE_ACCESS_DENIED",
      403,
    );
  }
  return serviceSlugs.map((slug) => bySlug.get(slug)!);
}
