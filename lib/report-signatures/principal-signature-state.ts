import type { ReportSignatureRequestStatus } from "@prisma/client";

type SignatureRequest = {
  status: ReportSignatureRequestStatus;
  signedAt: Date | null;
  signatureUrl: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isSignatureUrl(value: unknown, expected?: string) {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!url || url.includes("{{") || url.includes("}}")) return false;
  return expected ? url === expected : true;
}

/** Reads only persisted, semantic signature structures. It intentionally does not scan arbitrary HTML. */
export function hasStructuredPrincipalSignature(value: unknown, signatureUrl?: string) {
  const root = record(value);
  if (!root) return false;

  const identity = record(root.identity);
  if (isSignatureUrl(identity?.principalSignatureUrl, signatureUrl) || isSignatureUrl(identity?.schoolLeaderSignatureUrl, signatureUrl)) {
    return true;
  }

  const signatures = Array.isArray(root.signatures) ? root.signatures : [];
  if (signatures.some((item) => {
    const signature = record(item);
    return (signature?.key === "principal" || signature?.key === "schoolLeader") && isSignatureUrl(signature?.imageUrl, signatureUrl);
  })) return true;

  for (const nestedKey of ["payload", "sourcePayload", "snapshotPayload", "documentDraft"]) {
    if (hasStructuredPrincipalSignature(root[nestedKey], signatureUrl)) return true;
  }
  return false;
}

/**
 * Narrow compatibility check for pre-metadata records. It requires both the
 * exact current school signature URL and an explicit principal signature cue.
 */
export function hasLegacyPrincipalSignatureHtml(html: string | null | undefined, signatureUrl: string) {
  const source = String(html || "");
  if (!source || !source.includes(signatureUrl)) return false;
  return /data-signature-key=["']principal["']|مدير المدرسة|school.?leader|principal/i.test(source);
}

export function isPrincipalSignaturePresent(input: {
  source: "GUIDANCE_REPORT" | "REPORT_SNAPSHOT" | "REPORT_TWO";
  report: { principalSignatureUrl?: string | null; principalSignatureSignedAt?: Date | null };
  signedRequest?: SignatureRequest | null;
  signatureUrl?: string | null;
  structuredPayload?: unknown;
  approvedHtml?: string | null;
}) {
  if (input.source === "REPORT_TWO" && input.signedRequest?.status === "SIGNED" && input.signedRequest.signedAt && input.signedRequest.signatureUrl) return true;
  if (input.report.principalSignatureUrl && input.report.principalSignatureSignedAt) return true;

  const signatureUrl = input.signatureUrl?.trim();
  if (hasStructuredPrincipalSignature(input.structuredPayload, signatureUrl)) return true;
  if (!signatureUrl) return false;
  return hasLegacyPrincipalSignatureHtml(input.approvedHtml, signatureUrl);
}
