import "server-only";

import { getDistribution } from "@/lib/curriculum-distribution/queries";
import { isServiceAllowedForSchool } from "@/lib/subscription/subscription-service";
import { listServiceOutputLinks } from "@/lib/service-output-links/service-output-links";
import { normalizeCurriculumDistribution } from "@/lib/portfolio/service-outputs/adapters/curriculum-distribution";
import type { PortfolioServiceOutput } from "@/lib/portfolio/service-outputs/service-output-types";

type LinkRecord = Awaited<ReturnType<typeof listServiceOutputLinks>>[number];

type ResolverContext = {
  schoolAccountId: string;
  link: LinkRecord;
};

type ServiceOutputResolver = (context: ResolverContext) => Promise<PortfolioServiceOutput | null>;

function sourceReference(link: LinkRecord) {
  return link.sourceReferenceJson && typeof link.sourceReferenceJson === "object" && !Array.isArray(link.sourceReferenceJson)
    ? link.sourceReferenceJson as Record<string, unknown>
    : {};
}

const serviceOutputResolvers: Record<string, ServiceOutputResolver> = {
  "curriculum-distribution": async ({ schoolAccountId, link }) => {
    const access = await isServiceAllowedForSchool({ schoolAccountId, serviceSlug: link.serviceSlug });
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
      displayTitle: link.displayTitle,
      createdAt: link.createdAt.toISOString(),
      content: normalizeCurriculumDistribution(distribution),
    };
  },
};

export async function resolvePortfolioServiceOutputs(input: {
  ownerUserId: string;
  schoolAccountId: string;
  roleKey: "TEACHER" | "COUNSELOR" | "ACTIVITY_LEADER" | "PRINCIPAL";
}) {
  const links = await listServiceOutputLinks({ ownerUserId: input.ownerUserId, schoolAccountId: input.schoolAccountId, roleKey: input.roleKey });
  const resolved = await Promise.all(links.map(async (link) => {
    const resolver = serviceOutputResolvers[link.serviceSlug];
    return resolver ? resolver({ schoolAccountId: input.schoolAccountId, link }) : null;
  }));
  return resolved.filter((output): output is PortfolioServiceOutput => Boolean(output));
}

