import type {
  GenerationAssignment,
  GenerationConstraint,
  GenerationProblem,
  GenerationSubject,
  GenerationTeacher,
} from "../generation/generation-domain";

export const LARGE_SCHOOL_560_SCENARIO_ID =
  "benchmark-large-school-560-v1";

export type LargeSchoolStage =
  | "ELEMENTARY"
  | "MIDDLE"
  | "HIGH";

export type LargeSchoolBenchmarkClass = {
  id: string;
  name: string;
  stage: LargeSchoolStage;
  grade: string;
  section: "أ" | "ب";
};

export const LARGE_SCHOOL_560_CLASSES:
  LargeSchoolBenchmarkClass[] = [
    // الابتدائي — 6
    {
      id: "CLS-E-01-A",
      name: "الأول الابتدائي أ",
      stage: "ELEMENTARY",
      grade: "الأول الابتدائي",
      section: "أ",
    },
    {
      id: "CLS-E-01-B",
      name: "الأول الابتدائي ب",
      stage: "ELEMENTARY",
      grade: "الأول الابتدائي",
      section: "ب",
    },
    {
      id: "CLS-E-02-A",
      name: "الثاني الابتدائي أ",
      stage: "ELEMENTARY",
      grade: "الثاني الابتدائي",
      section: "أ",
    },
    {
      id: "CLS-E-03-A",
      name: "الثالث الابتدائي أ",
      stage: "ELEMENTARY",
      grade: "الثالث الابتدائي",
      section: "أ",
    },
    {
      id: "CLS-E-04-A",
      name: "الرابع الابتدائي أ",
      stage: "ELEMENTARY",
      grade: "الرابع الابتدائي",
      section: "أ",
    },
    {
      id: "CLS-E-06-A",
      name: "السادس الابتدائي أ",
      stage: "ELEMENTARY",
      grade: "السادس الابتدائي",
      section: "أ",
    },

    // المتوسط — 5
    {
      id: "CLS-M-01-A",
      name: "الأول المتوسط أ",
      stage: "MIDDLE",
      grade: "الأول المتوسط",
      section: "أ",
    },
    {
      id: "CLS-M-01-B",
      name: "الأول المتوسط ب",
      stage: "MIDDLE",
      grade: "الأول المتوسط",
      section: "ب",
    },
    {
      id: "CLS-M-02-A",
      name: "الثاني المتوسط أ",
      stage: "MIDDLE",
      grade: "الثاني المتوسط",
      section: "أ",
    },
    {
      id: "CLS-M-03-A",
      name: "الثالث المتوسط أ",
      stage: "MIDDLE",
      grade: "الثالث المتوسط",
      section: "أ",
    },
    {
      id: "CLS-M-03-B",
      name: "الثالث المتوسط ب",
      stage: "MIDDLE",
      grade: "الثالث المتوسط",
      section: "ب",
    },

    // الثانوي — 5
    {
      id: "CLS-H-01-A",
      name: "الأول الثانوي أ",
      stage: "HIGH",
      grade: "الأول الثانوي",
      section: "أ",
    },
    {
      id: "CLS-H-01-B",
      name: "الأول الثانوي ب",
      stage: "HIGH",
      grade: "الأول الثانوي",
      section: "ب",
    },
    {
      id: "CLS-H-02-A",
      name: "الثاني الثانوي أ",
      stage: "HIGH",
      grade: "الثاني الثانوي",
      section: "أ",
    },
    {
      id: "CLS-H-03-A",
      name: "الثالث الثانوي أ",
      stage: "HIGH",
      grade: "الثالث الثانوي",
      section: "أ",
    },
    {
      id: "CLS-H-03-B",
      name: "الثالث الثانوي ب",
      stage: "HIGH",
      grade: "الثالث الثانوي",
      section: "ب",
    },
  ];

const SUBJECT_DEFINITIONS = [
  {
    id: "SUB-ISLAMIC",
    name: "الدراسات الإسلامية",
    weeklyLessons: 5,
  },
  {
    id: "SUB-ARABIC",
    name: "اللغة العربية",
    weeklyLessons: 5,
  },
  {
    id: "SUB-MATH",
    name: "الرياضيات",
    weeklyLessons: 5,
  },
  {
    id: "SUB-SCIENCE",
    name: "العلوم",
    weeklyLessons: 4,
  },
  {
    id: "SUB-ENGLISH",
    name: "اللغة الإنجليزية",
    weeklyLessons: 4,
  },
  {
    id: "SUB-SOCIAL",
    name: "الدراسات الاجتماعية",
    weeklyLessons: 3,
  },
  {
    id: "SUB-DIGITAL",
    name: "المهارات الرقمية",
    weeklyLessons: 3,
  },
  {
    id: "SUB-PE",
    name: "التربية البدنية",
    weeklyLessons: 2,
  },
  {
    id: "SUB-ART",
    name: "التربية الفنية",
    weeklyLessons: 2,
  },
  {
    id: "SUB-LIFE",
    name: "المهارات الحياتية",
    weeklyLessons: 2,
  },
] as const;

