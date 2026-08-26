/** Shared semantic type scale for predictable Arabic A4 output. */
export const PORTFOLIO_A4 = {
  widthMm: 210,
  heightMm: 297,
  safeTopMm: 16,
  safeBottomMm: 16,
  safeInlineMm: 14,
} as const;

export const PORTFOLIO_TYPOGRAPHY = {
  coverTitle: { size: "30px", weight: 900, lineHeight: 1.2 },
  pageTitle: { size: "22px", weight: 900, lineHeight: 1.25 },
  sectionTitle: { size: "18px", weight: 800, lineHeight: 1.3 },
  subsectionTitle: { size: "14px", weight: 800, lineHeight: 1.4 },
  cardTitle: { size: "12px", weight: 800, lineHeight: 1.45 },
  fieldLabel: { size: "10px", weight: 700, lineHeight: 1.45 },
  fieldValue: { size: "11px", weight: 600, lineHeight: 1.65 },
  body: { size: "11px", weight: 500, lineHeight: 1.8 },
  narrative: { size: "12px", weight: 500, lineHeight: 1.9 },
  list: { size: "10.5px", weight: 500, lineHeight: 1.65 },
  caption: { size: "9px", weight: 500, lineHeight: 1.45 },
  metadata: { size: "9px", weight: 700, lineHeight: 1.4 },
  footer: { size: "8px", weight: 600, lineHeight: 1.3 },
  pageNumber: { size: "9px", weight: 700, lineHeight: 1.3 },
} as const;

export const PORTFOLIO_FONT_STACK = 'var(--font-cairo), "Cairo", Tahoma, Arial, sans-serif';
