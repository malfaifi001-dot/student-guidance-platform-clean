import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  assertPortfolioActor,
  PortfolioServiceError,
  requireOwnedPersonalPortfolio,
  requireOwnedPortfolio,
  type PortfolioActor,
} from "@/lib/portfolio/portfolio-authorization";
import { getPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import { toSnapshotDocument } from "@/lib/portfolio/portfolio-snapshot-document";
import {
  parsePortfolioSnapshotDocument,
  PORTFOLIO_SNAPSHOT_VERSION,
  readPortfolioSnapshotSummary,
  type PortfolioSnapshotDocumentV1,
  type PortfolioSnapshotSummary,
} from "@/lib/portfolio/portfolio-snapshot-types";
import { registerPortfolioSnapshotPdf } from "@/lib/portfolio/portfolio-snapshot-pdf-service";

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
  await requireOwnedPersonalPortfolio(user, portfolioId);
  assertPortfolioActor(user);
  const workspace = await getPortfolioWorkspace(user, portfolioId);
  if (!workspace.ok) {
    throw new PortfolioServiceError(400, "تعذر تجهيز ملف الإنجاز للاعتماد.");
  }

  const capturedAt = new Date();
  const document = toSnapshotDocument(workspace, user, capturedAt);
  const summary = toSummary(document);

  const snapshot = await prisma.portfolioSnapshot.create({
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

  let pdfPreparation: "PENDING" | "REGISTRATION_FAILED" = "PENDING";
  try {
    await registerPortfolioSnapshotPdf(snapshot.id, document);
  } catch (error) {
    pdfPreparation = "REGISTRATION_FAILED";
    console.error("PORTFOLIO_SNAPSHOT_PDF_REGISTRATION_FAILED", {
      snapshotId: snapshot.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { ...snapshot, pdfPreparation };
}

export async function listPortfolioSnapshots(user: PortfolioActor, portfolioId: string) {
  await requireOwnedPortfolio(user, portfolioId, { historicalPersonalRead: true });
  assertPortfolioActor(user);
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: {
      portfolioId,
      ownerUserId: user.id,
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
      pdfArtifact: { select: { status: true, byteSize: true, generatedAt: true } },
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
    // A missing artifact is retryable (older snapshots and registrations that failed after save).
    pdfPreparationStatus: snapshot.pdfArtifact?.status || "FAILED",
    pdfByteSize: snapshot.pdfArtifact?.byteSize || null,
  }));
}

export async function getPortfolioSnapshot(user: PortfolioActor, snapshotId: string) {
  assertPortfolioActor(user);
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: {
      id: snapshotId,
      ownerUserId: user.id,
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

export async function deletePortfolioSnapshot(user: PortfolioActor, portfolioId: string, snapshotId: string) {
  assertPortfolioActor(user);
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: {
      id: snapshotId,
      portfolioId,
      ownerUserId: user.id,
    },
    select: {
      id: true,
      portfolioId: true,
    },
  });

  if (!snapshot) {
    throw new PortfolioServiceError(404, "نسخة ملف الإنجاز غير موجودة أو لا تملك صلاحية حذفها.");
  }

  await requireOwnedPortfolio(user, snapshot.portfolioId, { historicalPersonalRead: true });
  await prisma.portfolioSnapshot.delete({ where: { id: snapshot.id } });
}
