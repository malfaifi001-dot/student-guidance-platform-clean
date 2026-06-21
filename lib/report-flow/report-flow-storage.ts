import type { ReportLanguageMode } from "@/lib/report-engine/report-language-mode";
import { normalizeReportLanguageMode } from "@/lib/report-engine/report-language-mode";
import type { ReportFlowPreparation } from "@/lib/report-flow/report-flow-types";

export function getReportFlowPreparationKey(caseId: string, variantId: string) {
  return `report-flow:prepare:${variantId || "default"}:${caseId || "unknown"}`;
}

export function getReportFlowLanguageModePreferenceKey() {
  return "report-flow:language-mode-preference:v1";
}

export function saveReportFlowLanguageModePreference(mode: ReportLanguageMode) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getReportFlowLanguageModePreferenceKey(),
    normalizeReportLanguageMode(mode),
  );
}

export function loadReportFlowLanguageModePreference(): ReportLanguageMode | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(getReportFlowLanguageModePreferenceKey());

  if (!raw) {
    return null;
  }

  return normalizeReportLanguageMode(raw);
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

    return {
      ...parsed,
      languageMode: normalizeReportLanguageMode(parsed.languageMode || "MALE"),
      fields: parsed.fields.map((field) => ({
        ...field,
        originalLabel: field.originalLabel || field.label || "",
        originalValue: field.originalValue || field.value || "",
      })),
    };
  } catch {
    return null;
  }
}

export function clearReportFlowPreparation(caseId: string, variantId: string) {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(getReportFlowPreparationKey(caseId, variantId));
}
