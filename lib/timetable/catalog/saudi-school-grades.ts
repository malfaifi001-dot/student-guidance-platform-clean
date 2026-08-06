export const SAUDI_SCHOOL_CATALOG_VERSION = "sa-2026" as const;

export const SAUDI_SCHOOL_STAGES = [
  { key: "primary", label: "المرحلة الابتدائية" },
  { key: "intermediate", label: "المرحلة المتوسطة" },
  { key: "secondary", label: "المرحلة الثانوية" },
] as const;

export type SaudiSchoolStageKey =
  (typeof SAUDI_SCHOOL_STAGES)[number]["key"];

export type SaudiSchoolGrade = {
  key: string;
  stageKey: SaudiSchoolStageKey;
  label: string;
};

export const SAUDI_SCHOOL_GRADES: readonly SaudiSchoolGrade[] = [
  { key: "primary-1", stageKey: "primary", label: "الصف الأول الابتدائي" },
  { key: "primary-2", stageKey: "primary", label: "الصف الثاني الابتدائي" },
  { key: "primary-3", stageKey: "primary", label: "الصف الثالث الابتدائي" },
  { key: "primary-4", stageKey: "primary", label: "الصف الرابع الابتدائي" },
  { key: "primary-5", stageKey: "primary", label: "الصف الخامس الابتدائي" },
  { key: "primary-6", stageKey: "primary", label: "الصف السادس الابتدائي" },
  { key: "intermediate-1", stageKey: "intermediate", label: "الصف الأول المتوسط" },
  { key: "intermediate-2", stageKey: "intermediate", label: "الصف الثاني المتوسط" },
  { key: "intermediate-3", stageKey: "intermediate", label: "الصف الثالث المتوسط" },
  { key: "secondary-1", stageKey: "secondary", label: "الصف الأول الثانوي" },
  { key: "secondary-2", stageKey: "secondary", label: "الصف الثاني الثانوي" },
  { key: "secondary-3", stageKey: "secondary", label: "الصف الثالث الثانوي" },
] as const;

export const SAUDI_SCHOOL_SECTIONS = ["أ", "ب"] as const;

export function getSaudiSchoolGrade(gradeKey: string) {
  return SAUDI_SCHOOL_GRADES.find((grade) => grade.key === gradeKey);
}
