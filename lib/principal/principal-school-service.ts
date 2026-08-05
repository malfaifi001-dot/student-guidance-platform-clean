import "server-only";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function normalizeStatisticalNumber(value: unknown) {
  const normalized = String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[\s-]+/g, "")
    .trim();

  if (!normalized || !/^\d{3,50}$/.test(normalized)) {
    throw new Error("INVALID_STATISTICAL_NUMBER");
  }

  return normalized;
}

export async function findSchoolByStatisticalNumber(
  value: unknown,
  client: typeof prisma | Prisma.TransactionClient = prisma,
) {
  const schoolStatisticalNumber = normalizeStatisticalNumber(value);

  return client.schoolProfile.findFirst({
    where: { schoolStatisticalNumber },
    select: {
      schoolAccountId: true,
      schoolName: true,
      schoolStatisticalNumber: true,
    },
  });
}

export async function getPrincipalSchoolContext() {
  const current = await getCurrentSessionUser();

  if (!current?.user || current.user.role !== "PRINCIPAL") {
    throw new Error("PRINCIPAL_REQUIRED");
  }

  const schoolAccountId = current.user.schoolAccountId;
  const schoolAccount = schoolAccountId
    ? await prisma.schoolAccount.findUnique({
        where: { id: schoolAccountId },
        include: { profile: true },
      })
    : null;

  return { current, user: current.user, schoolAccountId, schoolAccount };
}

export async function getPrincipalSchoolProfile() {
  const context = await getPrincipalSchoolContext();
  return context.schoolAccount?.profile ?? null;
}

export function isPrincipalSchoolProfileComplete(profile: {
  schoolName?: string | null;
  principalName?: string | null;
  schoolStatisticalNumber?: string | null;
  educationDepartment?: string | null;
  city?: string | null;
  stage?: string | null;
} | null | undefined) {
  return Boolean(
    profile &&
      profile.schoolName?.trim() &&
      profile.principalName?.trim() &&
      profile.schoolStatisticalNumber?.trim() &&
      profile.educationDepartment?.trim() &&
      profile.city?.trim() &&
      profile.stage?.trim(),
  );
}

export function createPrincipalSchoolSlug(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "school"}-${Math.random().toString(36).slice(2, 8)}`;
}
