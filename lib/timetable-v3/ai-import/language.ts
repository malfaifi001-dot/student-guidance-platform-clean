export type TimetableAiImportLanguage = "ARABIC" | "OTHER";

export function detectTimetableAiImportLanguage(
  value: string,
): TimetableAiImportLanguage {
  const arabicCharacters =
    value.match(/[\u0600-\u06ff]/g)?.length ?? 0;

  return arabicCharacters >= 3 ? "ARABIC" : "OTHER";
}

export function buildTimetableAiImportLanguageInstruction(
  language: TimetableAiImportLanguage,
) {
  if (language !== "ARABIC") return "";

  return `
LANGUAGE OUTPUT RULE (Arabic request):
- Return all user-facing generated text in Arabic by default: class names, subject names, teacher names, specialties, summary, assumptions, alternatives, warnings, constraint text, and uncertain-field reasons.
- Preserve any explicit names supplied by the manager exactly; do not translate them.
- Keep technical enum values unchanged: ELEMENTARY, MIDDLE, HIGH, USER, AI_PROPOSAL, EXTRACT, PROPOSE.
- Use natural Arabic school terminology when proposing missing names.
`.trim();
}
