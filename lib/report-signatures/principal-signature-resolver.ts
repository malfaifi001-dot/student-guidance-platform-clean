import type { ReportSignatureRequestStatus } from "@prisma/client";
import { tracePrincipalSignature } from "@/lib/report-signatures/principal-signature-trace";

export type PrincipalSignatureResolutionSource =
  | "SCHOOL_IDENTITY"
  | "SIGN_LINK"
  | "PRINCIPAL_DASHBOARD";

export type PrincipalSignatureReusePolicy =
  | "ALL_STAFF"
  | "SELECTED_STAFF"
  | "MANUAL_ONLY";

export type PrincipalSignatureResolution = {
  status: "SIGNED" | "UNSIGNED";
  source: PrincipalSignatureResolutionSource | null;
  signatureUrl: string | null;
  signedAt: Date | null;
  signedById: string | null;
  isPersistent: boolean;
  authorizationReason: "REPORT_SIGNATURE" | "SCHOOL_IDENTITY" | "NONE";
};

type SignatureRecord = {
  principalSignatureUrl?: string | null;
  principalSignatureSignedAt?: Date | null;
  principalSignatureSignedById?: string | null;
};

type SchoolIdentityRecord = {
  schoolAccountId?: string | null;
  principalSignatureUrl?: string | null;
  principalSignatureSignedAt?: Date | null;
};

type SignedLinkRecord = {
  status?: ReportSignatureRequestStatus | string | null;
  signatureUrl?: string | null;
  signedAt?: Date | null;
};

function cleanUrl(value: unknown) {
  const url = typeof value === "string" ? value.trim() : "";
  return url && !url.includes("{{") && !url.includes("}}") ? url : null;
}

function signedResult(
  source: PrincipalSignatureResolutionSource,
  signatureUrl: string,
  signedAt: Date | null,
  signedById: string | null,
  isPersistent: boolean,
  authorizationReason: "REPORT_SIGNATURE" | "SCHOOL_IDENTITY",
): PrincipalSignatureResolution {
  return {
    status: "SIGNED",
    source,
    signatureUrl,
    signedAt,
    signedById,
    isPersistent,
    authorizationReason,
  };
}

export function resolvePrincipalSignatureForReport(input: {
  schoolIdentity?: SchoolIdentityRecord | null;
  signLink?: SignedLinkRecord | null;
  principalDashboard?: SignatureRecord | null;
  reusePolicy?: PrincipalSignatureReusePolicy | null;
  reportOwner?: { id: string; schoolAccountId?: string | null; role?: string | null } | null;
  selectedStaffAuthorized?: boolean;
}): PrincipalSignatureResolution {
  const schoolUrl = cleanUrl(input.schoolIdentity?.principalSignatureUrl);
  const linkUrl = cleanUrl(input.signLink?.signatureUrl);
  const dashboardUrl = cleanUrl(input.principalDashboard?.principalSignatureUrl);
  const ownerRole = String(input.reportOwner?.role || "").toUpperCase();
  const ownerSchoolMatches = Boolean(
    input.reportOwner?.schoolAccountId &&
      input.schoolIdentity?.schoolAccountId &&
      input.reportOwner.schoolAccountId === input.schoolIdentity.schoolAccountId,
  );
  const isPrincipalOwner = ownerRole === "PRINCIPAL";
  const isEligibleStaff = ["TEACHER", "COUNSELOR", "ACTIVITY_LEADER"].includes(ownerRole);
  tracePrincipalSignature({
    stage: "RESOLVER_INPUT",
    location: "resolvePrincipalSignatureForReport",
    details: {
      policy: input.reusePolicy || "MANUAL_ONLY",
      ownerRole,
      ownerSchoolMatches,
      isPrincipalOwner,
      isEligibleStaff,
      selectedStaffAuthorized: input.selectedStaffAuthorized === true,
    },
    signature: schoolUrl,
  });
  const finish = (result: PrincipalSignatureResolution) => {
    tracePrincipalSignature({
      stage: "RESOLVER_OUTPUT",
      location: "resolvePrincipalSignatureForReport",
      details: {
        status: result.status,
        source: result.source,
        authorizationReason: result.authorizationReason,
        signedAtExists: Boolean(result.signedAt),
        signedById: result.signedById,
        isPersistent: result.isPersistent,
      },
      signature: result.signatureUrl,
    });
    return result;
  };
  if (
    linkUrl &&
    String(input.signLink?.status || "").toUpperCase() === "SIGNED" &&
    input.signLink?.signedAt
  ) {
    return finish(signedResult("SIGN_LINK", linkUrl, input.signLink.signedAt, null, false, "REPORT_SIGNATURE"));
  }

  if (dashboardUrl && input.principalDashboard?.principalSignatureSignedAt) {
    return finish(signedResult(
      "PRINCIPAL_DASHBOARD",
      dashboardUrl,
      input.principalDashboard.principalSignatureSignedAt,
      input.principalDashboard.principalSignatureSignedById || null,
      false,
      "REPORT_SIGNATURE",
    ));
  }

  const policy = input.reusePolicy || "MANUAL_ONLY";
  const canReuseSchoolSignature =
    Boolean(schoolUrl) &&
    (isPrincipalOwner || ownerSchoolMatches) &&
    (isPrincipalOwner ||
      (isEligibleStaff &&
        (policy === "ALL_STAFF" ||
          (policy === "SELECTED_STAFF" && input.selectedStaffAuthorized === true))));

  if (canReuseSchoolSignature && schoolUrl) {
    return finish(signedResult(
      "SCHOOL_IDENTITY",
      schoolUrl,
      input.schoolIdentity?.principalSignatureSignedAt || null,
      null,
      true,
      "SCHOOL_IDENTITY",
    ));
  }

  return finish({
    status: "UNSIGNED",
    source: null,
    signatureUrl: null,
    signedAt: null,
    signedById: null,
    isPersistent: false,
    authorizationReason: "NONE",
  });
}
