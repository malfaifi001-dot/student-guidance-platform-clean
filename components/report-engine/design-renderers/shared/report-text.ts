import { resolveContextVariable } from "./final-report";

export function renderText(text: string, context: Record<string, string>) {
  const source = String(text || "");

  const replaceVariable = (_match: string, key: string) => {
    const cleanKey = String(key || "").trim();

    if (!cleanKey) return "";
    return resolveContextVariable(cleanKey, context);
  };

  return source
    .replace(/\{\{\s*([^}]+?)\s*\}\}/g, replaceVariable)
    .replace(/\{([A-Za-z0-9_.\-\u0600-\u06FF ]+)\}/g, replaceVariable);
}

export function splitLines(text: string) {
  return String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

export function splitParagraphs(text: string) {
  return String(text || "").split(/\n\s*\n/).map((line) => line.trim()).filter(Boolean);
}

export function getReportFontSizeClass(value: unknown, fallback = "text-base") {
  switch (value) {
    case "xs": return "text-xs";
    case "sm": return "text-sm";
    case "base": return "text-base";
    case "lg": return "text-lg";
    case "xl": return "text-xl";
    case "2xl": return "text-2xl";
    default: return fallback;
  }
}

export function getReportFontSizeMultiplier(value: unknown) {
  switch (value) {
    case "xs":
      return 0.75;
    case "sm":
      return 0.875;
    case "base":
      return 1;
    case "lg":
      return 1.125;
    case "xl":
      return 1.25;
    case "2xl":
      return 1.5;
    default:
      return 1;
  }
}

export function getBlockSetting(block: any, key: string) {
  return block?.[key] ?? block?.settings?.[key];
}
