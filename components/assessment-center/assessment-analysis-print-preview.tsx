"use client";

import { useEffect, useState } from "react";

const PREVIEW_PADDING = 48;

function computePreviewScale(width: number, height: number) {
  const availableWidth = Math.max(320, width - PREVIEW_PADDING);
  const availableHeight = Math.max(320, height - PREVIEW_PADDING);

  return Math.max(
    0.1,
    Math.min(1, availableWidth / 1600, availableHeight / 1131),
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
          overflow: visible !important;
        }

        .assessment-print-preview {
          min-height: 100vh;
          background: #eef2f6;
          overflow: auto;
          padding: 24px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .assessment-print-preview-viewport {
          flex: 0 0 auto;
        }

        .assessment-print-preview-scale {
          width: 1600px;
          height: 1131px;
          transform-origin: top center;
        }

        .assessment-print-preview .sheet {
          margin: 0 !important;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18) !important;
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

          .assessment-print-preview {
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
            display: block !important;
            min-height: auto !important;
          }

          .assessment-print-preview-viewport {
            width: 297mm !important;
            height: 210mm !important;
          }

          .assessment-print-preview-scale {
            transform: none !important;
            width: auto !important;
            height: auto !important;
          }

          .assessment-print-preview .sheet {
            box-shadow: none !important;
          }
        }
      `}</style>

      <div
        className="assessment-print-preview-viewport"
        style={{
          width: `${1600 * previewScale}px`,
          height: `${1131 * previewScale}px`,
        }}
      >
        <div
          className="assessment-print-preview-scale"
          style={{ transform: `scale(${previewScale})` }}
          dangerouslySetInnerHTML={{ __html: bodyContent }}
        />
      </div>
    </section>
  );
}
