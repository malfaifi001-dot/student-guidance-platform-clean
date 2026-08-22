import "server-only";

import crypto from "node:crypto";
import { Prisma, ReportSignatureRequestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  createReportSignatureToken,
  expireReportSignatureRequestIfNeeded,
  getReportSignatureStatus,
  REPORT_SIGNATURE_TTL_DAYS,
  resolveReportSignaturePublicOrigin,
} from "@/lib/report-signatures/report-signature-service";
import {
  getSchoolSignaturePublicUrl,
  writeSchoolSignatureFile,
} from "@/lib/settings/school-signature-file-storage";
import {
  getSchoolActivityTeamById,
  isCurrentSupervisorSignature,
  isCurrentSupervisorSignatureForField,
  type SchoolActivityTeamSupervisorSignature,
} from "@/lib/activity-team/activity-team-service";
import { buildSchoolActivityTeamReportSnapshot } from "@/lib/activity-team/activity-team-report";
import { processSignatureDataUrl } from "@/lib/signatures/signature-image-processor";

const ACTIVITY_TEAM_SIGNATURE_KIND = "ACTIVITY_TEAM";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function snapshotTeamId(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return "";
  const value = (snapshot as Record<string, unknown>).teamId;
  return clean(value);
}

function isActivityTeamSnapshot(snapshot: unknown): snapshot is { kind: string; teamId: string; gender?: string } {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return false;
  const value = snapshot as Record<string, unknown>;
  return value.kind === ACTIVITY_TEAM_SIGNATURE_KIND && Boolean(snapshotTeamId(value));
}

function signatureView(signature: SchoolActivityTeamSupervisorSignature) {
  return {
    supervisorName: signature.supervisorName,
    fieldKeys: signature.fieldKeys,
    signatureUrl: signature.signatureUrl,
    signedAt: signature.signedAt.toISOString(),
  };
}

async function findActivityTeamRequest(token: string) {
  const cleanToken = clean(token);
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(cleanToken)) return null;
  const request = await prisma.reportSignatureRequest.findUnique({
    where: { tokenHash: crypto.createHash("sha256").update(cleanToken, "utf8").digest("hex") },
    select: {
      id: true,
      schoolAccountId: true,
      status: true,
      expiresAt: true,
      requesterDisplayName: true,
      principalName: true,
      reportSnapshot: true,
      schoolAccount: {
        select: {
          name: true,
          profile: {
            select: {
              schoolName: true,
              educationDepartment: true,
              logoUrl: true,
              activityLeaderName: true,
              activityLeaderSignatureUrl: true,
              principalName: true,
              principalSignatureUrl: true,
            },
          },
        },
      },
    },
  });
  if (!request || !isActivityTeamSnapshot(request.reportSnapshot)) return null;

  const status = await expireReportSignatureRequestIfNeeded(request);
  return { ...request, status, token: cleanToken };
}

