import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import type { PrincipalSignatureResolution } from "@/lib/report-signatures/principal-signature-resolver";
import { tracePrincipalSignature } from "@/lib/report-signatures/principal-signature-trace";

export type ReportTwoSignatureSnapshot = {
  kind: "REPORT_TWO";
  report: {
    template: unknown;
    context: Record<string, string>;
    previewCase: unknown;
    sourcePayload: unknown;
    variantId: string | null;
  };
};

export function isReportTwoSignatureSnapshot(value: unknown): value is ReportTwoSignatureSnapshot {
  return Boolean(value && typeof value === "object" && (value as { kind?: unknown }).kind === "REPORT_TWO");
}

export function applyExternalPrincipalSignature(
  payload: SmartReportPayload,
  signatureUrl: string | null | undefined,
): SmartReportPayload {
  if (!signatureUrl) return payload;

  const signatures = payload.signatures || [];
  const hasPrincipal = signatures.some((signature) => signature.key === "principal");

  return {
    ...payload,
    identity: {
      ...(payload.identity || {}),
      principalSignatureUrl: signatureUrl,
      schoolLeaderSignatureUrl: signatureUrl,
    },
    signatures: [
      ...signatures.map((signature) =>
      signature.key === "principal"
        ? { ...signature, imageUrl: signatureUrl }
          : signature,
      ),
      ...(hasPrincipal ? [] : [{
        key: "principal",
        label: "مدير المدرسة",
        signerTitle: "مدير المدرسة",
        imageUrl: signatureUrl,
        required: false,
      }]),
    ],
  };
}

/**
 * Reconciles the semantic payload with the resolver's effective result.
 * Unlike the historical one-way helper above, this also clears a stale
 * reusable principal signature when the current policy no longer allows it.
 */
export function reconcilePrincipalSignaturePayload(
  payload: SmartReportPayload,
  resolution: PrincipalSignatureResolution,
): SmartReportPayload {
  tracePrincipalSignature({
    stage: "RECONCILE_INPUT",
    location: "reconcilePrincipalSignaturePayload",
    details: { resolverSource: resolution.source, resolverStatus: resolution.status },
    payload,
    signature: resolution.signatureUrl,
  });
  const signatureUrl = resolution.signatureUrl || null;
  const signatures = Array.isArray(payload.signatures) ? payload.signatures : [];
  const hasPrincipal = signatures.some((signature) => signature.key === "principal");

  const reconciledPayload = {
    ...payload,
    identity: {
      ...(payload.identity || {}),
      principalSignatureUrl: signatureUrl || "",
      schoolLeaderSignatureUrl: signatureUrl || "",
    },
    signatures: signatureUrl && !hasPrincipal
      ? [
          ...signatures,
          {
            key: "principal",
            label: "مدير المدرسة",
            signerTitle: "مدير المدرسة",
            imageUrl: signatureUrl,
            required: false,
          },
        ]
      : signatures.map((signature) =>
          signature.key === "principal"
            ? { ...signature, imageUrl: signatureUrl }
            : signature,
        ),
  };
  tracePrincipalSignature({
    stage: "RECONCILE_OUTPUT",
    location: "reconcilePrincipalSignaturePayload",
    payload: reconciledPayload,
  });
  return reconciledPayload;
}
