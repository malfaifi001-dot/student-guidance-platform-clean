import { buildAssessmentPdfHtml } from "@/lib/assessment-center/assessment-pdf-report";
import { AssessmentAnalysisPrintPreview } from "./assessment-analysis-print-preview";

type Props = {
  analysis: Record<string, unknown>;
  schoolProfile?: Record<string, unknown> | null;
};

function extractSection(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1]?.trim() || "";
}

export function AssessmentAnalysisPrintReport({
  analysis,
  schoolProfile = null,
}: Props) {
  const html = buildAssessmentPdfHtml({
    analysis,
    summary: analysis.summaryJson as Record<string, unknown> | null,
    rows: Array.isArray(analysis.rowsJson)
      ? (analysis.rowsJson as Record<string, unknown>[])
      : [],
    schoolProfile,
  });

  const styles = extractSection(html, /<style>([\s\S]*?)<\/style>/i);
  const bodyContent = extractSection(html, /<body[^>]*>([\s\S]*?)<\/body>/i);

  return <AssessmentAnalysisPrintPreview styles={styles} bodyContent={bodyContent} />;
}
