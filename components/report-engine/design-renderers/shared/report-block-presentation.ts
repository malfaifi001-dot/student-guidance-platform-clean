import type { ReportDesignImplementation } from "../designs/report-design-component-types";
import { normalizeReportBlockPresentation } from "../designs/report-block-presentation";

export function getBlockShellClass(
  implementation: ReportDesignImplementation,
  variant: string,
  textAlign: string,
) {
  const base = `break-inside-avoid ${textAlign}`;

  if (implementation.getBlockPresentation) {
    const presentation = implementation.getBlockPresentation(
      normalizeReportBlockPresentation(variant),
    );
    return [base, presentation.shellClassName].filter(Boolean).join(" ");
  }

  const accent = implementation.palette;
  if (variant === "hero") return `${base} ${accent.heroShellClass}`;
  if (variant === "plain") return `${base} px-1 py-2`;
  if (variant === "soft") return `${base} ${accent.softShellClass}`;
  if (variant === "highlight") return `${base} ${accent.highlightShellClass}`;
  if (variant === "outline") return `${base} ${accent.outlineShellClass}`;
  if (variant === "quote") return `${base} ${accent.quoteShellClass}`;
  return `${base} ${accent.cardShellClass}`;
}

export function getPlacementClass(placement: string) {
  const fullCenteredBase = "absolute left-0 right-0 w-full";
  const centeredBase = "absolute left-1/2 w-full max-w-[78%] -translate-x-1/2";
  const sideBase = "absolute w-full max-w-[58%]";
  const classes: Record<string, string> = {
    flow: "", top: `${fullCenteredBase} top-0`, middle: `${fullCenteredBase} top-1/2 -translate-y-1/2`, bottom: `${fullCenteredBase} bottom-0`,
    "top-right": `${sideBase} right-0 top-0`, "top-center": `${centeredBase} top-0`, "top-left": `${sideBase} left-0 top-0`,
    "middle-right": `${sideBase} right-0 top-1/2 -translate-y-1/2`, "middle-center": `${centeredBase} top-1/2 -translate-y-1/2`, "middle-left": `${sideBase} left-0 top-1/2 -translate-y-1/2`,
    "bottom-right": `${sideBase} bottom-0 right-0`, "bottom-center": `${centeredBase} bottom-0`, "bottom-left": `${sideBase} bottom-0 left-0`,
  };
  return classes[placement] || "";
}
