export type ReportHeaderSettings = {
  heightPx: number;
  paddingTopPx: number;
  paddingBottomPx: number;
  paddingInlinePx: number;
  itemGapPx: number;
  logoSizePx: number;
  headerFontSizePx: number;
  titleFontSizePx: number;
  subtitleFontSizePx: number;
  fontWeight: "inherit" | "400" | "500" | "600" | "700" | "800" | "900";
  lineHeight: number;
  fontFamily: "inherit" | "Cairo" | "Arial";
};

export const DEFAULT_REPORT_HEADER_SETTINGS: ReportHeaderSettings = {
  heightPx: 0,
  paddingTopPx: 0,
  paddingBottomPx: 0,
  paddingInlinePx: 0,
  itemGapPx: 0,
  logoSizePx: 0,
  headerFontSizePx: 0,
  titleFontSizePx: 0,
  subtitleFontSizePx: 0,
  fontWeight: "inherit",
  lineHeight: 0,
  fontFamily: "inherit",
};

function clampHeaderNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  decimals = 0,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  const bounded = Math.min(max, Math.max(min, number));
  const factor = 10 ** decimals;

  return Math.round(bounded * factor) / factor;
}

export function normalizeReportHeaderSettings(
  value: unknown,
): ReportHeaderSettings {
  const settings =
    value && typeof value === "object"
      ? (value as Partial<ReportHeaderSettings>)
      : {};
  const fontWeight = String(settings.fontWeight || "inherit");
  const fontFamily = String(settings.fontFamily || "inherit");

  return {
    heightPx: clampHeaderNumber(settings.heightPx, 0, 0, 420),
    paddingTopPx: clampHeaderNumber(settings.paddingTopPx, 0, 0, 160),
    paddingBottomPx: clampHeaderNumber(settings.paddingBottomPx, 0, 0, 160),
    paddingInlinePx: clampHeaderNumber(settings.paddingInlinePx, 0, 0, 180),
    itemGapPx: clampHeaderNumber(settings.itemGapPx, 0, 0, 100),
    logoSizePx: clampHeaderNumber(settings.logoSizePx, 0, 0, 240),
    headerFontSizePx: clampHeaderNumber(settings.headerFontSizePx, 0, 0, 48),
    titleFontSizePx: clampHeaderNumber(settings.titleFontSizePx, 0, 0, 72),
    subtitleFontSizePx: clampHeaderNumber(
      settings.subtitleFontSizePx,
      0,
      0,
      48,
    ),
    fontWeight:
      fontWeight === "400" ||
      fontWeight === "500" ||
      fontWeight === "600" ||
      fontWeight === "700" ||
      fontWeight === "800" ||
      fontWeight === "900"
        ? fontWeight
        : "inherit",
    lineHeight: clampHeaderNumber(settings.lineHeight, 0, 0, 3, 2),
    fontFamily:
      fontFamily === "Cairo" || fontFamily === "Arial"
        ? fontFamily
        : "inherit",
  };
}

export function getReportHeaderSettingsStyle(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const settings = normalizeReportHeaderSettings(value);
  const declarations = [
    settings.heightPx > 0
      ? `min-height: ${settings.heightPx}px !important;`
      : "",
    settings.paddingTopPx > 0
      ? `padding-top: ${settings.paddingTopPx}px !important;`
      : "",
    settings.paddingBottomPx > 0
      ? `padding-bottom: ${settings.paddingBottomPx}px !important;`
      : "",
    settings.paddingInlinePx > 0
      ? `padding-left: ${settings.paddingInlinePx}px !important; padding-right: ${settings.paddingInlinePx}px !important;`
      : "",
    settings.itemGapPx > 0 ? `gap: ${settings.itemGapPx}px !important;` : "",
    settings.headerFontSizePx > 0
      ? `font-size: ${settings.headerFontSizePx}px !important;`
      : "",
    settings.fontWeight !== "inherit"
      ? `font-weight: ${settings.fontWeight} !important;`
      : "",
    settings.lineHeight > 0
      ? `line-height: ${settings.lineHeight} !important;`
      : "",
    settings.fontFamily === "Cairo"
      ? `font-family: var(--font-cairo), Cairo, Arial, sans-serif !important;`
      : settings.fontFamily === "Arial"
        ? `font-family: Arial, Tahoma, sans-serif !important;`
        : "",
  ].filter(Boolean);

  const rules = [
    declarations.length
      ? `.report-design-header { ${declarations.join(" ")} }`
      : "",
    settings.heightPx > 0
      ? `.pdf-report-page > div:has(> .report-design-header.absolute) { padding-top: ${settings.heightPx + 24}px !important; }`
      : "",
    settings.itemGapPx > 0
      ? `.report-design-header > .grid, .report-design-header > .flex, .report-design-header > div > .grid, .report-design-header > div > .flex { gap: ${settings.itemGapPx}px !important; }`
      : "",
    settings.logoSizePx > 0
      ? `.report-design-header img { width: auto !important; max-width: ${settings.logoSizePx}px !important; height: ${settings.logoSizePx}px !important; max-height: ${settings.logoSizePx}px !important; object-fit: contain !important; }`
      : "",
    settings.titleFontSizePx > 0
      ? `.report-design-header h1, .report-design-header h2, .report-design-header-title { font-size: ${settings.titleFontSizePx}px !important; }`
      : "",
    settings.subtitleFontSizePx > 0
      ? `.report-design-header p { font-size: ${settings.subtitleFontSizePx}px !important; }`
      : "",
    settings.headerFontSizePx > 0
      ? `.report-design-header.grid > :first-child, .report-design-header.grid > :last-child, .report-design-header > .grid > :first-child, .report-design-header > .grid > :last-child, .report-design-header > div > .grid > :first-child, .report-design-header > div > .grid > :last-child { font-size: ${settings.headerFontSizePx}px !important; } .report-design-header.grid > :first-child p, .report-design-header.grid > :last-child p, .report-design-header > .grid > :first-child p, .report-design-header > .grid > :last-child p, .report-design-header > div > .grid > :first-child p, .report-design-header > div > .grid > :last-child p { font-size: inherit !important; }`
      : "",
    settings.fontWeight !== "inherit"
      ? `.report-design-header, .report-design-header * { font-weight: ${settings.fontWeight} !important; }`
      : "",
    settings.lineHeight > 0
      ? `.report-design-header, .report-design-header * { line-height: ${settings.lineHeight} !important; }`
      : "",
  ].filter(Boolean);

  return rules.join("\n");
}