const SUBJECTS:
  GenerationSubject[] =
  SUBJECT_DEFINITIONS.map(
    (subject) => ({
      id: subject.id,
      name: subject.name,
    }),
  );

/*
 * 40 معلماً:
 *
 * 4 معلمين لكل مادة.
 *
 * الأحمال النظرية:
 * الإسلامية   80 / 4 = 20
 * العربية     80 / 4 = 20
 * الرياضيات   80 / 4 = 20
 * العلوم      64 / 4 = 16
 * الإنجليزي   64 / 4 = 16
 * الاجتماعيات 48 / 4 = 12
 * الرقمية     48 / 4 = 12
 * البدنية     32 / 4 = 8
 * الفنية      32 / 4 = 8
 * الحياتية    32 / 4 = 8
 *
 * الإجمالي = 560.
 */
function createTeachers(): GenerationTeacher[] {
  const teachers:
    GenerationTeacher[] = [];

  SUBJECT_DEFINITIONS.forEach(
    (
      subject,
      subjectIndex,
    ) => {
      for (
        let localIndex = 0;
        localIndex < 4;
        localIndex += 1
      ) {
        const teacherNumber =
          subjectIndex * 4 +
          localIndex +
          1;

        teachers.push({
          id:
            `T-${String(
              teacherNumber,
            ).padStart(2, "0")}`,

          name:
            `معلم ${String(
              teacherNumber,
            ).padStart(2, "0")}`,

          specialty:
            subject.name,

          maxWeeklyLoad:
            24,
        });
      }
    },
  );

  return teachers;
}

const TEACHERS =
  createTeachers();

function teacherFor(
  subjectIndex: number,
  classIndex: number,
) {
  /*
   * كل معلم في المادة يستلم 4 فصول.
   * classIndex % 4 يوزع الـ16 فصلاً بالتساوي.
   */
  const localTeacherIndex =
    classIndex % 4;

  return TEACHERS[
    subjectIndex * 4 +
      localTeacherIndex
  ];
}

function createAssignments():
  GenerationAssignment[] {
  const assignments:
    GenerationAssignment[] = [];

  LARGE_SCHOOL_560_CLASSES.forEach(
    (
      classItem,
      classIndex,
    ) => {
      SUBJECT_DEFINITIONS.forEach(
        (
          subject,
          subjectIndex,
        ) => {
          const teacher =
            teacherFor(
              subjectIndex,
              classIndex,
            );

          const id =
            `A-${classItem.id}-${subject.id}`;

          assignments.push({
            id,

            teacherId:
              teacher.id,

            teacherName:
              teacher.name,

            classId:
              classItem.id,

            className:
              classItem.name,

            subjectId:
              subject.id,

            subjectName:
              subject.name,

            assignedLessons:
              subject.weeklyLessons,

            singlePeriods:
              subject.weeklyLessons,

            doublePeriods:
              0,

            fixedSlots:
              [],
          });
        },
      );
    },
  );

  return assignments;
}

function constraint(
  input: {
    id: string;
    type: string;
    strength: "HARD" | "SOFT";
    valueInt?: number | null;
    weight?: number;
    teacherIds?: string[];
    subjectIds?: string[];
    classIds?: string[];
    dayIds?: string[];
    periodIds?: string[];
    slots?: Array<{
      dayId: string;
      periodId: string;
    }>;
  },
): GenerationConstraint {
  const weight =
    input.weight ??
    1;

  return {
    id:
      input.id,

    type:
      input.type,

    strength:
      input.strength,

    valueInt:
      input.valueInt ??
      null,

    weight,

    teacherIds:
      input.teacherIds ??
      [],

    subjectIds:
      input.subjectIds ??
      [],

    classIds:
      input.classIds ??
      [],

    dayIds:
      input.dayIds ??
      [],

    periodIds:
      input.periodIds ??
      [],

    slots:
      input.slots ??
      [],

    configJson: {
      weight,
    },
  };
}

