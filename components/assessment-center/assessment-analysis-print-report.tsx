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
          min-height: 100vh;
          background: #eef2f6;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 24px;
        }

        .assessment-print-page .sheet {
          margin: 0 auto !important;
          box-shadow: none !important;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 297mm !important;
            height: 210mm !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .assessment-print-page {
            display: block !important;
            width: 297mm !important;
            height: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }

          .assessment-print-page .sheet {
            margin: 0 !important;
          }
        }
      `}</style>

      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </section>
  );
}
