import { buildAssessmentPdfHtml } from "@/lib/assessment-center/assessment-pdf-report";

type Props = {
  analysis: Record<string, unknown>;
  schoolProfile?: Record<string, unknown> | null;
};

const SOURCE_WIDTH = 1600;
const SOURCE_HEIGHT = 900;
const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;
const SOURCE_LAYOUT_WIDTH_MM = 423.33418;
const SOURCE_LAYOUT_HEIGHT_MM = 238.125;
const SCALE_X = A4_LANDSCAPE_WIDTH_MM / SOURCE_LAYOUT_WIDTH_MM;
const SCALE_Y = A4_LANDSCAPE_HEIGHT_MM / SOURCE_LAYOUT_HEIGHT_MM;

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
          width: 297mm;
          height: 210mm;
          margin: 0 auto;
          background: #ffffff;
          overflow: hidden;
          position: relative;
        }

        .assessment-print-stage {
          width: ${SOURCE_WIDTH}px;
          height: ${SOURCE_HEIGHT}px;
          transform-origin: top center;
          transform: scale(${SCALE_X}, ${SCALE_Y});
          position: absolute;
          top: 0;
          left: 50%;
          margin-left: -${SOURCE_WIDTH / 2}px;
        }

        .assessment-print-page .sheet {
          margin: 0 !important;
          box-shadow: none !important;
        }
      `}</style>

      <div
        className="assessment-print-stage"
        dangerouslySetInnerHTML={{ __html: bodyContent }}
      />
    </section>
  );
}
