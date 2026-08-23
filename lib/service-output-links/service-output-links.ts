import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAllowedPerformanceItem, isPerformanceRole, type PerformanceRole } from "@/lib/performance-items/role-performance-items";
import { getPortfolioDefaultSectionOrderForRole } from "@/lib/portfolio/portfolio-performance-elements";

export type ServiceOutputLinkInput = {
  ownerUserId: string;
  schoolAccountId?: string | null;
  roleKey: PerformanceRole;
  serviceSlug: string;
  resourceType: string;
  sourceKey: string;
  sourceReference: Record<string, unknown>;
  displayTitle: string;
  metadata?: Record<string, unknown>;
  targetSectionKey?: string | null;
};

export function assertLinkPerformanceItem(roleKey: PerformanceRole, performanceItemKey: string) {
  const item = getAllowedPerformanceItem(roleKey, performanceItemKey);
  if (!item) throw new Error("عنصر الأداء غير متاح لهذا الدور.");
  return item;
}

export function parseLinkRole(value: unknown): PerformanceRole | null {
  return isPerformanceRole(value) ? value : null;
}

export function assertPortfolioSection(roleKey: PerformanceRole, sectionKey: string) {
  const section = getPortfolioDefaultSectionOrderForRole(roleKey).find((item) => item.key === sectionKey);
  if (!section) throw new Error("قسم ملف الإنجاز غير متاح لهذا الدور.");
  return section;
}

export async function listServiceOutputLinks(input: {
  ownerUserId: string;
  schoolAccountId?: string | null;
  roleKey: PerformanceRole;
  serviceSlug?: string;
  performanceItemKey?: string;
}) {
  return prisma.serviceOutputLink.findMany({
    where: {
      ownerUserId: input.ownerUserId,
      ...(input.schoolAccountId ? { schoolAccountId: input.schoolAccountId } : {}),
      roleKey: input.roleKey,
      ...(input.serviceSlug ? { serviceSlug: input.serviceSlug } : {}),
      ...(input.performanceItemKey ? { performanceItemKey: input.performanceItemKey } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function createServiceOutputLink(input: ServiceOutputLinkInput & { performanceItemKey: string }) {
  // Portfolio-section links intentionally mirror the target section key in
  // performanceItemKey for backward-compatible storage. Validate the real
  // target type before falling back to the legacy performance-item check.
  if (input.targetSectionKey) {
    assertPortfolioSection(input.roleKey, input.targetSectionKey);
  } else {
    assertLinkPerformanceItem(input.roleKey, input.performanceItemKey);
  }
  return prisma.serviceOutputLink.create({
    data: {
      ownerUserId: input.ownerUserId,
      schoolAccountId: input.schoolAccountId || null,
      roleKey: input.roleKey,
      serviceSlug: input.serviceSlug,
      performanceItemKey: input.performanceItemKey,
      targetSectionKey: input.targetSectionKey || null,
      resourceType: input.resourceType,
      sourceKey: input.sourceKey,
      sourceReferenceJson: input.sourceReference as Prisma.InputJsonValue,
      displayTitle: input.displayTitle,
      metadataJson: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
