import type {
  GenerationAssignment,
  GenerationConstraint,
  GenerationProblem,
  GenerationSubject,
  GenerationTeacher,
} from "@/lib/timetable-v2/generation/generation-domain";

const DAYS = [
  { id: "SUN", label: "Sunday", order: 1 },
  { id: "MON", label: "Monday", order: 2 },
  { id: "TUE", label: "Tuesday", order: 3 },
  { id: "WED", label: "Wednesday", order: 4 },
  { id: "THU", label: "Thursday", order: 5 },
];

const PERIODS = Array.from(
  { length: 7 },
  (_, index) => ({
    id: `P${index + 1}`,
    label: `Period ${index + 1}`,
    order: index + 1,
  }),
);

const CLASS_NAMES = [
  "G10-A",
  "G10-B",
  "G10-C",
  "G10-D",

  "G11-A",
  "G11-B",
  "G11-C",
  "G11-D",

  "G12-A",
  "G12-B",
  "G12-C",
  "G12-D",
];

const SUBJECT_PLAN = [
  { key: "ARABIC", name: "Arabic", lessons: 5, teachers: 4 },
  { key: "MATH", name: "Mathematics", lessons: 5, teachers: 4 },
  { key: "ENGLISH", name: "English", lessons: 4, teachers: 4 },
  { key: "PHYSICS", name: "Physics", lessons: 3, teachers: 4 },
  { key: "CHEMISTRY", name: "Chemistry", lessons: 3, teachers: 4 },
  { key: "BIOLOGY", name: "Biology", lessons: 3, teachers: 4 },
  { key: "ISLAMIC", name: "Islamic Studies", lessons: 3, teachers: 4 },

  { key: "SOCIAL", name: "Social Studies", lessons: 2, teachers: 3 },
  { key: "PE", name: "Physical Education", lessons: 2, teachers: 3 },
  { key: "COMPUTER", name: "Computer", lessons: 2, teachers: 3 },
  { key: "SKILLS", name: "Skills", lessons: 3, teachers: 3 },
] as const;

function teacherId(
  subjectKey: string,
  number: number,
) {
  return `T_${subjectKey}_${number}`;
}

function teacherName(
  subjectName: string,
  number: number,
) {
  return `${subjectName} ${number}`;
}

function classId(
  index: number,
) {
  return `C_${index + 1}`;
}

function subjectId(
  key: string,
) {
  return `S_${key}`;
}

