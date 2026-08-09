export function getDesignLogoSrc(context: Record<string, string>) {
  const value = String(context?.["report.logoUrl"] || "").trim();

  return value || "/uploads/school-logos/MOE.png";
}

export function getDesignLogoNumber(
  context: Record<string, string>,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = Number(context?.[key] || fallback);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function getDesignLogoFit(context: Record<string, string>) {
  const value = String(context?.["report.logoFit"] || "").trim();

  return value === "cover" ? "cover" : "contain";
}

export function getDesignLogoFilter(context: Record<string, string>) {
  const value = String(context?.["report.logoFilter"] || "invert").trim();

  return value === "none" ? "none" : "brightness(0) invert(1)";
}

export function getReportDesignLogoStyleText(
  context: Record<string, string>,
  defaultWidthPx: number,
  defaultHeightPx: number,
) {
  const widthPx = getDesignLogoNumber(
    context,
    "report.logoWidthPx",
    defaultWidthPx,
    24,
    240,
  );
  const heightPx = getDesignLogoNumber(
    context,
    "report.logoHeightPx",
    defaultHeightPx,
    20,
    160,
  );
  const fit = getDesignLogoFit(context);
  const filter = getDesignLogoFilter(context);

  return `
    .report-design-logo-control-style img[alt="شعار وزارة التعليم"],
    .pdf-report-page img[alt="شعار وزارة التعليم"] {
      width: ${widthPx}px !important;
      max-width: ${widthPx}px !important;
      height: ${heightPx}px !important;
      max-height: ${heightPx}px !important;
      object-fit: ${fit} !important;
      filter: ${filter} !important;
    }
  `;
}
export function getDesignHeaderAlign(
  context: Record<string, string>,
  key: string,
  fallback: "right" | "center" | "left" = "center",
) {
  const value = String(context?.[`report.headerAlign.${key}`] || "").trim();

  if (value === "right" || value === "center" || value === "left") {
    return value;
  }

  return fallback;
}
export function getDesignHeaderText(
  context: Record<string, string>,
  key: string,
  fallback: string,
) {
  const value = context?.[key];

  if (value !== undefined && value !== null && String(value).trim() !== "") {
    return String(value);
  }

  return fallback;
}