function createConstraints():
  GenerationConstraint[] {
  const allTeacherIds =
    TEACHERS.map(
      (teacher) =>
        teacher.id,
    );

  const allClassIds =
    LARGE_SCHOOL_560_CLASSES.map(
      (classItem) =>
        classItem.id,
    );

  return [
    /*
     * سعة يومية:
     * لا يوجد معلم يتجاوز 5 حصص في اليوم.
     */
    constraint({
      id:
        "C-TEACHER-MAX-DAILY",

      type:
        "TEACHER_MAX_DAILY",

      strength:
        "HARD",

      valueInt:
        5,

      teacherIds:
        allTeacherIds,
    }),

    /*
     * حد التتابع لبعض المعلمين.
     */
    constraint({
      id:
        "C-TEACHER-MAX-CONSECUTIVE",

      type:
        "TEACHER_MAX_CONSECUTIVE",

      strength:
        "HARD",

      valueInt:
        4,

      teacherIds:
        TEACHERS
          .slice(
            0,
            20,
          )
          .map(
            (teacher) =>
              teacher.id,
          ),
    }),

    /*
     * أيام راحة لمعلمين أصحاب أحمال منخفضة نسبياً.
     * نتجنب معلمي العربية والرياضيات ذوي 20 حصة.
     */
    constraint({
      id:
        "C-DAY-OFF-T21",

      type:
        "TEACHER_DAY_OFF",

      strength:
        "HARD",

      teacherIds: [
        "T-21",
      ],

      dayIds: [
        "SUNDAY",
      ],
    }),

    constraint({
      id:
        "C-DAY-OFF-T25",

      type:
        "TEACHER_DAY_OFF",

      strength:
        "HARD",

      teacherIds: [
        "T-25",
      ],

      dayIds: [
        "THURSDAY",
      ],
    }),

    constraint({
      id:
        "C-DAY-OFF-T29",

      type:
        "TEACHER_DAY_OFF",

      strength:
        "HARD",

      teacherIds: [
        "T-29",
      ],

      dayIds: [
        "MONDAY",
      ],
    }),

    constraint({
      id:
        "C-DAY-OFF-T33",

      type:
        "TEACHER_DAY_OFF",

      strength:
        "HARD",

      teacherIds: [
        "T-33",
      ],

      dayIds: [
        "WEDNESDAY",
      ],
    }),

    /*
     * عدم توفر جزئي.
     */
    constraint({
      id:
        "C-UNAVAILABLE-T22-T23",

      type:
        "TEACHER_UNAVAILABLE",

      strength:
        "HARD",

      teacherIds: [
        "T-22",
        "T-23",
      ],

      slots: [
        {
          dayId:
            "MONDAY",

          periodId:
            "PERIOD_1",
        },
        {
          dayId:
            "TUESDAY",

          periodId:
            "PERIOD_7",
        },
      ],
    }),

    constraint({
      id:
        "C-UNAVAILABLE-T30-T31",

      type:
        "TEACHER_UNAVAILABLE",

      strength:
        "HARD",

      teacherIds: [
        "T-30",
        "T-31",
      ],

      slots: [
        {
          dayId:
            "SUNDAY",

          periodId:
            "PERIOD_7",
        },
        {
          dayId:
            "THURSDAY",

          periodId:
            "PERIOD_1",
        },
      ],
    }),

    /*
     * العربية والرياضيات:
     * 5 حصص أسبوعياً، بحد أقصى حصة واحدة يومياً.
     * هذا يعني ظهور المادة في الأيام الخمسة.
     */
    constraint({
      id:
        "C-ARABIC-DAILY-1",

      type:
        "SUBJECT_DAILY_LIMIT",

      strength:
        "HARD",

      valueInt:
        1,

      subjectIds: [
        "SUB-ARABIC",
      ],

      classIds:
        allClassIds,
    }),

    constraint({
      id:
        "C-MATH-DAILY-1",

      type:
        "SUBJECT_DAILY_LIMIT",

      strength:
        "HARD",

      valueInt:
        1,

      subjectIds: [
        "SUB-MATH",
      ],

      classIds:
        allClassIds,
    }),

    /*
     * العلوم 4 أسبوعياً، بحد أقصى واحدة في اليوم.
     */
    constraint({
      id:
        "C-SCIENCE-DAILY-1",

      type:
        "SUBJECT_DAILY_LIMIT",

      strength:
        "HARD",

      valueInt:
        1,

      subjectIds: [
        "SUB-SCIENCE",
      ],

      classIds:
        allClassIds,
    }),

    /*
     * البدنية لا تكون في الحصة الأولى.
     */
    constraint({
      id:
        "C-PE-NO-FIRST",

      type:
        "SUBJECT_BLOCKED",

      strength:
        "HARD",

      subjectIds: [
        "SUB-PE",
      ],

      periodIds: [
        "PERIOD_1",
      ],
    }),

    /*
     * تفضيل فقط، وليس HARD:
     * الرياضيات والعلوم في أول أربع حصص.
     */
    constraint({
      id:
        "C-MATH-EARLY",

      type:
        "SUBJECT_PREFERRED",

      strength:
        "SOFT",

      weight:
        35,

      subjectIds: [
        "SUB-MATH",
      ],

      periodIds: [
        "PERIOD_1",
        "PERIOD_2",
        "PERIOD_3",
        "PERIOD_4",
      ],
    }),

    constraint({
      id:
        "C-SCIENCE-EARLY",

      type:
        "SUBJECT_PREFERRED",

      strength:
        "SOFT",

      weight:
        25,

      subjectIds: [
        "SUB-SCIENCE",
      ],

      periodIds: [
        "PERIOD_1",
        "PERIOD_2",
        "PERIOD_3",
        "PERIOD_4",
      ],
    }),
  ];
}

