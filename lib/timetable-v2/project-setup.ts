export const TIMETABLE_V2_STAGE_IDS = [
  "ELEMENTARY",
  "MIDDLE",
  "HIGH",
] as const;

export type TimetableV2StageId =
  (typeof TIMETABLE_V2_STAGE_IDS)[number];

export const TIMETABLE_V2_STUDY_DAY_IDS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
] as const;

export type TimetableV2StudyDayId =
  (typeof TIMETABLE_V2_STUDY_DAY_IDS)[number];

export type TimetableV2GradeDefinition = {
  id: string;
  stageId: TimetableV2StageId;
  name: string;
  shortName: string;
  sortOrder: number;
};

export type TimetableV2StageDefinition = {
  id: TimetableV2StageId;
  name: string;
  shortName: string;
  grades: TimetableV2GradeDefinition[];
};

export type TimetableV2GradeSetup = {
  gradeId: string;
  sectionNames: string[];
};

export type TimetableV2ProjectSetupInput = {
  name: string;
  academicYear: string;
  semester: string;

  stageIds: TimetableV2StageId[];

  teacherCount: number;

  /**
   * قيمة إرشادية فقط ولا تعتبر قيداً ثابتاً.
   * مثال: 35 حصة أسبوعياً.
   */
  weeklyPeriodTarget?: number | null;

  studyDays: TimetableV2StudyDayId[];

  periodsPerDay: number;

  grades: TimetableV2GradeSetup[];
};

export const TIMETABLE_V2_DEFAULT_SECTION_NAMES = [
  "أ",
  "ب",
  "ج",
  "د",
  "هـ",
  "ح",
] as const;

export const TIMETABLE_V2_DEFAULT_STUDY_DAYS: TimetableV2StudyDayId[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
];

export const TIMETABLE_V2_DAY_LABELS: Record<
  TimetableV2StudyDayId,
  string
> = {
  SUNDAY: "الأحد",
  MONDAY: "الاثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
};

export const TIMETABLE_V2_STAGES: TimetableV2StageDefinition[] = [
  {
    id: "ELEMENTARY",
    name: "المرحلة الابتدائية",
    shortName: "ابتدائي",
    grades: [
      {
        id: "ELEMENTARY_1",
        stageId: "ELEMENTARY",
        name: "أول ابتدائي",
        shortName: "الأول",
        sortOrder: 1,
      },
      {
        id: "ELEMENTARY_2",
        stageId: "ELEMENTARY",
        name: "ثاني ابتدائي",
        shortName: "الثاني",
        sortOrder: 2,
      },
      {
        id: "ELEMENTARY_3",
        stageId: "ELEMENTARY",
        name: "ثالث ابتدائي",
        shortName: "الثالث",
        sortOrder: 3,
      },
      {
        id: "ELEMENTARY_4",
        stageId: "ELEMENTARY",
        name: "رابع ابتدائي",
        shortName: "الرابع",
        sortOrder: 4,
      },
      {
        id: "ELEMENTARY_5",
        stageId: "ELEMENTARY",
        name: "خامس ابتدائي",
        shortName: "الخامس",
        sortOrder: 5,
      },
      {
        id: "ELEMENTARY_6",
        stageId: "ELEMENTARY",
        name: "سادس ابتدائي",
        shortName: "السادس",
        sortOrder: 6,
      },
    ],
  },
  {
    id: "MIDDLE",
    name: "المرحلة المتوسطة",
    shortName: "متوسط",
    grades: [
      {
        id: "MIDDLE_1",
        stageId: "MIDDLE",
        name: "أول متوسط",
        shortName: "الأول",
        sortOrder: 1,
      },
      {
        id: "MIDDLE_2",
        stageId: "MIDDLE",
        name: "ثاني متوسط",
        shortName: "الثاني",
        sortOrder: 2,
      },
      {
        id: "MIDDLE_3",
        stageId: "MIDDLE",
        name: "ثالث متوسط",
        shortName: "الثالث",
        sortOrder: 3,
      },
    ],
  },
  {
    id: "HIGH",
    name: "المرحلة الثانوية",
    shortName: "ثانوي",
    grades: [
      {
        id: "HIGH_1",
        stageId: "HIGH",
        name: "أول ثانوي",
        shortName: "الأول",
        sortOrder: 1,
      },
      {
        id: "HIGH_2",
        stageId: "HIGH",
        name: "ثاني ثانوي",
        shortName: "الثاني",
        sortOrder: 2,
      },
      {
        id: "HIGH_3",
        stageId: "HIGH",
        name: "ثالث ثانوي",
        shortName: "الثالث",
        sortOrder: 3,
      },
    ],
  },
];

export function isTimetableV2StageId(
  value: string,
): value is TimetableV2StageId {
  return TIMETABLE_V2_STAGE_IDS.includes(
    value as TimetableV2StageId,
  );
}

export function isTimetableV2StudyDayId(
  value: string,
): value is TimetableV2StudyDayId {
  return TIMETABLE_V2_STUDY_DAY_IDS.includes(
    value as TimetableV2StudyDayId,
  );
}

export function getTimetableV2Stage(
  stageId: TimetableV2StageId,
) {
  return (
    TIMETABLE_V2_STAGES.find(
      (stage) => stage.id === stageId,
    ) ?? null
  );
}

export function getTimetableV2Grade(
  gradeId: string,
) {
  for (const stage of TIMETABLE_V2_STAGES) {
    const grade = stage.grades.find(
      (item) => item.id === gradeId,
    );

    if (grade) {
      return grade;
    }
  }

  return null;
}

export function getTimetableV2GradesForStages(
  stageIds: TimetableV2StageId[],
) {
  const selected = new Set(stageIds);

  return TIMETABLE_V2_STAGES
    .filter((stage) => selected.has(stage.id))
    .flatMap((stage) => stage.grades);
}

export function createTimetableV2GradeSetups(
  stageIds: TimetableV2StageId[],
): TimetableV2GradeSetup[] {
  return getTimetableV2GradesForStages(stageIds).map(
    (grade) => ({
      gradeId: grade.id,
      sectionNames: ["أ"],
    }),
  );
}

export function createTimetableV2DefaultSetup(): TimetableV2ProjectSetupInput {
  return {
    name: "",
    academicYear: "",
    semester: "",
    stageIds: [],
    teacherCount: 0,
    weeklyPeriodTarget: null,
    studyDays: [...TIMETABLE_V2_DEFAULT_STUDY_DAYS],
    periodsPerDay: 7,
    grades: [],
  };
}