const CONSTRAINT_TYPE_ALIASES: Record<string, string> = {
  TEACHER_UNAVAILABLE_SLOT:
    "TEACHER_UNAVAILABLE",

  TEACHER_DAILY_LIMIT:
    "TEACHER_MAX_DAILY",

  TEACHER_MAX_DAILY_PERIODS:
    "TEACHER_MAX_DAILY",

  TEACHER_MIN_DAILY_PERIODS:
    "TEACHER_MIN_DAILY",

  TEACHER_CONSECUTIVE_LIMIT:
    "TEACHER_MAX_CONSECUTIVE",

  TEACHER_MAX_CONSECUTIVE_PERIODS:
    "TEACHER_MAX_CONSECUTIVE",

  SUBJECT_FORBIDDEN_SLOT:
    "SUBJECT_BLOCKED",

  SUBJECT_DAILY_LIMIT:
    "SUBJECT_MAX_DAILY",

  SUBJECT_MAX_DAILY_OCCURRENCES:
    "SUBJECT_MAX_DAILY",

  CLASS_DAILY_LIMIT:
    "CLASS_MAX_DAILY",

  CLASS_MAX_PERIODS_ON_DAY:
    "CLASS_MAX_DAILY",

  CLASS_CONSECUTIVE_LIMIT:
    "CLASS_MAX_CONSECUTIVE",

  SCHOOL_BLOCKED_DAY:
    "SCHOOL_BLOCKED_SLOT",

  PREFERRED_FIRST_PERIODS:
    "SUBJECT_EARLY_PERIODS",

  EVEN_DISTRIBUTION:
    "FAIR_SUBJECT_SPREAD",
};

export function normalizeGenerationConstraintType(
  value: string,
) {
  const normalized =
    value
      .trim()
      .toUpperCase();

  return (
    CONSTRAINT_TYPE_ALIASES[
      normalized
    ] ??
    normalized
  );
}

/**
 * قاعدة مهمة:
 *
 * أي نوع موجود هنا يعني أن المحرك:
 * 1) يفهمه.
 * 2) يطبقه.
 * 3) يراجعه بالـ validator المستقل.
 *
 * لا نضيف أي نوع لمجرد إسكات preflight.
 */
export const SUPPORTED_HARD_GENERATION_CONSTRAINTS =
  new Set<string>([
    "TEACHER_UNAVAILABLE",
    "TEACHER_DAY_OFF",
    "TEACHER_MAX_DAILY",
    "TEACHER_MIN_DAILY",
    "TEACHER_MAX_CONSECUTIVE",

    "SUBJECT_BLOCKED",
    "SUBJECT_SPECIFIC_TEACHER",
    "SUBJECT_MAX_DAILY",

    "CLASS_BLOCKED_SLOT",
    "CLASS_MAX_DAILY",
    "CLASS_MAX_CONSECUTIVE",
    "CLASS_NO_DOUBLE",

    "SCHOOL_BLOCKED_SLOT",

    "FIXED_ASSIGNMENT",
    "FIXED_SUBJECT_DAY",
    "FIXED_TEACHER_SLOT",

    "NO_ISOLATED_PERIOD",
  ]);

export const SUPPORTED_SOFT_GENERATION_CONSTRAINTS =
  new Set<string>([
    "TEACHER_PREFERRED",
    "TEACHER_MAX_DAILY",
    "TEACHER_MIN_DAILY",
    "TEACHER_MAX_CONSECUTIVE",

    "SUBJECT_PREFERRED",
    "SUBJECT_MAX_DAILY",
    "SUBJECT_EARLY_PERIODS",
    "FAIR_SUBJECT_SPREAD",

    "CLASS_PREFERRED_SLOT",
    "CLASS_MAX_DAILY",
    "CLASS_MAX_CONSECUTIVE",

    "NO_ISOLATED_PERIOD",
  ]);

export function isSupportedGenerationConstraint(
  type: string,
  strength: string,
) {
  const canonical =
    normalizeGenerationConstraintType(
      type,
    );

  if (
    strength === "HARD"
  ) {
    return (
      SUPPORTED_HARD_GENERATION_CONSTRAINTS.has(
        canonical,
      )
    );
  }

  if (
    strength === "SOFT"
  ) {
    return (
      SUPPORTED_SOFT_GENERATION_CONSTRAINTS.has(
        canonical,
      )
    );
  }

  return false;
}