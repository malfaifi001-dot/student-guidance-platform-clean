import {
  getTimetableV2Grade,
  type TimetableV2GradeSetup,
} from "./project-setup";

import {
  findTimetableV2CurriculumPlans,
  getTimetableV2DefaultCurriculumPlan,
  type TimetableV2CurriculumPlan,
  type TimetableV2CurriculumTrackId,
  type TimetableV2SemesterId,
} from "./curriculum-catalog";

export type TimetableV2GradeCurriculumSelection = {
  gradeId: string;

  planSourceId: string | null;

  trackId: TimetableV2CurriculumTrackId | null;

  semesterId: TimetableV2SemesterId | null;

  status:
    | "AUTO_SELECTED"
    | "NEEDS_SELECTION"
    | "NO_PLAN";
};

export function createTimetableV2InitialCurriculumSelections(
  grades: TimetableV2GradeSetup[],
  semesterId?: TimetableV2SemesterId | null,
): TimetableV2GradeCurriculumSelection[] {
  return grades.map((gradeSetup) => {
    const grade =
      getTimetableV2Grade(
        gradeSetup.gradeId,
      );

    if (!grade) {
      return {
        gradeId: gradeSetup.gradeId,
        planSourceId: null,
        trackId: null,
        semesterId: null,
        status: "NO_PLAN",
      };
    }

    const plans =
      findTimetableV2CurriculumPlans({
        gradeId: grade.id,
      });

    if (plans.length === 0) {
      return {
        gradeId: grade.id,
        planSourceId: null,
        trackId: null,
        semesterId: null,
        status: "NO_PLAN",
      };
    }

    const defaultPlan =
      getTimetableV2DefaultCurriculumPlan(
        grade.id,
        grade.stageId === "HIGH"
          ? semesterId
          : null,
      );

    if (defaultPlan) {
      return {
        gradeId: grade.id,
        planSourceId:
          defaultPlan.sourceId,
        trackId: defaultPlan.trackId,
        semesterId:
          defaultPlan.semesterId,
        status: "AUTO_SELECTED",
      };
    }

    return {
      gradeId: grade.id,
      planSourceId: null,
      trackId: null,
      semesterId:
        grade.stageId === "HIGH"
          ? semesterId ?? null
          : null,
      status: "NEEDS_SELECTION",
    };
  });
}

export function calculateTimetableV2PlanDemand(
  plan: TimetableV2CurriculumPlan,
  sectionCount: number,
) {
  const safeSectionCount = Math.max(
    0,
    Math.floor(sectionCount),
  );

  return {
    sectionCount: safeSectionCount,

    weeklyPeriodsPerSection:
      plan.totalWeeklyPeriods,

    totalWeeklyPeriods:
      plan.totalWeeklyPeriods *
      safeSectionCount,

    subjects: plan.subjects.map(
      (subject) => ({
        ...subject,

        totalWeeklyPeriods:
          subject.weeklyPeriods *
          safeSectionCount,
      }),
    ),
  };
}