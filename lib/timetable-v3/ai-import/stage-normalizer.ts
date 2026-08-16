import type {
  TimetableAiImportStage,
} from "./ai-import-types";

const STAGE_ALIASES:
  Record<string, TimetableAiImportStage> = {
    elementary: "ELEMENTARY",
    primary: "ELEMENTARY",
    "primary school": "ELEMENTARY",

    middle: "MIDDLE",
    intermediate: "MIDDLE",
    "middle school": "MIDDLE",
    "intermediate school": "MIDDLE",

    high: "HIGH",
    secondary: "HIGH",
    "high school": "HIGH",
    "secondary school": "HIGH",

    ابتدائي: "ELEMENTARY",
    الابتدائي: "ELEMENTARY",
    ابتدائية: "ELEMENTARY",
    الابتدائية: "ELEMENTARY",
    "المرحلة الابتدائية": "ELEMENTARY",

    متوسط: "MIDDLE",
    المتوسط: "MIDDLE",
    متوسطة: "MIDDLE",
    المتوسطة: "MIDDLE",
    "المرحلة المتوسطة": "MIDDLE",

    ثانوي: "HIGH",
    الثانوي: "HIGH",
    ثانوية: "HIGH",
    الثانوية: "HIGH",
    "المرحلة الثانوية": "HIGH",
  };

function cleanStageText(
  value: string,
) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/[،,:;؛()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTimetableAiStage(
  value: unknown,
): TimetableAiImportStage | null {
  if (
    value === "ELEMENTARY" ||
    value === "MIDDLE" ||
    value === "HIGH"
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const cleaned =
    cleanStageText(value);

  return STAGE_ALIASES[cleaned] ?? null;
}

export function normalizeTimetableAiStageList(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const result:
    TimetableAiImportStage[] = [];

  for (const item of value) {
    const normalized =
      normalizeTimetableAiStage(item);

    if (
      normalized &&
      !result.includes(normalized)
    ) {
      result.push(normalized);
    }
  }

  return result;
}