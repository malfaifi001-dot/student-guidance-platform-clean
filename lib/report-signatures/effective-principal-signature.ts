import { prisma } from "@/lib/prisma";
import {
  resolvePrincipalSignatureForReport,
  type PrincipalSignatureResolution,
} from "@/lib/report-signatures/principal-signature-resolver";

const ELIGIBLE_ROLES = ["TEACHER", "COUNSELOR", "ACTIVITY_LEADER"] as const;

export async function resolveEffectivePrincipalSignature(input: {
  schoolAccountId: string;
  owner: { id: string; role: string; schoolAccountId?: string | null };
  signLink?: Parameters<typeof resolvePrincipalSignatureForReport>[0]["signLink"];
  principalDashboard?: Parameters<typeof resolvePrincipalSignatureForReport>[0]["principalDashboard"];
}): Promise<PrincipalSignatureResolution> {
  const [profile, authorization] = await Promise.all([
    prisma.schoolProfile.findUnique({
      where: { schoolAccountId: input.schoolAccountId },
      select: {
        schoolAccountId: true,
        principalSignatureUrl: true,
        principalSignatureSignedAt: true,
        principalSignatureReusePolicy: true,
      },
    }),
    ELIGIBLE_ROLES.includes(input.owner.role as (typeof ELIGIBLE_ROLES)[number])
      ? prisma.principalSignatureReuseAuthorization.findUnique({
          where: {
            schoolAccountId_userId: {
              schoolAccountId: input.schoolAccountId,
              userId: input.owner.id,
            },
          },
          select: { id: true },
        })
      : null,
  ]);

  return resolvePrincipalSignatureForReport({
    schoolIdentity: profile,
    signLink: input.signLink,
    principalDashboard: input.principalDashboard,
    reusePolicy: profile?.principalSignatureReusePolicy,
    reportOwner: input.owner,
    selectedStaffAuthorized: Boolean(authorization),
  });
}
