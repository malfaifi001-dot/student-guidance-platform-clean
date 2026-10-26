import type { PortfolioWorkspaceData } from "@/lib/portfolio/portfolio-read-model";
import { PORTFOLIO_SNAPSHOT_VERSION, type PortfolioSnapshotDocumentV1 } from "@/lib/portfolio/portfolio-snapshot-types";

type SnapshotUser = {
  id: string;
  schoolAccountId: string;
};

export function toSnapshotDocument(
  workspace: PortfolioWorkspaceData,
  user: SnapshotUser,
  capturedAt: Date,
): PortfolioSnapshotDocumentV1 {
  return {
    snapshotVersion: PORTFOLIO_SNAPSHOT_VERSION,
    capturedAt: capturedAt.toISOString(),
    ownerUserId: user.id,
    schoolAccountId: user.schoolAccountId,
    showWeights: workspace.showWeights,
    portfolio: workspace.portfolio,
    owner: workspace.owner,
    school: workspace.school,
    sections: workspace.sections,
    biography: workspace.biography,
    educationIdentity: workspace.educationIdentity,
    qualificationItems: workspace.qualificationItems,
    performanceSections: workspace.performanceSections,
    customEvidence: workspace.customEvidence,
    totals: workspace.totals,
  };
}
