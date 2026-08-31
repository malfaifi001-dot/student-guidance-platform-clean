import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  assertPortfolioActor,
  PortfolioServiceError,
  requireOwnedPortfolio,
  type PortfolioActor,
} from "@/lib/portfolio/portfolio-authorization";
import { getPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import {
  parsePortfolioSnapshotDocument,
  PORTFOLIO_SNAPSHOT_VERSION,
  readPortfolioSnapshotSummary,
  type PortfolioSnapshotDocumentV1,
  type PortfolioSnapshotSummary,
} from "@/lib/portfolio/portfolio-snapshot-types";

type SnapshotUser = PortfolioActor & {
  name?: string | null;
  officialName?: string | null;
  jobTitle?: string | null;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function defaultSnapshotName(createdAt: Date) {
  const formatted = new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(createdAt);
  return `نسخة معتمدة - ${formatted}`;
}

function toSnapshotDocument(
  workspace: Awaited<ReturnType<typeof getPortfolioWorkspace>> & { ok: true },
  user: SnapshotUser,
  capturedAt: Date,
): PortfolioSnapshotDocumentV1 {
  return {
    snapshotVersion: PORTFOLIO_SNAPSHOT_VERSION,
    capturedAt: capturedAt.toISOString(),
    ownerUserId: user.id,
    schoolAccountId: user.schoolAccountId!,
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

function toSummary(document: PortfolioSnapshotDocumentV1): PortfolioSnapshotSummary {
  return {
    title: document.portfolio.title,
    academicYear: document.portfolio.academicYear,
    term: document.portfolio.term,
    themeId: document.portfolio.themeId,
    ownerName: document.owner.name,
    reportCount: document.totals.reports,
    evidenceCount: document.totals.evidences,
  };
}

export async function createPortfolioSnapshot(
  user: SnapshotUser,
  portfolioId: string,
  input: { name?: string; notes?: string },
) {
  await requireOwnedPortfolio(user, portfolioId);
  assertPortfolioActor(user);
  const workspace = await getPortfolioWorkspace(user, portfolioId);
  if (!workspace.ok) {
    throw new PortfolioServiceError(400, "تعذر تجهيز ملف الإنجاز للاعتماد.");
  }

  const capturedAt = new Date();
  const document = toSnapshotDocument(workspace, user, capturedAt);
  const summary = toSummary(document);

  return prisma.portfolioSnapshot.create({
    data: {
      portfolioId,
      ownerUserId: user.id,
      schoolAccountId: user.schoolAccountId!,
      name: input.name?.trim() || defaultSnapshotName(capturedAt),
      notes: input.notes?.trim() || null,
      roleAtCreation: user.role,
      snapshotVersion: PORTFOLIO_SNAPSHOT_VERSION,
      summaryJson: asJson(summary),
      snapshotJson: asJson(document),
    },
    select: {
      id: true,
      name: true,
      notes: true,
      roleAtCreation: true,
      snapshotVersion: true,
      summaryJson: true,
      createdAt: true,
    },
  });
}

export async function listPortfolioSnapshots(user: PortfolioActor, portfolioId: string) {
  await requireOwnedPortfolio(user, portfolioId, { historicalPersonalRead: true });
  assertPortfolioActor(user);
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: {
      portfolioId,
      ownerUserId: user.id,
      roleAtCreation: user.role,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      notes: true,
      roleAtCreation: true,
      snapshotVersion: true,
      summaryJson: true,
      createdAt: true,
    },
  });

  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    name: snapshot.name,
    notes: snapshot.notes || "",
    roleAtCreation: snapshot.roleAtCreation,
    snapshotVersion: snapshot.snapshotVersion,
    createdAt: snapshot.createdAt.toISOString(),
    summary: readPortfolioSnapshotSummary(snapshot.summaryJson),
  }));
}

export async function getPortfolioSnapshot(user: PortfolioActor, snapshotId: string) {
  assertPortfolioActor(user);
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: {
      id: snapshotId,
      ownerUserId: user.id,
      roleAtCreation: user.role,
    },
  });
  if (!snapshot) {
    throw new PortfolioServiceError(404, "نسخة ملف الإنجاز غير موجودة أو لا تملك صلاحية الوصول إليها.");
  }

  await requireOwnedPortfolio(user, snapshot.portfolioId, { historicalPersonalRead: true });
  const document = parsePortfolioSnapshotDocument(snapshot.snapshotJson);
  return {
    ...snapshot,
    document: {
      ...document,
      showWeights: document.showWeights ?? snapshot.roleAtCreation === "TEACHER",
    },
  };
}