export async function createActivityTeamSignatureRequest(input: {
  requestUrl: string;
  teamId: string;
  schoolAccountId: string;
  requestedById: string;
  requesterDisplayName: string;
  principalName: string;
  gender?: string | null;
}) {
  const { token, tokenHash } = createReportSignatureToken();
  const expiresAt = new Date(Date.now() + REPORT_SIGNATURE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const snapshot = {
    kind: ACTIVITY_TEAM_SIGNATURE_KIND,
    teamId: input.teamId,
    gender: clean(input.gender),
  };

  const pending = await prisma.reportSignatureRequest.findMany({
    where: { schoolAccountId: input.schoolAccountId, status: ReportSignatureRequestStatus.PENDING },
    select: { id: true, reportSnapshot: true },
  });

  await prisma.$transaction(async (tx) => {
    const matchingIds = pending
      .filter((item) => isActivityTeamSnapshot(item.reportSnapshot) && snapshotTeamId(item.reportSnapshot) === input.teamId)
      .map((item) => item.id);
    if (matchingIds.length) {
      await tx.reportSignatureRequest.updateMany({
        where: { id: { in: matchingIds }, status: ReportSignatureRequestStatus.PENDING },
        data: { status: ReportSignatureRequestStatus.CANCELED, canceledAt: new Date() },
      });
    }
    await tx.reportSignatureRequest.create({
      data: {
        schoolAccountId: input.schoolAccountId,
        requestedById: input.requestedById,
        requesterDisplayName: input.requesterDisplayName || "رائد النشاط",
        principalName: input.principalName || "مدير المدرسة",
        tokenHash,
        expiresAt,
        reportSnapshot: snapshot as Prisma.InputJsonValue,
      },
    });
  });

  return `${resolveReportSignaturePublicOrigin(input.requestUrl)}/activity-team-signature/${encodeURIComponent(token)}`;
}

export async function getPublicActivityTeamSignature(token: string) {
  const request = await findActivityTeamRequest(token);
  if (!request) return null;
  const team = await getSchoolActivityTeamById(snapshotTeamId(request.reportSnapshot));
  if (!team || team.schoolAccountId !== request.schoolAccountId) return null;

  const profile = request.schoolAccount.profile;
  const assignments = team.assignments;
  const optionByName = new Map<string, { name: string; fieldKeys: string[]; signed: boolean }>();
  for (const [fieldKey, name] of Object.entries(assignments)) {
    const supervisorName = clean(name);
    if (!supervisorName) continue;
    const existing = optionByName.get(supervisorName);
    const fieldKeys = [...(existing?.fieldKeys || []), fieldKey];
    optionByName.set(supervisorName, {
      name: supervisorName,
      fieldKeys,
      signed: Boolean(
        existing?.signed ||
          team.signatures.some(
            (item) =>
              item.supervisorName === supervisorName &&
              isCurrentSupervisorSignature(item, assignments) &&
              fieldKeys.some((currentFieldKey) =>
                isCurrentSupervisorSignatureForField(
                  item,
                  assignments,
                  currentFieldKey,
                ),
              ),
          ),
      ),
    });
  }
  const options = Array.from(optionByName.values());

  const report = buildSchoolActivityTeamReportSnapshot({
    assignments,
    gender: (request.reportSnapshot as { gender?: string }).gender,
    schoolName: profile?.schoolName || request.schoolAccount.name,
    educationDepartment: profile?.educationDepartment,
    logoUrl: profile?.logoUrl,
    activityLeaderName: profile?.activityLeaderName || request.requesterDisplayName,
    activityLeaderSignatureUrl: profile?.activityLeaderSignatureUrl,
    principalName: profile?.principalName || request.principalName,
    principalSignatureUrl: profile?.principalSignatureUrl,
    supervisorSignatures: team.signatures,
  });

  return {
    token,
    status: getReportSignatureStatus(request),
    expiresAt: request.expiresAt.toISOString(),
    schoolName: profile?.schoolName || request.schoolAccount.name,
    requesterDisplayName: request.requesterDisplayName,
    principalName: request.principalName,
    report,
    supervisors: options,
    signatures: team.signatures.map(signatureView),
  };
}

export async function signActivityTeamSupervisor(input: {
  token: string;
  supervisorName: string;
  dataUrl: string;
}) {
  const request = await findActivityTeamRequest(input.token);
  if (!request) return { ok: false as const, code: "INVALID" as const };
  if (getReportSignatureStatus(request) !== ReportSignatureRequestStatus.PENDING) {
    return { ok: false as const, code: "UNAVAILABLE" as const };
  }

  const team = await getSchoolActivityTeamById(snapshotTeamId(request.reportSnapshot));
  if (!team || team.schoolAccountId !== request.schoolAccountId) return { ok: false as const, code: "INVALID" as const };

  const supervisorName = clean(input.supervisorName).slice(0, 160);
  const fieldKeys = Object.entries(team.assignments)
    .filter(([, name]) => name === supervisorName)
    .map(([fieldKey]) => fieldKey);
  if (!supervisorName || !fieldKeys.length) return { ok: false as const, code: "INELIGIBLE" as const };
  if (
    team.signatures.some(
      (signature) =>
        signature.supervisorName === supervisorName &&
        isCurrentSupervisorSignature(signature, team.assignments) &&
        fieldKeys.some((fieldKey) =>
          isCurrentSupervisorSignatureForField(
            signature,
            team.assignments,
            fieldKey,
          ),
        ),
    )
  ) {
    return { ok: false as const, code: "ALREADY_SIGNED" as const };
  }

  const signature = await processSignatureDataUrl(input.dataUrl);
  if (!signature) return { ok: false as const, code: "INVALID_SIGNATURE" as const };

  const fileName = `activity-team-supervisor-${team.id}-${crypto.randomBytes(12).toString("hex")}.png`;
  await writeSchoolSignatureFile(team.schoolAccountId, fileName, new Uint8Array(signature));
  const signatureUrl = getSchoolSignaturePublicUrl(team.schoolAccountId, fileName);

  try {
    const created = await prisma.schoolActivityTeamSupervisorSignature.create({
      data: {
        activityTeamId: team.id,
        supervisorName,
        fieldKeys,
        signatureUrl,
      },
      select: { supervisorName: true, fieldKeys: true, signatureUrl: true, signedAt: true },
    });
    return { ok: true as const, signature: signatureView({ id: "", ...created, fieldKeys: fieldKeys, signedAt: created.signedAt }) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, code: "ALREADY_SIGNED" as const };
    }
    throw error;
  }
}
