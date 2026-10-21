/**
 * WebKit print-fragmentation guardrails for the already-frozen Portfolio pages.
 *
 * These rules do not resize or re-plan a page. They make the existing physical
 * page an atomic print item and remove the preview-only flex spacing from the
 * three designs whose DOM order is already the physical order. The Ministry
 * design is intentionally excluded from the root display override because its
 * cover uses CSS `order` to preserve the frozen cover-first order.
 */
export const PORTFOLIO_PRINT_PAGINATION_CSS = `
  @media print {
    .atlas-root,
    .hzn-root,
    .moe24-root {
      display: block !important;
      width: 210mm !important;
      min-width: 210mm !important;
      max-width: 210mm !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      gap: 0 !important;
      overflow: visible !important;
    }

    .portfolio-print-root {
      min-height: 0 !important;
    }

    .portfolio-page,
    .portfolio-report-page,
    .atlas-page,
    .hzn-page,
    .moe24-page {
      display: block !important;
      position: relative !important;
      box-sizing: border-box !important;
      flex: none !important;
      width: 210mm !important;
      min-width: 210mm !important;
      max-width: 210mm !important;
      height: 297mm !important;
      min-height: 297mm !important;
      max-height: 297mm !important;
      margin: 0 !important;
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
    }

    .portfolio-page:not(:last-child),
    .portfolio-report-page:not(:last-child),
    .atlas-page:not(:last-child),
    .hzn-page:not(:last-child),
    .moe24-page:not(:last-child) {
      break-after: page !important;
      page-break-after: always !important;
    }

    .portfolio-page-body,
    .portfolio-report-frame,
    .portfolio-report-body,
    .atlas-body,
    .hzn-body,
    .moe24-page-body {
      box-sizing: border-box !important;
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
    }
  }
`;
