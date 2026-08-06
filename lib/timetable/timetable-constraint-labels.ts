import type {
  TimetableConstraintLevel,
  TimetableConstraintType,
} from "@/lib/timetable/timetable-constraint-types";

const constraintTypeLabels: Record<TimetableConstraintType, string> = {
  TEACHER_UNAVAILABLE_SLOT: "المعلم غير متاح في يوم وحصة محددين",
  TEACHER_DAY_OFF: "يوم مستثنى للمعلم",
  TEACHER_NOT_BEFORE_PERIOD: "عدم إسناد المعلم قبل حصة محددة",
  TEACHER_NOT_AFTER_PERIOD: "عدم إسناد المعلم بعد حصة محددة",
  TEACHER_MAX_DAILY_PERIODS: "الحد الأعلى لحصص المعلم يوميًا",
  TEACHER_MAX_CONSECUTIVE_PERIODS: "الحد الأعلى للحصص المتتالية",
  TEACHER_MAX_DAILY_GAPS: "الحد الأعلى للفجوات اليومية",
  SUBJECT_FORBIDDEN_SLOT: "منع المادة في وقت محدد",
  SUBJECT_FIXED_SLOT: "تثبيت المادة في وقت محدد",
  SUBJECT_MAX_DAILY_OCCURRENCES: "الحد الأعلى لتكرار المادة يوميًا",
  SCHOOL_BLOCKED_SLOT: "وقت محظور على مستوى المدرسة",
  CLASS_NO_INTERNAL_GAPS: "منع الفجوات داخل جدول الفصل",
  CLASS_MAX_HEAVY_SUBJECTS_DAILY: "الحد الأعلى للمواد الثقيلة يوميًا",
  FAIR_FIRST_PERIODS: "تكافؤ توزيع الحصة الأولى",
  FAIR_LAST_PERIODS: "تكافؤ توزيع الحصة الأخيرة",
  TEACHER_WORKING_DAYS: "أيام عمل المعلم",
  TEACHER_MIN_DAILY_PERIODS: "الحد الأدنى لحصص المعلم يوميًا",
  TEACHER_NO_SINGLE_PERIOD_DAY: "منع الحصة الوحيدة للمعلم",
  SUBJECT_MIN_DISTRIBUTION_DAYS: "الحد الأدنى لأيام توزيع المادة",
  NO_CONSECUTIVE_HEAVY_SUBJECTS: "منع مادتين ثقيلتين متتاليتين",
  SUBJECT_REQUIRED_DOUBLE_PERIODS: "عدد الحصص المزدوجة للمادة",
  CLASS_MAX_PERIODS_ON_DAY: "الحد الأعلى لحصص الفصل في يوم محدد",
  SCHOOL_MAX_PERIODS_ON_DAY: "الحد الأعلى لحصص المدرسة في يوم محدد",
  SUBJECT_ROOM_REQUIREMENT: "ربط المادة بغرفة أو معمل",
  ROOM_UNAVAILABLE_SLOT: "الغرفة غير متاحة في وقت محدد",
};

export function getConstraintTypeArabicLabel(type: TimetableConstraintType) {
  return constraintTypeLabels[type];
}

export function getConstraintLevelArabicLabel(level: TimetableConstraintLevel) {
  return level === "HARD" ? "إلزامي" : "تفضيلي";
}

export function getConstraintStatusArabicLabel(enabled: boolean) {
  return enabled ? "مفعّل" : "معطّل";
}

export function getDayArabicLabel(
  dayId: string | null | undefined,
  days: Array<{ id: string; label: string }>,
) {
  return days.find((day) => day.id === dayId)?.label ?? null;
}

export function getPeriodArabicLabel(
  periodId: string | null | undefined,
  periods: Array<{ id: string; label: string }>,
) {
  return periods.find((period) => period.id === periodId)?.label ?? null;
}

export function getAnalysisCategoryArabicLabel(category: string) {
  const labels: Record<string, string> = {
    DATA: "البيانات",
    WORKLOAD: "النصاب",
    CONSTRAINT: "القيود",
    GENERATION: "التوليد",
    CLASS_CAPACITY: "سعة الفصل",
    ASSIGNMENT: "الإسنادات",
    AVAILABILITY: "توفر المعلمين",
    DOUBLE_PERIOD: "الحصص المزدوجة",
    FIXED_SLOT: "الحصص المثبتة",
    DISTRIBUTION: "التوزيع",
    OTHER: "ملاحظة عامة",
  };
  return labels[category] ?? "ملاحظة عامة";
}

export function getFailureKindArabicLabel(kind: string) {
  const labels: Record<string, string> = {
    NONE: "لا يوجد فشل",
    VALIDATION_ERROR: "خطأ في البيانات",
    PROVEN_CONFLICT: "تعارض مؤكد",
    LIKELY_CONSTRAINT_CONFLICT: "تعارض محتمل بين القيود",
    SEARCH_TIMEOUT: "انتهاء مهلة البحث",
    CAPACITY_PROBLEM: "مشكلة سعة مؤكدة",
    ASSIGNMENT_PROBLEM: "مشكلة في الإسنادات",
    HARD_CONSTRAINT_FAILURE: "تعذر التوليد بسبب قيود إلزامية",
    UNKNOWN_FAILURE: "فشل توليد غير مصنف",
    UNKNOWN: "سبب غير محدد",
  };
  return labels[kind] ?? "سبب غير محدد";
}

export function getChangeTypeArabicLabel(changeType: string) {
  const labels: Record<string, string> = {
    NO_CHANGE: "دون تغيير",
    DATA_FIX: "تصحيح بيانات",
    CONSTRAINT_TO_PREFERRED: "تحويل القيد إلى تفضيلي",
    CONSTRAINT_DISABLE: "تعطيل قيد",
    CONSTRAINT_VALUE_CHANGE: "تعديل قيمة قيد",
    ASSIGNMENT_CHANGE: "تعديل إسناد",
    AVAILABILITY_CHANGE: "تعديل عدم التوفر",
    DOUBLE_PERIOD_CHANGE: "تعديل الحصص المزدوجة",
    RETRY_GENERATION: "إعادة محاولة التوليد",
    OTHER: "إجراء آخر",
  };
  return labels[changeType] ?? "إجراء آخر";
}

export function getAffectedEntityArabicLabel(type: string) {
  const labels: Record<string, string> = {
    TEACHER: "معلم",
    CLASS: "فصل",
    SUBJECT: "مادة",
    CONSTRAINT: "قيد",
    ASSIGNMENT: "إسناد",
  };
  return labels[type] ?? type;
}
