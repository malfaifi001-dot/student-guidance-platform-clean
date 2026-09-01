export function DocumentPrintStyles() {
  return (
    <style>{`
      @page {
        size: A4 portrait;
        margin: 0;
      }

      @media print {
        html,
        body {
          background: #ffffff !important;
        }

        [data-document-page] {
          margin: 0 !important;
          box-shadow: none !important;

          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        [data-document-signature-zone] {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        [data-document-block] {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `}</style>
  );
}