export function createHighSchool420GenerationProblem(): GenerationProblem {
  const classes =
    CLASS_NAMES.map(
      (name, index) => ({
        id: classId(index),
        name,
      }),
    );

  const subjects: GenerationSubject[] =
    SUBJECT_PLAN.map(
      (subject) => ({
        id: subjectId(subject.key),
        name: subject.name,
      }),
    );

  const teachers: GenerationTeacher[] = [];

  for (const subject of SUBJECT_PLAN) {
    for (
      let number = 1;
      number <= subject.teachers;
      number += 1
    ) {
      teachers.push({
        id:
          teacherId(
            subject.key,
            number,
          ),

        name:
          teacherName(
            subject.name,
            number,
          ),

        specialty:
          subject.name,

        maxWeeklyLoad:
          24,
      });
    }
  }

  if (teachers.length !== 40) {
    throw new Error(
      `BENCHMARK_TEACHER_COUNT:${teachers.length}`,
    );
  }

  const assignments: GenerationAssignment[] = [];

  for (const subject of SUBJECT_PLAN) {
    for (
      let classIndex = 0;
      classIndex < classes.length;
      classIndex += 1
    ) {
      const classItem =
        classes[classIndex];

      let teacherNumber: number;

      if (subject.teachers === 4) {
        // A -> teacher 1, B -> 2, C -> 3, D -> 4
        teacherNumber =
          (classIndex % 4) + 1;
      }
      else {
        // Grade 10 -> teacher 1
        // Grade 11 -> teacher 2
        // Grade 12 -> teacher 3
        teacherNumber =
          Math.floor(classIndex / 4) + 1;
      }

      const id =
        `A_${subject.key}_${classItem.id}`;

      assignments.push({
        id,

        teacherId:
          teacherId(
            subject.key,
            teacherNumber,
          ),

        teacherName:
          teacherName(
            subject.name,
            teacherNumber,
          ),

        classId:
          classItem.id,

        className:
          classItem.name,

        subjectId:
          subjectId(
            subject.key,
          ),

        subjectName:
          subject.name,

        assignedLessons:
          subject.lessons,

        singlePeriods:
          subject.lessons,

        doublePeriods:
          0,

        fixedSlots:
          [],
      });
    }
  }

  const constraints: GenerationConstraint[] = [
    {
      id: "K_TEACHER_UNAVAILABLE_1",
      type: "TEACHER_UNAVAILABLE",
      strength: "HARD",
      valueInt: null,
      weight: 1,

      teacherIds: [
        teacherId("ARABIC", 1),
      ],

      subjectIds: [],
      classIds: [],

      dayIds: ["SUN"],
      periodIds: ["P1"],

      slots: [
        {
          dayId: "SUN",
          periodId: "P1",
        },
      ],
    },

    {
      id: "K_TEACHER_UNAVAILABLE_2",
      type: "TEACHER_UNAVAILABLE",
      strength: "HARD",
      valueInt: null,
      weight: 1,

      teacherIds: [
        teacherId("MATH", 1),
      ],

      subjectIds: [],
      classIds: [],

      dayIds: ["MON"],
      periodIds: ["P7"],

      slots: [
        {
          dayId: "MON",
          periodId: "P7",
        },
      ],
    },

    {
      id: "K_TEACHER_UNAVAILABLE_3",
      type: "TEACHER_UNAVAILABLE",
      strength: "HARD",
      valueInt: null,
      weight: 1,

      teacherIds: [
        teacherId("ENGLISH", 2),
      ],

      subjectIds: [],
      classIds: [],

      dayIds: ["WED"],
      periodIds: ["P1"],

      slots: [
        {
          dayId: "WED",
          periodId: "P1",
        },
      ],
    },

    {
      id: "K_TEACHER_UNAVAILABLE_4",
      type: "TEACHER_UNAVAILABLE",
      strength: "HARD",
      valueInt: null,
      weight: 1,

      teacherIds: [
        teacherId("PHYSICS", 3),
      ],

      subjectIds: [],
      classIds: [],

      dayIds: ["THU"],
      periodIds: ["P7"],

      slots: [
        {
          dayId: "THU",
          periodId: "P7",
        },
      ],
    },

    {
      id: "K_TEACHER_MAX_DAILY_ARABIC_1",
      type: "TEACHER_MAX_DAILY",
      strength: "HARD",
      valueInt: 5,
      weight: 1,

      teacherIds: [
        teacherId("ARABIC", 1),
      ],

      subjectIds: [],
      classIds: [],
      dayIds: [],
      periodIds: [],
      slots: [],
    },

    {
      id: "K_TEACHER_MAX_DAILY_MATH_1",
      type: "TEACHER_MAX_DAILY",
      strength: "HARD",
      valueInt: 5,
      weight: 1,

      teacherIds: [
        teacherId("MATH", 1),
      ],

      subjectIds: [],
      classIds: [],
      dayIds: [],
      periodIds: [],
      slots: [],
    },

    {
      id: "K_ARABIC_2_CONSECUTIVE",
      type: "TEACHER_MAX_CONSECUTIVE",
      strength: "SOFT",
      valueInt: 3,
      weight: 4,

      teacherIds: [
        teacherId("ARABIC", 2),
      ],

      subjectIds: [],
      classIds: [],
      dayIds: [],
      periodIds: [],
      slots: [],
    },

    {
      id: "K_MATH_2_CONSECUTIVE",
      type: "TEACHER_MAX_CONSECUTIVE",
      strength: "SOFT",
      valueInt: 3,
      weight: 4,

      teacherIds: [
        teacherId("MATH", 2),
      ],

      subjectIds: [],
      classIds: [],
      dayIds: [],
      periodIds: [],
      slots: [],
    },

    {
      id: "K_ENGLISH_1_PREFERRED",
      type: "TEACHER_PREFERRED",
      strength: "SOFT",
      valueInt: null,
      weight: 2,

      teacherIds: [
        teacherId("ENGLISH", 1),
      ],

      subjectIds: [],
      classIds: [],

      dayIds: [],
      periodIds: [
        "P1",
        "P2",
        "P3",
        "P4",
      ],

      slots: [],
    },

    {
      id: "K_MATH_3_PREFERRED",
      type: "TEACHER_PREFERRED",
      strength: "SOFT",
      valueInt: null,
      weight: 2,

      teacherIds: [
        teacherId("MATH", 3),
      ],

      subjectIds: [],
      classIds: [],

      dayIds: [],
      periodIds: [
        "P1",
        "P2",
        "P3",
        "P4",
        "P5",
      ],

      slots: [],
    },

    {
      id: "K_ARABIC_MAX_DAILY",
      type: "SUBJECT_MAX_DAILY",
      strength: "HARD",
      valueInt: 1,
      weight: 1,

      teacherIds: [],
      subjectIds: [
        subjectId("ARABIC"),
      ],
      classIds: [],
      dayIds: [],
      periodIds: [],
      slots: [],
    },

    {
      id: "K_MATH_MAX_DAILY",
      type: "SUBJECT_MAX_DAILY",
      strength: "HARD",
      valueInt: 1,
      weight: 1,

      teacherIds: [],
      subjectIds: [
        subjectId("MATH"),
      ],
      classIds: [],
      dayIds: [],
      periodIds: [],
      slots: [],
    },

    {
      id: "K_ENGLISH_MAX_DAILY",
      type: "SUBJECT_MAX_DAILY",
      strength: "HARD",
      valueInt: 1,
      weight: 1,

      teacherIds: [],
      subjectIds: [
        subjectId("ENGLISH"),
      ],
      classIds: [],
      dayIds: [],
      periodIds: [],
      slots: [],
    },

    {
      id: "K_FAIR_SUBJECT_SPREAD",
      type: "FAIR_SUBJECT_SPREAD",
      strength: "SOFT",
      valueInt: null,
      weight: 2,

      teacherIds: [],
      subjectIds: [],
      classIds: [],
      dayIds: [],
      periodIds: [],
      slots: [],
    },
  ];

  const problem: GenerationProblem = {
    projectId:
      "TIMETABLE_V3_HIGH_SCHOOL_420",

    days:
      DAYS,

    periods:
      PERIODS,

    teachers,

    classes,

    subjects,

    assignments,

    constraints,
  };

  const requiredSessions =
    assignments.reduce(
      (sum, assignment) =>
        sum +
        assignment.assignedLessons,
      0,
    );

  if (classes.length !== 12) {
    throw new Error(
      `BENCHMARK_CLASS_COUNT:${classes.length}`,
    );
  }

  if (requiredSessions !== 420) {
    throw new Error(
      `BENCHMARK_REQUIRED_SESSIONS:${requiredSessions}`,
    );
  }

  return problem;
}

export function getHighSchool420BenchmarkSummary() {
  return {
    id:
      "timetable-v3-high-school-420",

    label:
      "Timetable V3 High School Benchmark",

    stages:
      3,

    classes:
      12,

    teachers:
      40,

    subjects:
      11,

    days:
      5,

    periodsPerDay:
      7,

    assignments:
      132,

    requiredSessions:
      420,

    constraints:
      14,
  };
}