import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

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

  return {
    ...payload,
    identity: {
      ...payload.identity,
      principalSignatureUrl: signatureUrl,
      schoolLeaderSignatureUrl: signatureUrl,
    },
    signatures: payload.signatures.map((signature) =>
      signature.key === "principal"
        ? { ...signature, imageUrl: signatureUrl }
        : signature,
    ),
  };
}
