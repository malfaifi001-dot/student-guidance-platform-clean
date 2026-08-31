import "server-only";

import { getDistribution } from "@/lib/curriculum-distribution/queries";
import { isServiceAllowedForSchool } from "@/lib/subscription/subscription-service";
import { listServiceOutputLinks } from "@/lib/service-output-links/service-output-links";
import { normalizeCurriculumDistribution } from "@/lib/portfolio/service-outputs/adapters/curriculum-distribution";
import { resolveActivityPlanPortfolioOutput } from "@/lib/portfolio/service-outputs/adapters/activity-plan";
import { resolveActivityTeamPortfolioOutput } from "@/lib/portfolio/service-outputs/adapters/activity-team";
import type { PortfolioServiceOutput } from "@/lib/portfolio/service-outputs/service-output-types";

type LinkRecord = Awaited<ReturnType<typeof listServiceOutputLinks>>[number];

type ResolverContext = {
  schoolAccountId: string;
  ownerUserId: string;
  link: LinkRecord;
};

type ServiceOutputResolver = (context: ResolverContext) => Promise<PortfolioServiceOutput | null>;

function sourceReference(link: LinkRecord) {
  return link.sourceReferenceJson && typeof link.sourceReferenceJson === "object" && !Array.isArray(link.sourceReferenceJson)
    ? link.sourceReferenceJson as Record<string, unknown>
    : {};
}

const serviceOutputResolvers: Record<string, ServiceOutputResolver> = {
  "curriculum-distribution": async ({ schoolAccountId, ownerUserId, link }) => {
    const access = await isServiceAllowedForSchool({ schoolAccountId, userId: ownerUserId, serviceSlug: link.serviceSlug });
    if (!access.ok) return null;
    const reference = sourceReference(link);
    const subjectId = typeof reference.subjectId === "string" ? reference.subjectId : "";
    const semesterId = typeof reference.semesterId === "string" ? reference.semesterId : "";
    if (!subjectId || !semesterId) return null;
    const distribution = await getDistribution(subjectId, semesterId);
    if (!distribution) return null;
    return {
      id: link.id,
      serviceSlug: link.serviceSlug,
      resourceType: link.resourceType,
      performanceItemKey: link.performanceItemKey,
      targetSectionKey: typeof link.targetSectionKey === "string" && link.targetSectionKey ? link.targetSectionKey : link.performanceItemKey,
      displayTitle: link.displayTitle,
      createdAt: link.createdAt.toISOString(),
      content: normalizeCurriculumDistribution(distribution),
    };
  },
  "student-activity-plan": async ({ schoolAccountId, ownerUserId, link }) => {
    const access = await isServiceAllowedForSchool({ schoolAccountId, userId: ownerUserId, serviceSlug: link.serviceSlug });
    if (!access.ok) return null;
    return resolveActivityPlanPortfolioOutput(schoolAccountId, ownerUserId, link);
  },
  "school-activity-team": async ({ schoolAccountId, ownerUserId, link }) => {
    const access = await isServiceAllowedForSchool({ schoolAccountId, userId: ownerUserId, serviceSlug: link.serviceSlug });
    if (!access.ok) return null;
    return resolveActivityTeamPortfolioOutput(schoolAccountId, link);
  },
};

export async function resolvePortfolioServiceOutputs(input: {
  ownerUserId: string;
  schoolAccountId: string;
  roleKey: "TEACHER" | "COUNSELOR" | "ACTIVITY_LEADER" | "PRINCIPAL";
}) {
  const links = await listServiceOutputLinks({ ownerUserId: input.ownerUserId });
  const resolved = await Promise.all(links.map(async (link) => {
    const resolver = serviceOutputResolvers[link.serviceSlug];
    return resolver ? resolver({ schoolAccountId: input.schoolAccountId, ownerUserId: input.ownerUserId, link }) : null;
  }));
  return resolved.filter((output): output is PortfolioServiceOutput => Boolean(output));
}
