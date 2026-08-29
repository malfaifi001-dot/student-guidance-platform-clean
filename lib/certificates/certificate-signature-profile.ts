import { prisma } from "@/lib/prisma";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";
import { getArabicUserRoleLabel } from "@/lib/auth/user-role-display";

export type CertificateSignatureProfile = {
  principalName: string;
  principalSignatureUrl: string;
  issuerName: string;
  issuerTitle: string;
  issuerSignatureUrl: string;
  schoolLogoUrl: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function getCertificateSignatureProfile(
  schoolAccountId: string,
  role?: string,
  fallbackIssuerName?: string,
  ownerUserId?: string,
  includePrincipalSignature = true,
): Promise<CertificateSignatureProfile | null> {
  if (!schoolAccountId) {
    return null;
  }

  const profile = await prisma.schoolProfile.findUnique({
    where: {
      schoolAccountId,
    },
    select: {
      principalName: true,
      principalSignatureUrl: true,
      activityLeaderName: true,
      activityLeaderSignatureUrl: true,
      counselorSignatureUrl: true,
      logoUrl: true,
    },
  });

  const user = ownerUserId
    ? await prisma.user.findUnique({
        where: { id: ownerUserId, schoolAccountId },
        select: {
          name: true,
          officialName: true,
          jobTitle: true,
          gender: true,
          signatureUrl: true,
        },
      })
    : null;

  if (!profile) {
    return null;
  }

  const normalizedRole = clean(role).toUpperCase();
  const isActivityLeader = normalizedRole === "ACTIVITY_LEADER";
  const isTeacher = normalizedRole === "TEACHER";
  const isPrincipal = normalizedRole === "PRINCIPAL";
  const roleTitle = getArabicUserRoleLabel({ role: normalizedRole, gender: user?.gender });
  const currentUserName = clean(user?.officialName) || clean(user?.name) || clean(fallbackIssuerName);

  const issuerTitle = clean(user?.jobTitle) || roleTitle;
  const issuerName = isActivityLeader
    ? clean(profile.activityLeaderName) || currentUserName || issuerTitle
    : currentUserName || issuerTitle;

  const issuerSignatureUrl = isActivityLeader
    ? clean(profile.activityLeaderSignatureUrl) || clean(user?.signatureUrl)
    : isTeacher || isPrincipal
      ? clean(user?.signatureUrl) || clean(profile.counselorSignatureUrl)
      : clean(profile.counselorSignatureUrl) || clean(user?.signatureUrl);

  return {
    principalName: clean(profile.principalName) || "مدير المدرسة",
    principalSignatureUrl: includePrincipalSignature && ownerUserId
      ? clean((await resolveEffectivePrincipalSignature({
          schoolAccountId,
          owner: { id: ownerUserId, role: role || "", schoolAccountId },
        })).signatureUrl)
      : "",
    issuerName,
    issuerTitle,
    issuerSignatureUrl,
    schoolLogoUrl: clean(profile.logoUrl),
  };
}
