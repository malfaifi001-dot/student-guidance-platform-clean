import type {
  SmartReportField,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeText(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STUDENT_BASIC_FIELD_KEYS = new Set([
  "student name",
  "studentname",
  "student full name",
  "studentfullname",
  "student national id",
  "studentnationalid",
  "national id",
  "nationalid",
  "student stage",
  "studentstage",
  "student grade",
  "studentgrade",
  "student classroom",
  "studentclassroom",
  "guardian name",
  "guardianname",
  "guardian phone",
  "guardianphone",
  "parent name",
  "parent phone",
]);

const STUDENT_BASIC_FIELD_LABELS = new Set([
  "اسم الطالب",
  "اسم الطالبه",
  "اسم الطالب الطالبه",
  "رقم الهويه",
  "هويه الطالب",
  "المرحله",
  "الصف",
  "الفصل",
  "ولي الامر",
  "اسم ولي الامر",
  "جوال ولي الامر",
  "رقم جوال ولي الامر",
]);

const STUDENT_FOLLOW_UP_CATEGORY_TITLES: Record<string, string> = {
  academic: "الحالة الدراسية",
  behavioral: "الحالة السلوكية",
  attendance: "حالة المواظبة",
  psychosocial: "الحالة النفسية / الاجتماعية",
  health: "الحالة الصحية",
  financial_need: "حالة الاحتياج المادي",
  other: "الحالة الأخرى",
};

const STUDENT_FOLLOW_UP_SECTION_LABELS: Record<string, string> = {
  name: "اسم الحالة",
  details: "تفاصيل الحالة",
  handling: "آلية التعامل مع الحالة",
  result: "نتيجة المتابعة",
};

type StudentFollowUpFieldIdentity = {
  category: string;
  section: string;
};

function isStudentBasicField(field: SmartReportField) {
  const key = normalizeText(field.key);
  const label = normalizeText(field.label);

  return (
    STUDENT_BASIC_FIELD_KEYS.has(key) ||
    STUDENT_BASIC_FIELD_LABELS.has(label)
  );
}

function getStudentFollowUpFieldIdentity(
  field: SmartReportField,
): StudentFollowUpFieldIdentity | null {
  const key = cleanText(field.key).toLowerCase();
  const standardMatch = key.match(
    /^case_(details|handling|result)_(academic|behavioral|attendance|psychosocial|health|financial_need)$/,
  );

  if (standardMatch) {
    return {
      section: standardMatch[1],
      category: standardMatch[2],
    };
  }

  const otherSections: Record<string, string> = {
    other_case_name: "name",
    other_case_details: "details",
    other_case_handling: "handling",
    other_case_result: "result",
  };

  if (otherSections[key]) {
    return {
      category: "other",
      section: otherSections[key],
    };
  }

  return null;
}

function isStudentFollowUpPayload(payload: SmartReportPayload) {
  const slug = cleanText(payload.service?.slug).toLowerCase();

  if (
    slug === "student-follow-up" ||
    slug.includes("student-follow-up") ||
    slug.includes("students-follow-up")
  ) {
    return true;
  }

  return [...(payload.primaryFields || []), ...(payload.detailFields || [])].some(
    (field) => Boolean(getStudentFollowUpFieldIdentity(field)),
  );
}

/**
 * The workflow keeps each category in three separate fields. In the report,
 * the category title is shown only on the first visible field in that group.
 * The following cards use short labels so the report does not repeat phrases
 * such as "الحالة الدراسية" three times.
 */
function normalizeStudentFollowUpFields(
  fields: SmartReportField[],
): SmartReportField[] {
  const startedCategories = new Set<string>();

  return fields.map((field) => {
    const identity = getStudentFollowUpFieldIdentity(field);

    if (!identity) return field;

    const categoryTitle =
      STUDENT_FOLLOW_UP_CATEGORY_TITLES[identity.category] || "الحالة";
    const sectionLabel =
      STUDENT_FOLLOW_UP_SECTION_LABELS[identity.section] || field.label;
    const firstInCategory = !startedCategories.has(identity.category);

    startedCategories.add(identity.category);

    return {
      ...field,
      label: firstInCategory
        ? `${categoryTitle}: ${sectionLabel}`
        : sectionLabel,
      group: categoryTitle,
    };
  });
}

function buildStudentFields(payload: SmartReportPayload): SmartReportField[] {
  const student = payload.student;

  if (!student) return [];

  const values: Array<[string, string, unknown]> = [
    ["student_name", "اسم الطالب/الطالبة", student.name],
    ["student_national_id", "رقم الهوية", student.nationalId],
    ["student_stage", "المرحلة", student.stage],
    ["student_grade", "الصف", student.grade],
    ["student_classroom", "الفصل", student.classroom],
    ["guardian_name", "ولي الأمر", student.guardianName],
    ["guardian_phone", "جوال ولي الأمر", student.guardianPhone],
  ];

  return values
    .filter(([, , value]) => Boolean(cleanText(value)))
    .map(([key, label, value]) => ({
      key,
      label,
      value: cleanText(value),
      importance: "PRIMARY" as const,
      group: "بيانات الطالب الأساسية",
    }));
}

/**
 * Makes the student linked to the case the authoritative source for the
 * student's identity, stage, grade, classroom and guardian details.
 *
 * It also formats Student Follow-up fields as category groups: the category
 * appears once, followed by short labels for details, handling and result.
 *
 * Old workflow fields carrying the same student meanings are removed so the
 * report cannot show stale manual values that conflict with the selected
 * student.
 */
export function withStudentPrimaryFields(
  payload: SmartReportPayload,
): SmartReportPayload {
  const studentFields = buildStudentFields(payload);
  const shouldFormatStudentFollowUp = isStudentFollowUpPayload(payload);
  const primaryFields = (payload.primaryFields || []).filter(
    (field) => !isStudentBasicField(field),
  );
  const detailFields = (payload.detailFields || []).filter(
    (field) => !isStudentBasicField(field),
  );

  return {
    ...payload,
    primaryFields: shouldFormatStudentFollowUp
      ? normalizeStudentFollowUpFields([...studentFields, ...primaryFields])
      : [...studentFields, ...primaryFields],
    detailFields: shouldFormatStudentFollowUp
      ? normalizeStudentFollowUpFields(detailFields)
      : detailFields,
  };
}
