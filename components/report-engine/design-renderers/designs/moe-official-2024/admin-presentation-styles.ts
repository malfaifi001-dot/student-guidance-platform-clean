export const MOE_OFFICIAL_2024_ADMIN_PRESENTATION_CSS = `
  .moe24-report-section-normal {
    background: transparent;
  }

  .moe24-report-section-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .moe24-report-section-soft {
    border: 1px solid rgba(21, 68, 90, 0.08);
    border-radius: 4mm;
    padding: 4mm;
    background: #F5F7F6;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .moe24-report-section-featured {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(13, 169, 166, 0.2);
    border-radius: 4mm;
    padding: 4mm 4.5mm;
    background: #ffffff;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .moe24-report-section-featured::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 1.4mm;
    height: 100%;
    background: #07A869;
  }

  .moe24-report-section-outline {
    border: 1px solid rgba(21, 68, 90, 0.28);
    border-radius: 4mm;
    padding: 4mm;
    background: transparent;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .moe24-report-section-hero {
    position: relative;
    border-bottom: 1px solid rgba(21, 68, 90, 0.16);
    padding: 2mm 0 4mm;
  }

  .moe24-report-block-title {
    color: #15445A;
    font-weight: 950;
  }

  .moe24-report-block-title-hero {
    font-size: 22px;
    line-height: 1.45;
  }

  .moe24-report-block-title-featured {
    color: #15445A;
  }

  .moe24-report-block-content {
    color: #334155;
  }

  .moe24-report-block-content-hero {
    margin-top: 2mm;
  }

  .moe24-report-block-content-list ul,
  .moe24-report-block-content-list ol {
    display: grid;
    gap: 2mm;
  }

  /* Report Engine isolation only.
     لا نغير تصميم MOE الأصلي هنا. */
  .moe24-root {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    gap: 0 !important;
    display: block !important;
    flex-direction: initial !important;
    align-items: initial !important;
    justify-content: initial !important;
    background: transparent !important;
    overflow: visible !important;
    font-family: inherit !important;
  }

  .moe24-root > .moe24-page {
    margin-inline: auto !important;
    margin-block: 0 !important;
  }
`;
