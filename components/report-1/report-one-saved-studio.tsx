import { ReportOneEditor } from "@/components/report-1/editor/report-one-editor";
import type { ReportOneDocumentDraft } from "@/components/report-1/editor/report-one-editor-types";

type ReportOneSavedStudioProps = {
  reportId: string;
  status: string;
  draft: ReportOneDocumentDraft;
};

export function ReportOneSavedStudio({
  reportId,
  status,
  draft,
}: ReportOneSavedStudioProps) {
  return (
    <ReportOneEditor
      reportId={reportId}
      status={status}
      template={draft.template}
      payload={draft.payload}
      initialDraft={draft}
    />
  );
}