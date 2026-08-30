import type { AccountabilityValues } from "@/lib/accountability/accountability-types";

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(renderValue).filter(Boolean).join("، ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function interpolateAccountabilityText(
  template: string,
  values: AccountabilityValues,
) {
  return String(template ?? "").replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, rawKey: string) => {
    const key = rawKey.trim();
    if (!key || !Object.prototype.hasOwnProperty.call(values, key)) return match;
    const rendered = renderValue(values[key]);
    return rendered || match;
  });
}

export function buildAccountabilityTextSnapshot(
  template: string,
  values: AccountabilityValues,
) {
  return interpolateAccountabilityText(template, values).trim();
}
