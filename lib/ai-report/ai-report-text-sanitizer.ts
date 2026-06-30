import type { CustomReportSchema } from "@/lib/custom-report/custom-report-types";

export type AiReportSchema = CustomReportSchema;

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
const MOJIBAKE_MARKER_REGEX = /[\u00D8\u00D9\u00C3\u00C2]/;
const TECHNICAL_VALUE_REGEX = /^(other|[a-z0-9_:-]+)$/i;

function looksArabic(value: string) {
  return ARABIC_CHAR_REGEX.test(value);
}

function countMojibakeMarkers(value: string) {
  return (value.match(MOJIBAKE_MARKER_REGEX) || []).length;
}

function latin1ToUtf8(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "latin1").toString("utf8");
  }

  const bytes = Uint8Array.from(Array.from(value).map((char) => char.charCodeAt(0)));
  return new TextDecoder("utf-8").decode(bytes);
}

function shouldRepair(original: string, repaired: string) {
  if (!repaired || repaired === original) {
    return false;
  }

  if (!looksArabic(repaired)) {
    return false;
  }

  return countMojibakeMarkers(repaired) < countMojibakeMarkers(original);
}

export function sanitizeAiReportText(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    return "";
  }

  if (!MOJIBAKE_MARKER_REGEX.test(text)) {
    return text;
  }

  try {
    const repaired = latin1ToUtf8(text).trim();
    return shouldRepair(text, repaired) ? repaired : text;
  } catch {
    return text;
  }
}

function sanitizeOptionValue(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text || TECHNICAL_VALUE_REGEX.test(text)) {
    return text;
  }

  return sanitizeAiReportText(text);
}

export function sanitizeAiReportSchema(schema: AiReportSchema): AiReportSchema {
  return {
    ...schema,
    title: sanitizeAiReportText(schema.title),
    description: sanitizeAiReportText(schema.description),
    sections: schema.sections.map((section) => ({
      ...section,
      title: sanitizeAiReportText(section.title),
      description: sanitizeAiReportText(section.description),
      fields: section.fields.map((field) => ({
        ...field,
        label: sanitizeAiReportText(field.label),
        placeholder: sanitizeAiReportText(field.placeholder),
        helpText: sanitizeAiReportText(field.helpText),
        reportLabel: sanitizeAiReportText(field.reportLabel),
        options: (field.options ?? []).map((option) => ({
          ...option,
          label: sanitizeAiReportText(option.label),
          value: sanitizeOptionValue(option.value),
        })),
      })),
    })),
  };
}
