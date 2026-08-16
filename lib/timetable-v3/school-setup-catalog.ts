export type TimetableV3StageId =
  | "ELEMENTARY"
  | "MIDDLE"
  | "HIGH";

export type TimetableV3GradeDefinition = {
  id: string;
  stageId: TimetableV3StageId;
  name: string;
};

export type TimetableV3StageDefinition = {
  id: TimetableV3StageId;
  name: string;
  shortName: string;
  grades: TimetableV3GradeDefinition[];
};

export type TimetableV3ClassMapping = {
  stageId: TimetableV3StageId;
  gradeId: string;
  gradeName: string;
};

export type TimetableV3ClassMappings = Record<
  string,
  TimetableV3ClassMapping
>;

export type TimetableV3ClassClassification = TimetableV3ClassMapping & {
  source: "mapping" | "inferred";
};

export const ARABIC_CLASS_SECTION_LETTERS = [
  "أ",
  "ب",
  "ج",
  "د",
  "هـ",
  "و",
  "ز",
  "ح",
  "ط",
  "ي",
  "ك",
  "ل",
  "م",
  "ن",
  "س",
  "ع",
  "ف",
  "ص",
  "ق",
  "ر",
  "ش",
  "ت",
  "ث",
  "خ",
  "ذ",
  "ض",
  "ظ",
  "غ",
] as const;

// Keep the old export as an alias for existing consumers while centralizing
// the complete section sequence in one source of truth.
export const TIMETABLE_V3_SECTION_NAMES =
  ARABIC_CLASS_SECTION_LETTERS;

export const TIMETABLE_V3_STAGES:
  TimetableV3StageDefinition[] = [
    {
      id:
        "ELEMENTARY",

      name:
        "المرحلة الابتدائية",

      shortName:
        "ابتدائي",

      grades: [
        {
          id:
            "ELEMENTARY_1",

          stageId:
            "ELEMENTARY",

          name:
            "أول ابتدائي",
        },
        {
          id:
            "ELEMENTARY_2",

          stageId:
            "ELEMENTARY",

          name:
            "ثاني ابتدائي",
        },
        {
          id:
            "ELEMENTARY_3",

          stageId:
            "ELEMENTARY",

          name:
            "ثالث ابتدائي",
        },
        {
          id:
            "ELEMENTARY_4",

          stageId:
            "ELEMENTARY",

          name:
            "رابع ابتدائي",
        },
        {
          id:
            "ELEMENTARY_5",

          stageId:
            "ELEMENTARY",

          name:
            "خامس ابتدائي",
        },
        {
          id:
            "ELEMENTARY_6",

          stageId:
            "ELEMENTARY",

          name:
            "سادس ابتدائي",
        },
      ],
    },
    {
      id:
        "MIDDLE",

      name:
        "المرحلة المتوسطة",

      shortName:
        "متوسط",

      grades: [
        {
          id:
            "MIDDLE_1",

          stageId:
            "MIDDLE",

          name:
            "أول متوسط",
        },
        {
          id:
            "MIDDLE_2",

          stageId:
            "MIDDLE",

          name:
            "ثاني متوسط",
        },
        {
          id:
            "MIDDLE_3",

          stageId:
            "MIDDLE",

          name:
            "ثالث متوسط",
        },
      ],
    },
    {
      id:
        "HIGH",

      name:
        "المرحلة الثانوية",

      shortName:
        "ثانوي",

      grades: [
        {
          id:
            "HIGH_1",

          stageId:
            "HIGH",

          name:
            "أول ثانوي",
        },
        {
          id:
            "HIGH_2",

          stageId:
            "HIGH",

          name:
            "ثاني ثانوي",
        },
        {
          id:
            "HIGH_3",

          stageId:
            "HIGH",

          name:
            "ثالث ثانوي",
        },
      ],
    },
  ];

export function findTimetableV3Grade(
  stageId: string,
  gradeId: string,
): TimetableV3GradeDefinition | null {
  const stage = TIMETABLE_V3_STAGES.find(
    (item) => item.id === stageId,
  );

  return stage?.grades.find(
    (grade) => grade.id === gradeId,
  ) ?? null;
}

export function inferTimetableV3ClassClassification(
  className: string,
): TimetableV3ClassClassification | null {
  const normalizedName = className.trim();

  for (const stage of TIMETABLE_V3_STAGES) {
    for (const grade of stage.grades) {
      if (
        normalizedName === grade.name ||
        normalizedName.startsWith(`${grade.name} `)
      ) {
        return {
          stageId: stage.id,
          gradeId: grade.id,
          gradeName: grade.name,
          source: "inferred",
        };
      }
    }
  }

  return null;
}

export function resolveTimetableV3ClassClassification(
  classId: string,
  className: string,
  mappings: TimetableV3ClassMappings = {},
): TimetableV3ClassClassification | null {
  const explicit = mappings[classId];
  if (explicit) {
    const grade = findTimetableV3Grade(
      explicit.stageId,
      explicit.gradeId,
    );

    if (grade) {
      return {
        stageId: grade.stageId,
        gradeId: grade.id,
        gradeName: grade.name,
        source: "mapping",
      };
    }
  }

  return inferTimetableV3ClassClassification(className);
}

export function buildTimetableV3GradeClasses(
  gradeName: string,
  count: number,
) {
  return Array.from(
    {
      length:
        Math.max(
          0,
          Math.min(
            count,
            ARABIC_CLASS_SECTION_LETTERS.length,
          ),
        ),
    },
    (
      _,
      index,
    ) => {
      const section =
        ARABIC_CLASS_SECTION_LETTERS[
          index
        ];

      return `${gradeName} ${section}`;
    },
  );
}
