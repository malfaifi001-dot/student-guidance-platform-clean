import { SAUDI_SCHOOL_CATALOG_VERSION } from "./saudi-school-grades";

export type SaudiSchoolSubject = {
  catalogKey: string;
  name: string;
  gradeKeys: readonly string[];
};

const primaryLower = ["primary-1", "primary-2", "primary-3"] as const;
const primaryUpper = ["primary-4", "primary-5", "primary-6"] as const;
const intermediate = ["intermediate-1", "intermediate-2", "intermediate-3"] as const;

// Versioned against the Ministry of Education study-plan and secondary-pathway
// publications available for academic year 1447/1448 (2025/2026).
// The secondary catalog is the union of common and pathway subjects because a
// school may operate more than one approved pathway.
export const SAUDI_SCHOOL_SUBJECT_CATALOG = [
  subject("quran-islamic", "القرآن الكريم والدراسات الإسلامية", [...primaryLower, ...primaryUpper]),
  subject("arabic-language", "اللغة العربية", [...primaryLower, ...primaryUpper, ...intermediate]),
  subject("mathematics", "الرياضيات", [...primaryLower, ...primaryUpper, ...intermediate, "secondary-1", "secondary-2", "secondary-3"]),
  subject("science", "العلوم", [...primaryLower, ...primaryUpper, ...intermediate]),
  subject("english", "اللغة الإنجليزية", [...primaryLower, ...primaryUpper, ...intermediate, "secondary-1", "secondary-2", "secondary-3"]),
  subject("social-studies", "الدراسات الاجتماعية", [...primaryUpper, ...intermediate, "secondary-1"]),
  subject("digital-skills", "المهارات الرقمية", [...primaryUpper, ...intermediate]),
  subject("art-education", "التربية الفنية", [...primaryLower, ...primaryUpper, ...intermediate]),
  subject("physical-education", "التربية البدنية والدفاع عن النفس", [...primaryLower, ...primaryUpper, ...intermediate]),
  subject("life-family-skills", "المهارات الحياتية والأسرية", [...primaryLower, ...primaryUpper, ...intermediate, "secondary-1"]),
  subject("tajweed", "التجويد", [...primaryUpper, ...intermediate]),
  subject("critical-thinking", "التفكير الناقد", ["intermediate-3", "secondary-1"]),
  subject("quran-interpretation", "القرآن الكريم وتفسيره", ["secondary-1", "secondary-2", "secondary-3"]),
  subject("arabic-competencies", "الكفايات اللغوية", ["secondary-1", "secondary-2", "secondary-3"]),
  subject("biology", "الأحياء", ["secondary-1", "secondary-2", "secondary-3"]),
  subject("chemistry", "الكيمياء", ["secondary-1", "secondary-2", "secondary-3"]),
  subject("physics", "الفيزياء", ["secondary-1", "secondary-2", "secondary-3"]),
  subject("digital-technology", "التقنية الرقمية", ["secondary-1", "secondary-2", "secondary-3"]),
  subject("health-physical-education", "التربية الصحية والبدنية", ["secondary-1", "secondary-2", "secondary-3"]),
  subject("environmental-science", "علم البيئة", ["secondary-2", "secondary-3"]),
  subject("engineering-design", "التصميم الهندسي", ["secondary-2", "secondary-3"]),
  subject("cybersecurity", "الأمن السيبراني", ["secondary-2", "secondary-3"]),
  subject("computer-science", "علوم الحاسب", ["secondary-2", "secondary-3"]),
  subject("human-body-systems", "أنظمة جسم الإنسان", ["secondary-2", "secondary-3"]),
  subject("health-sciences", "الرعاية الصحية", ["secondary-2", "secondary-3"]),
  subject("business-administration", "إدارة الأعمال", ["secondary-2", "secondary-3"]),
  subject("financial-knowledge", "المعرفة المالية", ["secondary-2", "secondary-3"]),
  subject("law", "القانون", ["secondary-2", "secondary-3"]),
  subject("research-project", "البحث ومصادر المعلومات", ["secondary-2", "secondary-3"]),
  subject("vocational-education", "التربية المهنية", ["secondary-1"]),
  subject("hadith", "الحديث", ["secondary-1", "secondary-2"]),
  subject("monotheism", "التوحيد", ["secondary-2"]),
  subject("jurisprudence", "الفقه", ["secondary-3"]),
  subject("history", "التاريخ", ["secondary-2"]),
  subject("geography", "الجغرافيا", ["secondary-3"]),
  subject("arts", "الفنون", ["secondary-2"]),
  subject("earth-space-sciences", "علوم الأرض والفضاء", ["secondary-3"]),
  subject("artificial-intelligence", "الذكاء الاصطناعي", ["secondary-3"]),
  subject("software-engineering", "هندسة البرمجيات", ["secondary-3"]),
  subject("statistics", "الإحصاء", ["secondary-3"]),
  subject("graduation-project", "مشروع التخرج", ["secondary-3"]),
  subject("literary-studies", "الدراسات الأدبية", ["secondary-3"]),
  subject("psych-social-studies", "الدراسات النفسية والاجتماعية", ["secondary-3"]),
  subject("management-principles", "مبادئ الإدارة", ["secondary-3"]),
] as const satisfies readonly SaudiSchoolSubject[];

export const SAUDI_SCHOOL_SUBJECT_CATALOG_VERSION =
  SAUDI_SCHOOL_CATALOG_VERSION;

export function getSubjectsForGrade(gradeKey: string) {
  return SAUDI_SCHOOL_SUBJECT_CATALOG.filter((subjectItem) =>
    subjectItem.gradeKeys.includes(gradeKey),
  );
}

function subject(
  key: string,
  name: string,
  gradeKeys: readonly string[],
): SaudiSchoolSubject {
  return {
    catalogKey: `${SAUDI_SCHOOL_CATALOG_VERSION}:${key}`,
    name,
    gradeKeys,
  };
}
