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

export const TIMETABLE_V3_SECTION_NAMES = [
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
] as const;

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

export function buildTimetableV3GradeClasses(
  gradeName: string,
  count: number,
) {
  return Array.from(
    {
      length:
        Math.max(
          0,
          count,
        ),
    },
    (
      _,
      index,
    ) => {
      const section =
        TIMETABLE_V3_SECTION_NAMES[
          index
        ] ??
        String(
          index + 1,
        );

      return `${gradeName} ${section}`;
    },
  );
}