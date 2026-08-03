export const OPTIONAL_STUDENT_PICKER_LABEL =
  "اختيار الطالب/الطالبة — اختياري";

const HIDDEN_STEP_DESCRIPTIONS = new Set([
  "نموذج مخصص؛ تتغير الحقول والخيارات حسب نوع التفاعل والنشاط المختار.",
]);

export function getVisibleWorkflowStepDescription(
  description?: string | null,
): string | null {
  const normalizedDescription = String(description ?? "").trim();

  if (!normalizedDescription || HIDDEN_STEP_DESCRIPTIONS.has(normalizedDescription)) {
    return null;
  }

  return normalizedDescription;
}
