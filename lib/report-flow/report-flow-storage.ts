import type { ReportFlowPreparation } from "@/lib/report-flow/report-flow-types";

export function getReportFlowPreparationKey(caseId: string, variantId: string) {
  return `report-flow:prepare:${variantId || "default"}:${caseId || "unknown"}`;
}

export function saveReportFlowPreparation(preparation: ReportFlowPreparation) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getReportFlowPreparationKey(preparation.caseId, preparation.variantId),
    JSON.stringify({
      ...preparation,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function loadReportFlowPreparation(
  caseId: string,
  variantId: string,
): ReportFlowPreparation | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(
    getReportFlowPreparationKey(caseId, variantId),
  );

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ReportFlowPreparation;

    if (
      !parsed ||
      parsed.version !== 1 ||
      parsed.caseId !== caseId ||
      parsed.variantId !== variantId ||
      !Array.isArray(parsed.fields)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearReportFlowPreparation(caseId: string, variantId: string) {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(getReportFlowPreparationKey(caseId, variantId));
}