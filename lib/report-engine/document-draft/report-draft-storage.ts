import type {
  ReportDocumentDraft,
  ReportDocumentEditorState,
} from "@/lib/report-engine/document-draft/report-document-types";

export function getReportDocumentDraftKey(caseId: string, variantId: string) {
  return `report-document-draft:${caseId}:${variantId}`;
}

export function saveReportDocumentDraft(draft: ReportDocumentDraft) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getReportDocumentDraftKey(draft.caseId, draft.variantId),
    JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function loadReportDocumentDraft(
  caseId: string,
  variantId: string,
): ReportDocumentDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(
    getReportDocumentDraftKey(caseId, variantId),
  );

  if (!raw) return null;

  try {
    const draft = JSON.parse(raw) as ReportDocumentDraft;

    if (draft.caseId !== caseId || draft.variantId !== variantId) return null;

    return draft;
  } catch {
    return null;
  }
}

export function clearReportDocumentDraft(caseId: string, variantId: string) {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(getReportDocumentDraftKey(caseId, variantId));
}

export function saveReportDocumentEditorState(state: ReportDocumentEditorState) {
  saveReportDocumentDraft(state.draft);
}