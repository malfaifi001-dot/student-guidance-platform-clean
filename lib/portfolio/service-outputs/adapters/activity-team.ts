import "server-only";

import { getSchoolActivityTeam, isCurrentSupervisorSignatureForField } from "@/lib/activity-team/activity-team-service";
import { SCHOOL_ACTIVITY_TEAM_FIELDS } from "@/lib/activity-team/activity-team-config";
import type { PortfolioServiceOutput } from "@/lib/portfolio/service-outputs/service-output-types";

type ActivityTeamLink = {
  id: string;
  serviceSlug: string;
  resourceType: string;
  performanceItemKey: string;
  targetSectionKey: string | null;
  displayTitle: string;
  createdAt: Date;
};

export async function resolveActivityTeamPortfolioOutput(schoolAccountId: string, link: ActivityTeamLink): Promise<PortfolioServiceOutput> {
  const source = await getSchoolActivityTeam(schoolAccountId);
  return {
    id: link.id,
    serviceSlug: link.serviceSlug,
    resourceType: link.resourceType,
    performanceItemKey: link.performanceItemKey,
    targetSectionKey: link.targetSectionKey || link.performanceItemKey,
    displayTitle: link.displayTitle,
    createdAt: link.createdAt.toISOString(),
    content: {
      kind: "activity-team",
      updatedAt: source.updatedAt?.toISOString() || "",
      rows: SCHOOL_ACTIVITY_TEAM_FIELDS
        .map((field) => {
          const signature = source.signatures.find((candidate) => isCurrentSupervisorSignatureForField(candidate, source.assignments, field.key));
          return { key: field.key, label: field.label, supervisor: source.assignments[field.key] || "", ...(signature?.signatureUrl ? { signatureUrl: signature.signatureUrl } : {}) };
        })
        .filter((row) => row.supervisor),
    },
  };
}