export function createLargeSchool560GenerationProblem():
  GenerationProblem {
  const assignments =
    createAssignments();

  const requiredSessions =
    assignments.reduce(
      (
        total,
        assignment,
      ) =>
        total +
        assignment.assignedLessons,
      0,
    );

  if (
    TEACHERS.length !== 40
  ) {
    throw new Error(
      `BENCHMARK_EXPECTED_40_TEACHERS:${TEACHERS.length}`,
    );
  }

  if (
    LARGE_SCHOOL_560_CLASSES.length !==
    16
  ) {
    throw new Error(
      `BENCHMARK_EXPECTED_16_CLASSES:${LARGE_SCHOOL_560_CLASSES.length}`,
    );
  }

  if (
    requiredSessions !== 560
  ) {
    throw new Error(
      `BENCHMARK_EXPECTED_560_SESSIONS:${requiredSessions}`,
    );
  }

  return {
    projectId:
      LARGE_SCHOOL_560_SCENARIO_ID,

    days: [
      {
        id: "SUNDAY",
        label: "الأحد",
        order: 1,
      },
      {
        id: "MONDAY",
        label: "الاثنين",
        order: 2,
      },
      {
        id: "TUESDAY",
        label: "الثلاثاء",
        order: 3,
      },
      {
        id: "WEDNESDAY",
        label: "الأربعاء",
        order: 4,
      },
      {
        id: "THURSDAY",
        label: "الخميس",
        order: 5,
      },
    ],

    periods:
      Array.from(
        {
          length: 7,
        },
        (
          _,
          index,
        ) => ({
          id:
            `PERIOD_${index + 1}`,

          label:
            `الحصة ${index + 1}`,

          order:
            index + 1,
        }),
      ),

    teachers:
      TEACHERS.map(
        (teacher) => ({
          ...teacher,
        }),
      ),

    classes:
      LARGE_SCHOOL_560_CLASSES.map(
        (classItem) => ({
          id:
            classItem.id,

          name:
            classItem.name,
        }),
      ),

    subjects:
      SUBJECTS.map(
        (subject) => ({
          ...subject,
        }),
      ),

    assignments,

    constraints:
      createConstraints(),
  };
}

export function getLargeSchool560BenchmarkSummary() {
  const problem =
    createLargeSchool560GenerationProblem();

  const teacherLoads =
    problem.teachers.map(
      (teacher) => ({
        teacherId:
          teacher.id,

        teacherName:
          teacher.name,

        specialty:
          teacher.specialty,

        weeklyLoad:
          problem.assignments
            .filter(
              (assignment) =>
                assignment.teacherId ===
                teacher.id,
            )
            .reduce(
              (
                total,
                assignment,
              ) =>
                total +
                assignment.assignedLessons,
              0,
            ),
      }),
    );

  const stageCounts =
    LARGE_SCHOOL_560_CLASSES.reduce(
      (
        result,
        classItem,
      ) => {
        result[
          classItem.stage
        ] += 1;

        return result;
      },
      {
        ELEMENTARY: 0,
        MIDDLE: 0,
        HIGH: 0,
      },
    );

  return {
    id:
      LARGE_SCHOOL_560_SCENARIO_ID,

    stages:
      stageCounts,

    classes:
      LARGE_SCHOOL_560_CLASSES,

    teachers:
      problem.teachers.length,

    subjects:
      problem.subjects.length,

    assignments:
      problem.assignments.length,

    constraints:
      problem.constraints.length,

    requiredSessions:
      problem.assignments.reduce(
        (
          total,
          assignment,
        ) =>
          total +
          assignment.assignedLessons,
        0,
      ),

    capacity:
      problem.days.length *
      problem.periods.length *
      problem.classes.length,

    teacherLoads,
  };
}