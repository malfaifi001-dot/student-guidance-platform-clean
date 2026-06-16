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
