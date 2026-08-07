import {
  TIMETABLE_V2_DAY_LABELS,
  getTimetableV2Grade,
  getTimetableV2Stage,
  type TimetableV2ProjectSetupInput,
  type TimetableV2StageId,
  type TimetableV2StudyDayId,
} from "./project-setup";

import {
  validateTimetableV2ProjectSetup,
} from "./project-validation";

export type TimetableV2BlueprintStage = {
  id: TimetableV2StageId;
  name: string;
};

export type TimetableV2BlueprintDay = {
  id: TimetableV2StudyDayId;
  name: string;
  sortOrder: number;
};

export type TimetableV2BlueprintPeriod = {
  id: string;
  number: number;
  name: string;
};

export type TimetableV2BlueprintClass = {
  gradeId: string;
  stageId: TimetableV2StageId;
  gradeName: string;
  sectionName: string;
  className: string;
  sortOrder: number;
};

export type TimetableV2ProjectBlueprint = {
  name: string;
  academicYear: string;
  semester: string;

  stages: TimetableV2BlueprintStage[];

  teacherCount: number;

  weeklyPeriodTarget: number | null;

  studyDays: TimetableV2BlueprintDay[];

  periods: TimetableV2BlueprintPeriod[];

  classes: TimetableV2BlueprintClass[];

  metrics: {
    stagesCount: number;
    gradesCount: number;
    classesCount: number;
    teacherCount: number;
    studyDaysCount: number;
    periodsPerDay: number;
    availablePeriodsPerClassPerWeek: number;
    totalSchoolClassSlotsPerWeek: number;
  };
};

function normalizeSectionName(
  value: string,
) {
  return value.trim().replace(/\s+/g, " ");
}

export function createTimetableV2ProjectBlueprint(
  input: TimetableV2ProjectSetupInput,
): TimetableV2ProjectBlueprint {
  const normalizedInput: TimetableV2ProjectSetupInput = {
    ...input,
    name: input.name.trim(),
    academicYear: input.academicYear.trim(),
    semester: input.semester.trim(),
    stageIds: [...new Set(input.stageIds)],
    studyDays: [...new Set(input.studyDays)],
    grades: input.grades.map((grade) => ({
      gradeId: grade.gradeId,
      sectionNames: grade.sectionNames.map(
        normalizeSectionName,
      ),
    })),
  };

  const validation =
    validateTimetableV2ProjectSetup(normalizedInput);

  if (!validation.valid) {
    const message = validation.errors
      .map((error) => error.message)
      .join(" ");

    throw new Error(message);
  }

  const stages = normalizedInput.stageIds.map(
    (stageId) => {
      const stage = getTimetableV2Stage(stageId);

      if (!stage) {
        throw new Error(
          `المرحلة غير موجودة: ${stageId}`,
        );
      }

      return {
        id: stage.id,
        name: stage.name,
      };
    },
  );

  const studyDays = normalizedInput.studyDays.map(
    (dayId, index) => ({
      id: dayId,
      name: TIMETABLE_V2_DAY_LABELS[dayId],
      sortOrder: index + 1,
    }),
  );

  const periods = Array.from(
    {
      length: normalizedInput.periodsPerDay,
    },
    (_, index) => ({
      id: `PERIOD_${index + 1}`,
      number: index + 1,
      name: `الحصة ${index + 1}`,
    }),
  );

  let classSortOrder = 0;

  const classes: TimetableV2BlueprintClass[] = [];

  for (const gradeSetup of normalizedInput.grades) {
    const grade = getTimetableV2Grade(
      gradeSetup.gradeId,
    );

    if (!grade) {
      continue;
    }

    for (const sectionName of gradeSetup.sectionNames) {
      classSortOrder += 1;

      classes.push({
        gradeId: grade.id,
        stageId: grade.stageId,
        gradeName: grade.name,
        sectionName,
        className: `${grade.name} ${sectionName}`,
        sortOrder: classSortOrder,
      });
    }
  }

  const gradesCount = new Set(
    classes.map((item) => item.gradeId),
  ).size;

  const availablePeriodsPerClassPerWeek =
    studyDays.length * periods.length;

  return {
    name: normalizedInput.name,
    academicYear: normalizedInput.academicYear,
    semester: normalizedInput.semester,

    stages,

    teacherCount: normalizedInput.teacherCount,

    weeklyPeriodTarget:
      normalizedInput.weeklyPeriodTarget ?? null,

    studyDays,

    periods,

    classes,

    metrics: {
      stagesCount: stages.length,
      gradesCount,
      classesCount: classes.length,
      teacherCount: normalizedInput.teacherCount,
      studyDaysCount: studyDays.length,
      periodsPerDay: periods.length,
      availablePeriodsPerClassPerWeek,
      totalSchoolClassSlotsPerWeek:
        availablePeriodsPerClassPerWeek *
        classes.length,
    },
  };
}