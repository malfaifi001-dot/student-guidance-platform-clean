export type AssessmentGender = "MALE" | "FEMALE" | "UNKNOWN";

export function normalizeAssessmentGender(value: unknown): AssessmentGender {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized === "FEMALE" || normalized === "MALE" ? normalized : "UNKNOWN";
}

export function getAssessmentGenderCopy(value: unknown) {
  const female = normalizeAssessmentGender(value) === "FEMALE";
  return {
    female,
    teacher: female ? "المعلمة" : "المعلم",
    teacherName: female ? "اسم المعلمة" : "اسم المعلم",
    student: female ? "الطالبة" : "الطالب",
    students: female ? "الطالبات" : "الطلاب",
    chooseStudent: female ? "اختاري اسم الطالبة" : "اختر اسم الطالب",
    addStudent: female ? "إضافة طالبة" : "إضافة طالب",
    showStudentNames: female ? "إظهار أسماء الطالبات في التقرير" : "إظهار أسماء الطلاب في التقرير",
    completed: female ? "أكملن الاختبار" : "أكمل الاختبار",
    pleaseChoose: female ? "يرجى اختيار اسم الطالبة ثم إكمال الأسئلة حتى النهاية." : "يرجى اختيار اسم الطالب ثم إكمال الأسئلة حتى النهاية.",
    start: female ? "ابدئي الاختبار" : "ابدأ الاختبار",
    change: female ? "تغيير الطالبة" : "تغيير الطالب",
    completionThanks: female ? "شكرًا لمشاركتكِ." : "شكرًا لمشاركتك.",
  } as const;
}
