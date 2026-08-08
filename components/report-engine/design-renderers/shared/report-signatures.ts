export function getReportDesignSignatureStyleText() {
  return `
    .pdf-report-page,
    .pdf-report-page * {
      color-scheme: light !important;
    }

    .report-design-signature-grid-block,
    .report-design-signature-grid-block * {
      color-scheme: light !important;
    }

    .report-design-signature-image-frame {
      background: #ffffff !important;
    }

    .report-design-signature-image {
      background: #ffffff !important;
      object-fit: contain !important;
      mix-blend-mode: normal !important;
      filter: none !important;
    }

    .report-design-evidence-fallback[data-report-design-real-evidence="true"] p {
      font-size: 0 !important;
      line-height: 0 !important;
      color: transparent !important;
    }

    .report-design-evidence-fallback[data-report-design-real-evidence="true"] p::after {
      content: "شاهد بدون صورة";
      font-size: 12px;
      line-height: 1.5;
      color: #64748b;
    }
  `;
}

