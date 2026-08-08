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
