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

function isStudentBasicField(field: SmartReportField) {
  const key = normalizeText(field.key);
  const label = normalizeText(field.label);

  return (
    STUDENT_BASIC_FIELD_KEYS.has(key) ||
    STUDENT_BASIC_FIELD_LABELS.has(label)
  );
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
 * Old workflow fields carrying the same meanings are removed so the report
 * cannot show stale manual values that conflict with the selected student.
 */
export function withStudentPrimaryFields(
  payload: SmartReportPayload,
): SmartReportPayload {
  const studentFields = buildStudentFields(payload);

  if (!studentFields.length) {
    return payload;
  }

  const primaryFields = (payload.primaryFields || []).filter(
    (field) => !isStudentBasicField(field),
  );
  const detailFields = (payload.detailFields || []).filter(
    (field) => !isStudentBasicField(field),
  );

  return {
    ...payload,
    primaryFields: [...studentFields, ...primaryFields],
    detailFields,
  };
}
