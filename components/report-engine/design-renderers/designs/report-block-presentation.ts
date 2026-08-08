export type ReportBlockPresentation =
  | "hero"
  | "normal"
  | "card"
  | "soft"
  | "featured"
  | "outline"
  | "list";

export function normalizeReportBlockPresentation(
  value: unknown,
): ReportBlockPresentation {
  const normalized = String(value || "").trim();

  switch (normalized) {
    case "hero":
    case "large-title":
      return "hero";

    case "card":
      return "card";

    case "soft":
    case "calm":
      return "soft";

    case "featured":
    case "highlight":
      return "featured";

    case "outline":
      return "outline";

    case "list":
      return "list";

    default:
      return "normal";
  }
}