import {
  TIMETABLE_V2_RAW_COURSE_GROUPS,
} from "./data/raw-course-groups";

import {
  getTimetableV2Grade,
  type TimetableV2StageId,
} from "./project-setup";

export const TIMETABLE_V2_CURRICULUM_TRACK_IDS = [
  "GENERAL",
  "QURAN",
  "CHINESE",
  "COMPUTER_ENGINEERING",
  "SHARIA",
  "BUSINESS",
  "HEALTH_LIFE",
  "SCIENTIFIC_INSTITUTE",
] as const;

export type TimetableV2CurriculumTrackId =
  (typeof TIMETABLE_V2_CURRICULUM_TRACK_IDS)[number];

export const TIMETABLE_V2_SEMESTER_IDS = [
  "FIRST",
  "SECOND",
] as const;

export type TimetableV2SemesterId =
  (typeof TIMETABLE_V2_SEMESTER_IDS)[number];

export type TimetableV2CurriculumSubject = {
  sourceName: string;
  canonicalName: string;

  oddClasses: number;
  evenClasses: number;
  weeklyPeriods: number;
};

export type TimetableV2CurriculumPlan = {
  sourceId: string;
  sourceName: string;

  stageId: TimetableV2StageId;
  gradeId: string;

  trackId: TimetableV2CurriculumTrackId;
  semesterId: TimetableV2SemesterId | null;

  subjects: TimetableV2CurriculumSubject[];

  totalWeeklyPeriods: number;
};

export const TIMETABLE_V2_CURRICULUM_TRACK_LABELS: Record<
  TimetableV2CurriculumTrackId,
  string
> = {
  GENERAL: "عام",
  QURAN: "تحفيظ القرآن",
  CHINESE: "تطبيق اللغة الصينية",
  COMPUTER_ENGINEERING: "علوم الحاسب والهندسة",
  SHARIA: "المسار الشرعي",
  BUSINESS: "إدارة الأعمال",
  HEALTH_LIFE: "الصحة والحياة",
  SCIENTIFIC_INSTITUTE: "المعاهد العلمية",
};

export const TIMETABLE_V2_SEMESTER_LABELS: Record<
  TimetableV2SemesterId,
  string
> = {
  FIRST: "الفصل الأول",
  SECOND: "الفصل الثاني",
};

