import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  analyzeTimetableV2Readiness,
} from "@/lib/timetable-v2/readiness-analysis";

import {
  getReadinessBlockers,
  groupReadinessIssues,
} from "@/lib/timetable-v2/readiness-groups";

import {
  getTimetableV2GenerationWorkspace,
} from "@/lib/timetable-v2/generation/generation-service";

import {
  getTimetableV2Stage,
  readTimetableLegacyWeeklyPeriodTarget,
  readTimetableStageWeeklyPeriodTargets,
} from "@/lib/timetable-v2/project-setup";

import type {
  TimetableV2StageId,
} from "@/lib/timetable-v2/project-setup";

import type {
  ProjectDashboardData,
} from "@/lib/timetable-v2/project-dashboard-types";

function readTimetableV2Settings(
  value: unknown,
): {
  stageIds: string[];
  teacherTarget: number | null;
  weeklyPeriodTarget: number | null;
  stageWeeklyPeriodTargets: ReturnType<
    typeof readTimetableStageWeeklyPeriodTargets
  >;
} {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return {
      stageIds: [],
      teacherTarget: null,
      weeklyPeriodTarget: null,
      stageWeeklyPeriodTargets: {},
    };
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  const timetableV2 =
    record.timetableV2;

  if (
    !timetableV2 ||
    typeof timetableV2 !==
      "object" ||
    Array.isArray(timetableV2)
  ) {
    return {
      stageIds: [],
      teacherTarget: null,
      weeklyPeriodTarget: null,
      stageWeeklyPeriodTargets: {},
    };
  }

  const settings =
    timetableV2 as Record<
      string,
      unknown
    >;

  return {
    stageIds: Array.isArray(
      settings.stageIds,
    )
      ? (settings.stageIds as string[])
      : [],

    teacherTarget:
      typeof settings.teacherTarget ===
        "number"
        ? settings.teacherTarget
        : null,

    weeklyPeriodTarget:
      readTimetableLegacyWeeklyPeriodTarget(value),

    stageWeeklyPeriodTargets:
      readTimetableStageWeeklyPeriodTargets(value),
  };
}

function stageLabels(
  stageIds: string[],
): string[] {
  return stageIds.flatMap(
    (stageId) => {
      const stage =
        getTimetableV2Stage(
          stageId as TimetableV2StageId,
        );

      return stage
        ? [stage.shortName]
        : [];
    },
  );
}

export async function getTimetableV2ProjectDashboard(
  projectId: string,
  schoolAccountId: string,
): Promise<ProjectDashboardData> {
  const [
    readiness,
    generation,
    teacherCapacity,
    settingsProject,
  ] = await Promise.all([
    analyzeTimetableV2Readiness(
      projectId,
      schoolAccountId,
    ),

    getTimetableV2GenerationWorkspace(
      projectId,
      schoolAccountId,
    ),

    prisma.timetableTeacher.aggregate({
      where: {
        projectId,
        isActive: true,
      },

      _sum: {
        maxWeeklyLoad: true,
      },
    }),

    prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },

      select: {
        id: true,
        settingsJson: true,
      },
    }),
  ]);

  const project =
    readiness.project;

  const summary =
    readiness.summary;

  const settings =
    readTimetableV2Settings(
      settingsProject?.settingsJson,
    );

  const groups =
    groupReadinessIssues(
      readiness.issues,
      projectId,
    );

  const blockers =
    getReadinessBlockers(
      groups,
      3,
    ).map((group) => ({
      code: group.code,

      severity:
        group.severity,

      title:
        group.title,

      blockerPhrase:
        group.blockerPhrase,

      href:
        group.primaryHref,
    }));

  const current =
    generation.current;

  const scheduleCurrent =
    current
      ? {
          id:
            current.id,

          version:
            current.version,

          status:
            current.status,

          score:
            current.score,

          completeness:
            current.completeness,

          hardViolations:
            current.hardViolations,

          entriesCount:
            current.entries
              .length,

          generatedAt:
            current.generatedAt.toISOString(),
        }
      : null;

  return {
    project: {
      id: project.id,

      name: project.name,

      academicYear:
        project.academicYear,

      semester:
        project.semester,

      status:
        project.status,
    },

    setup: {
      stageLabels:
        stageLabels(
          settings.stageIds,
        ),

      teacherTarget:
        settings.teacherTarget,

      weeklyPeriodTarget:
        settings.weeklyPeriodTarget,

      stageWeeklyPeriodTargets:
        settings.stageWeeklyPeriodTargets,

      hasDays:
        summary.daysCount > 0,

      hasTeachingPeriods:
        summary.teachingPeriodsCount >
        0,
    },

    time: {
      daysCount:
        summary.daysCount,

      periodsPerDay:
        summary.teachingPeriodsCount,

      breaksCount:
        summary.breaksCount,

      weeklySlotCount:
        summary.weeklySlotCount,
    },

    counts: {
      teachersCount:
        summary.teachersCount,

      classesCount:
        summary.classesCount,

      subjectsCount:
        summary.subjectsCount,

      classSubjectsCount:
        summary.fullyAssignedRows +
        summary.underAssignedRows +
        summary.overAssignedRows,

      totalWeeklyLessons:
        summary.requiredLessons,

      assignedLessons:
        summary.assignedLessons,

      assignmentsCount:
        summary.assignmentsCount,

      fullyAssignedRows:
        summary.fullyAssignedRows,

      underAssignedRows:
        summary.underAssignedRows,

      overAssignedRows:
        summary.overAssignedRows,

      teacherCapacity:
        teacherCapacity._sum
          .maxWeeklyLoad ?? 0,
    },

    constraints: {
      activeCount:
        summary.constraintsCount,

      hardCount:
        summary.hardConstraintCount,

      softCount:
        summary.softConstraintCount,

      disabledCount:
        summary.disabledConstraints,

      conflictCount:
        summary.hardConflictCount,
    },

    readiness: {
      score:
        readiness.score,

      canGenerate:
        readiness.canGenerate,

      errorCount:
        summary.errorCount,

      warningCount:
        summary.warningCount,

      infoCount:
        summary.infoCount,

      blockers,
    },

    schedule: {
      exists:
        Boolean(current),

      isStale:
        generation.currentIsStale,

      versionsCount:
        generation.versions
          .length,

      current:
        scheduleCurrent,
    },
  };
}
