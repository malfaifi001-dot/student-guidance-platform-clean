export const SURVEY_SERVICE_SLUG = "surveys";

export type SurveyBoardRole = "ADMIN" | "COUNSELOR" | "ACTIVITY_LEADER" | "TEACHER";

export type SurveyQuestionInputType =
  | "TEXT"
  | "TEXTAREA"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "YES_NO"
  | "RATING"
  | "SCALE"
  | "NUMBER"
  | "DATE";

const SURVEY_SECTION_PREFIX = "[[survey-section]]";
export const SURVEY_QUESTION_LABEL_MAX_LENGTH = 191;

export function serializeSurveyQuestionHelpText(
  sectionTitle?: string | null,
  helpText?: string | null,
  fullLabel?: string | null,
) {
  const normalizedSectionTitle = sectionTitle?.trim();
  const normalizedHelpText = helpText?.trim();
  const normalizedFullLabel = fullLabel?.trim();

  if (!normalizedSectionTitle && !normalizedFullLabel) {
    return normalizedHelpText || null;
  }

  return `${SURVEY_SECTION_PREFIX}${JSON.stringify({
    title: normalizedSectionTitle,
    helpText: normalizedHelpText || null,
    fullLabel: normalizedFullLabel || null,
  })}`;
}

export function parseSurveyQuestionHelpText(value?: string | null) {
  if (!value?.startsWith(SURVEY_SECTION_PREFIX)) {
    return {
      sectionTitle: null,
      helpText: value || null,
      fullLabel: null,
    };
  }

  try {
    const metadata = JSON.parse(value.slice(SURVEY_SECTION_PREFIX.length)) as {
      title?: unknown;
      helpText?: unknown;
      fullLabel?: unknown;
    };

    return {
      sectionTitle: typeof metadata.title === "string" ? metadata.title : null,
      helpText: typeof metadata.helpText === "string" ? metadata.helpText : null,
      fullLabel: typeof metadata.fullLabel === "string" ? metadata.fullLabel : null,
    };
  } catch {
    return {
      sectionTitle: null,
      helpText: value,
      fullLabel: null,
    };
  }
}

export function prepareSurveyQuestionForPersistence({
  label,
  sectionTitle,
  helpText,
}: {
  label: string;
  sectionTitle?: string | null;
  helpText?: string | null;
}) {
  const fullLabel =
    label.length > SURVEY_QUESTION_LABEL_MAX_LENGTH ? label : null;

  return {
    label: fullLabel
      ? label.slice(0, SURVEY_QUESTION_LABEL_MAX_LENGTH)
      : label,
    helpText: serializeSurveyQuestionHelpText(
      sectionTitle,
      helpText,
      fullLabel,
    ),
  };
}

export const surveyQuestionTypeLabels: Record<SurveyQuestionInputType, string> = {
  TEXT: "إجابة قصيرة",
  TEXTAREA: "إجابة طويلة",
  SINGLE_CHOICE: "اختيار واحد",
  MULTIPLE_CHOICE: "اختيارات متعددة",
  YES_NO: "نعم / لا",
  RATING: "تقييم",
  SCALE: "مقياس رقمي",
  NUMBER: "رقم",
  DATE: "تاريخ",
};

export const surveyAudienceLabels: Record<string, string> = {
  GENERAL: "عام",
  STUDENTS: "طلاب",
  GUARDIANS: "أولياء أمور",
  TEACHERS: "معلمون",
  STAFF: "الكادر التعليمي",
  ADMINISTRATIVE: "إداريون",
};

export const surveyBoardLabels: Record<SurveyBoardRole, string> = {
  ADMIN: "مركز استبيانات الإدارة",
  COUNSELOR: "مركز استبيانات التوجيه الطلابي",
  ACTIVITY_LEADER: "مركز استبيانات ريادة النشاط",
  TEACHER: "مركز استبيانات المعلم",
};
