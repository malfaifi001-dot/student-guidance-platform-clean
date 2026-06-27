"use client";

import { useEffect, useState } from "react";

const REPORT_WIDTH = 1600;
const REPORT_HEIGHT = 1131;
const PREVIEW_PADDING = 48;

function computePreviewScale(width: number, height: number) {
  const availableWidth = Math.max(320, width - PREVIEW_PADDING);
  const availableHeight = Math.max(320, height - PREVIEW_PADDING);

  return Math.max(
    0.1,
    Math.min(1, availableWidth / REPORT_WIDTH, availableHeight / REPORT_HEIGHT),
  );
}

export function AssessmentAnalysisPrintPreview({
  styles,
  bodyContent,
}: {
  styles: string;
  bodyContent: string;
}) {
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      setPreviewScale(computePreviewScale(window.innerWidth, window.innerHeight));
    }

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <section className="assessment-print-preview" dir="rtl">
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
          overflow: hidden !important;
        }

        .assessment-print-preview {
          position: fixed;
          inset: 0;
          z-index: 9999;
          width: 100vw;
          height: 100vh;
          box-sizing: border-box;
          background: #eef2f6;
          overflow: auto;
          padding: 24px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .assessment-print-preview-svg {
          display: block;
          flex: 0 0 auto;
          background: #ffffff;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
        }

        .assessment-print-preview-foreign {
          width: ${REPORT_WIDTH}px;
          height: ${REPORT_HEIGHT}px;
          overflow: hidden;
          background: #ffffff;
        }

        .assessment-print-preview-foreign .sheet {
          width: ${REPORT_WIDTH}px !important;
          height: ${REPORT_HEIGHT}px !important;
          margin: 0 !important;
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
            width: 297mm !important;
            height: 210mm !important;
            min-width: 297mm !important;
            min-height: 210mm !important;
            overflow: hidden !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .assessment-print-preview {
            position: fixed !important;
            inset: 0 !important;
            z-index: 9999 !important;
            display: block !important;
            width: 297mm !important;
            height: 210mm !important;
            min-width: 297mm !important;
            min-height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          .assessment-print-preview-svg {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            box-shadow: none !important;
            overflow: hidden !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-before: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
          }

          .assessment-print-preview-foreign {
            width: ${REPORT_WIDTH}px !important;
            height: ${REPORT_HEIGHT}px !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          .assessment-print-preview-foreign .sheet {
            width: ${REPORT_WIDTH}px !important;
            height: ${REPORT_HEIGHT}px !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <svg
        className="assessment-print-preview-svg"
        width={REPORT_WIDTH * previewScale}
        height={REPORT_HEIGHT * previewScale}
        viewBox={`0 0 ${REPORT_WIDTH} ${REPORT_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <foreignObject width={REPORT_WIDTH} height={REPORT_HEIGHT}>
          <div
            className="assessment-print-preview-foreign"
            dangerouslySetInnerHTML={{ __html: bodyContent }}
          />
        </foreignObject>
      </svg>
    </section>
  );
}