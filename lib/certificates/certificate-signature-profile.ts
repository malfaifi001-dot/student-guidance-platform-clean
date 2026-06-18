import { prisma } from "@/lib/prisma";

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

  if (!profile) {
    return null;
  }

  const isActivityLeader = clean(role) === "ACTIVITY_LEADER";

  const issuerTitle = isActivityLeader ? "رائد النشاط" : "الموجه الطلابي";
  const issuerName = isActivityLeader
    ? clean(profile.activityLeaderName) || clean(fallbackIssuerName) || issuerTitle
    : clean(fallbackIssuerName) || "الموجه الطلابي";

  const issuerSignatureUrl = isActivityLeader
    ? clean(profile.activityLeaderSignatureUrl)
    : clean(profile.counselorSignatureUrl);

  return {
    principalName: clean(profile.principalName) || "مدير المدرسة",
    principalSignatureUrl: clean(profile.principalSignatureUrl),
    issuerName,
    issuerTitle,
    issuerSignatureUrl,
    schoolLogoUrl: clean(profile.logoUrl),
  };
}
