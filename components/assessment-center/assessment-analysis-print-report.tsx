import { buildAssessmentPdfHtml } from "@/lib/assessment-center/assessment-pdf-report";

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

  return (
    <section className="assessment-print-page" dir="rtl">
      <style>{`
        ${styles}

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color-scheme: light !important;
        }

        body {
          overflow: visible !important;
        }

        .assessment-print-page {
          width: 1600px;
          height: 900px;
          margin: 0 auto;
          background: #ffffff;
        }

        .assessment-print-page .sheet {
          margin: 0 auto !important;
          box-shadow: none !important;
        }
      `}</style>

      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </section>
  );
}
