import "server-only";

import { prisma } from "@/lib/prisma";
import { SCHOOL_ACTIVITY_TEAM_FIELDS } from "@/lib/activity-team/activity-team-config";

export type SchoolActivityTeamAssignments = Record<string, string>;

export type SchoolActivityTeamSupervisorSignature = {
  id: string;
  supervisorName: string;
  fieldKeys: string[];
  signatureUrl: string;
  signedAt: Date;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeAssignments(value: unknown): SchoolActivityTeamAssignments {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  const nested = source.assignments;
  const assignmentSource =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : source;

  return Object.fromEntries(
    SCHOOL_ACTIVITY_TEAM_FIELDS.map(({ key }) => [
      key,
      typeof assignmentSource[key] === "string"
        ? assignmentSource[key].trim().slice(0, 160)
        : "",
    ]),
  );
}

function normalizeFieldKeys(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(clean)
    .filter((key) => SCHOOL_ACTIVITY_TEAM_FIELDS.some((field) => field.key === key));
}

function normalizeStoredSignatures(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.signatures)) return [];

  return raw.signatures.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const signature = item as Record<string, unknown>;
    const supervisorName = clean(signature.supervisorName).slice(0, 160);
    const fieldKeys = normalizeFieldKeys(signature.fieldKeys);
    const signatureUrl = clean(signature.signatureUrl);
    const signedAt = clean(signature.signedAt);
    if (!supervisorName || !fieldKeys.length || !signatureUrl) return [];
    return [{ supervisorName, fieldKeys, signatureUrl, signedAt }];
  });
}

function normalizeAssignmentsDocument(
  assignments: SchoolActivityTeamAssignments,
  signatures: ReturnType<typeof normalizeStoredSignatures>,
) {
  const eligibleNames = new Set(Object.values(assignments).filter(Boolean));
  return {
    assignments,
    signatures: signatures.filter((signature) => eligibleNames.has(signature.supervisorName)),
  };
}

function mapSupervisorSignature(
  signature: {
    id: string;
    supervisorName: string;
    fieldKeys: unknown;
    signatureUrl: string;
    signedAt: Date;
  },
): SchoolActivityTeamSupervisorSignature {
  return {
    id: signature.id,
    supervisorName: signature.supervisorName,
    fieldKeys: normalizeFieldKeys(signature.fieldKeys),
    signatureUrl: signature.signatureUrl,
    signedAt: signature.signedAt,
  };
}

export async function getSchoolActivityTeam(schoolAccountId: string) {
  const record = await prisma.schoolActivityTeam.findUnique({
    where: { schoolAccountId },
    select: {
      id: true,
      assignments: true,
      updatedAt: true,
      supervisorSignatures: {
        orderBy: { signedAt: "asc" },
        select: { id: true, supervisorName: true, fieldKeys: true, signatureUrl: true, signedAt: true },
      },
    },
  });

  return {
    id: record?.id ?? null,
    assignments: normalizeAssignments(record?.assignments),
    signatures: record?.supervisorSignatures.map(mapSupervisorSignature) || [],
    updatedAt: record?.updatedAt ?? null,
  };
}

export async function getSchoolActivityTeamById(id: string) {
  const record = await prisma.schoolActivityTeam.findUnique({
    where: { id },
    select: {
      id: true,
      schoolAccountId: true,
      assignments: true,
      updatedAt: true,
      supervisorSignatures: {
        orderBy: { signedAt: "asc" },
        select: { id: true, supervisorName: true, fieldKeys: true, signatureUrl: true, signedAt: true },
      },
    },
  });

  return record
    ? {
        ...record,
        assignments: normalizeAssignments(record.assignments),
        signatures: record.supervisorSignatures.map(mapSupervisorSignature),
      }
    : null;
}

export async function saveSchoolActivityTeam(
  schoolAccountId: string,
  assignments: unknown,
) {
  const normalized = normalizeAssignments(assignments);
  const existing = await prisma.schoolActivityTeam.findUnique({
    where: { schoolAccountId },
    select: { assignments: true },
  });
  const preservedSignatures = normalizeStoredSignatures(existing?.assignments);
  const document = normalizeAssignmentsDocument(normalized, preservedSignatures);
  const record = await prisma.schoolActivityTeam.upsert({
    where: { schoolAccountId },
    update: { assignments: document },
    create: { schoolAccountId, assignments: document },
    select: { id: true, assignments: true, updatedAt: true },
  });
  const eligibleNames = Object.values(normalized).filter(Boolean);
  await prisma.schoolActivityTeamSupervisorSignature.deleteMany({
    where: eligibleNames.length
      ? { activityTeamId: record.id, supervisorName: { notIn: eligibleNames } }
      : { activityTeamId: record.id },
  });

  return {
    assignments: normalizeAssignments(record.assignments),
    updatedAt: record.updatedAt,
  };
}