function normalizeArabicText(value: string) {
  return value
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

const SUBJECT_CANONICAL_ALIASES: Record<string, string> = {
  الاسلاميه: "الدراسات الإسلامية",
  "الدراسات الاسلاميه": "الدراسات الإسلامية",

  الانجليزيه: "اللغة الإنجليزية",
  الانجليزي: "اللغة الإنجليزية",
  انجليزي: "اللغة الإنجليزية",
  "اللغه الانجليزيه": "اللغة الإنجليزية",

  العربيه: "اللغة العربية",
  "اللغه العربيه": "اللغة العربية",

  البدنيه: "التربية البدنية",
  "التربيه البدنيه": "التربية البدنية",

  الفنيه: "التربية الفنية",
  "التربيه الفنيه": "التربية الفنية",

  الاجتماعيه: "الدراسات الاجتماعية",
  "الدراسات الاجتماعيه": "الدراسات الاجتماعية",

  الحياتيه: "المهارات الحياتية",
  حياتيه: "المهارات الحياتية",
  "مهارات حياتيه": "المهارات الحياتية",
  "المهارات الحياتيه": "المهارات الحياتية",

  الرقميه: "المهارات الرقمية",
  "المهارات الرقميه": "المهارات الرقمية",
};

export function getTimetableV2CanonicalSubjectName(
  sourceName: string,
) {
  const normalized = normalizeArabicText(sourceName);

  return (
    SUBJECT_CANONICAL_ALIASES[normalized] ??
    sourceName.trim()
  );
}

function detectStageId(
  name: string,
): TimetableV2StageId {
  if (name.includes("ابتدائي")) {
    return "ELEMENTARY";
  }

  if (name.includes("متوسط")) {
    return "MIDDLE";
  }

  if (
    name.includes("ثانوي") ||
    name.includes("المعاهد العلمية")
  ) {
    return "HIGH";
  }

  throw new Error(
    `تعذر تحديد المرحلة للخطة: ${name}`,
  );
}

function detectGradeNumber(
  name: string,
): 1 | 2 | 3 | 4 | 5 | 6 {
  const normalized = normalizeArabicText(name);

  if (
    normalized.includes("اول ") ||
    normalized.startsWith("اول")
  ) {
    return 1;
  }

  if (
    normalized.includes("ثاني ") ||
    normalized.includes("الثاني ")
  ) {
    return 2;
  }

  if (
    normalized.includes("ثالث ") ||
    normalized.includes("الثالث ")
  ) {
    return 3;
  }

  if (
    normalized.includes("رابع ") ||
    normalized.includes("الرابع ")
  ) {
    return 4;
  }

  if (
    normalized.includes("خامس ") ||
    normalized.includes("الخامس ")
  ) {
    return 5;
  }

  if (
    normalized.includes("سادس ") ||
    normalized.includes("السادس ")
  ) {
    return 6;
  }

  throw new Error(
    `تعذر تحديد الصف للخطة: ${name}`,
  );
}

function buildGradeId(
  stageId: TimetableV2StageId,
  gradeNumber: number,
) {
  if (stageId === "ELEMENTARY") {
    return `ELEMENTARY_${gradeNumber}`;
  }

  if (stageId === "MIDDLE") {
    return `MIDDLE_${gradeNumber}`;
  }

  return `HIGH_${gradeNumber}`;
}

function detectTrackId(
  name: string,
): TimetableV2CurriculumTrackId {
  if (name.includes("تحفيظ")) {
    return "QURAN";
  }

  if (name.includes("اللغة الصينية")) {
    return "CHINESE";
  }

  if (name.includes("علوم الحاسب والهندسة")) {
    return "COMPUTER_ENGINEERING";
  }

  if (name.includes("الشرعي")) {
    return "SHARIA";
  }

  if (name.includes("إدارة الأعمال")) {
    return "BUSINESS";
  }

  if (name.includes("الصحة والحياة")) {
    return "HEALTH_LIFE";
  }

  if (name.includes("المعاهد العلمية")) {
    return "SCIENTIFIC_INSTITUTE";
  }

  return "GENERAL";
}

function detectSemesterId(
  name: string,
): TimetableV2SemesterId | null {
  if (
    name.includes("الفصل الدراسي الأول") ||
    name.includes("الفصل الأول")
  ) {
    return "FIRST";
  }

  if (
    name.includes("الفصل الدراسي الثاني") ||
    name.includes("الفصل الثاني")
  ) {
    return "SECOND";
  }

  return null;
}

function buildCurriculumPlan(
  group: (typeof TIMETABLE_V2_RAW_COURSE_GROUPS.groups)[number],
): TimetableV2CurriculumPlan {
  const stageId = detectStageId(group.name);
  const gradeNumber = detectGradeNumber(group.name);
  const gradeId = buildGradeId(
    stageId,
    gradeNumber,
  );

  const grade = getTimetableV2Grade(gradeId);

  if (!grade) {
    throw new Error(
      `الخطة ${group.name} تشير إلى صف غير معروف: ${gradeId}`,
    );
  }

  const subjects: TimetableV2CurriculumSubject[] =
    group.subjects.map((subject) => ({
      sourceName: subject.name,
      canonicalName:
        getTimetableV2CanonicalSubjectName(
          subject.name,
        ),
      oddClasses: subject.oddClasses,
      evenClasses: subject.evenClasses,
      weeklyPeriods: subject.weeklyPeriods,
    }));

  const calculatedTotal = subjects.reduce(
    (sum, subject) =>
      sum + subject.weeklyPeriods,
    0,
  );

  if (
    calculatedTotal !==
    group.totalWeeklyPeriods
  ) {
    throw new Error(
      `مجموع حصص الخطة ${group.name} غير متطابق.`,
    );
  }

  return {
    sourceId: group.id,
    sourceName: group.name,

    stageId,
    gradeId,

    trackId: detectTrackId(group.name),
    semesterId: detectSemesterId(
      group.name,
    ),

    subjects,

    totalWeeklyPeriods:
      group.totalWeeklyPeriods,
  };
}

export const TIMETABLE_V2_CURRICULUM_PLANS:
  TimetableV2CurriculumPlan[] =
  TIMETABLE_V2_RAW_COURSE_GROUPS.groups.map(
    buildCurriculumPlan,
  );

export type TimetableV2CurriculumPlanQuery = {
  stageIds?: TimetableV2StageId[];
  gradeId?: string;
  trackId?: TimetableV2CurriculumTrackId;
  semesterId?: TimetableV2SemesterId | null;
};

export function findTimetableV2CurriculumPlans(
  query: TimetableV2CurriculumPlanQuery = {},
) {
  return TIMETABLE_V2_CURRICULUM_PLANS.filter(
    (plan) => {
      if (
        query.stageIds?.length &&
        !query.stageIds.includes(plan.stageId)
      ) {
        return false;
      }

      if (
        query.gradeId &&
        plan.gradeId !== query.gradeId
      ) {
        return false;
      }

      if (
        query.trackId &&
        plan.trackId !== query.trackId
      ) {
        return false;
      }

      if (
        query.semesterId !== undefined &&
        plan.semesterId !== query.semesterId
      ) {
        return false;
      }

      return true;
    },
  );
}

export function getTimetableV2CurriculumPlanBySourceId(
  sourceId: string,
) {
  return (
    TIMETABLE_V2_CURRICULUM_PLANS.find(
      (plan) => plan.sourceId === sourceId,
    ) ?? null
  );
}

export function getTimetableV2DefaultCurriculumPlan(
  gradeId: string,
  semesterId?: TimetableV2SemesterId | null,
) {
  const grade = getTimetableV2Grade(gradeId);

  if (!grade) {
    return null;
  }

  const plans =
    findTimetableV2CurriculumPlans({
      gradeId,
    });

  if (plans.length === 0) {
    return null;
  }

  if (grade.stageId === "HIGH") {
    if (!semesterId) {
      return null;
    }

    return (
      plans.find(
        (plan) =>
          plan.trackId === "GENERAL" &&
          plan.semesterId === semesterId,
      ) ?? null
    );
  }

  return (
    plans.find(
      (plan) =>
        plan.trackId === "GENERAL" &&
        plan.semesterId === null,
    ) ?? null
  );
}

export function getTimetableV2AvailableTracksForGrade(
  gradeId: string,
) {
  const values = new Set(
    findTimetableV2CurriculumPlans({
      gradeId,
    }).map((plan) => plan.trackId),
  );

  return [...values];
}

export function getTimetableV2CatalogStats() {
  const subjectNames = new Set<string>();
  const canonicalNames = new Set<string>();

  for (
    const plan of TIMETABLE_V2_CURRICULUM_PLANS
  ) {
    for (const subject of plan.subjects) {
      subjectNames.add(subject.sourceName);
      canonicalNames.add(
        subject.canonicalName,
      );
    }
  }

  return {
    plansCount:
      TIMETABLE_V2_CURRICULUM_PLANS.length,

    elementaryPlans:
      TIMETABLE_V2_CURRICULUM_PLANS.filter(
        (plan) =>
          plan.stageId === "ELEMENTARY",
      ).length,

    middlePlans:
      TIMETABLE_V2_CURRICULUM_PLANS.filter(
        (plan) => plan.stageId === "MIDDLE",
      ).length,

    highPlans:
      TIMETABLE_V2_CURRICULUM_PLANS.filter(
        (plan) => plan.stageId === "HIGH",
      ).length,

    originalSubjectNamesCount:
      subjectNames.size,

    canonicalSubjectNamesCount:
      canonicalNames.size,
  };
}