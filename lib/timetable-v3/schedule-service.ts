import "server-only";

import { prisma } from "@/lib/prisma";
import {
  approveTimetableV2Schedule,
  loadTimetableV2GenerationProblemForSolver,
  publishTimetableV2Schedule,
} from "@/lib/timetable-v2/generation/generation-service";
import { validateGeneratedTimetableV2 } from "@/lib/timetable-v2/generation/generation-validator";
import type { GeneratedSession } from "@/lib/timetable-v2/generation/generation-domain";
import {
  normalizeTimetableV3ClassMappings,
  normalizeTimetableV3Stages,
  reconcileTimetableV3ClassMappings,
} from "@/lib/timetable-v3/project-setup-service";
import {
  resolveTimetableV3ClassClassification,
  TIMETABLE_V3_STAGES,
} from "@/lib/timetable-v3/school-setup-catalog";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isV3(settingsJson: unknown) {
  return record(record(settingsJson).timetableV3).version === 3;
}

async function requireV3Project(projectId: string, schoolAccountId: string) {
  const project = await prisma.timetableProject.findFirst({
    where: { id: projectId, schoolAccountId },
    include: {
      schoolAccount: {
        select: {
          name: true,
          profile: { select: { schoolName: true } },
        },
      },
    },
  });

  if (!project || !isV3(project.settingsJson)) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  return project;
}

const scheduleSelect = {
  id: true,
  version: true,
  status: true,
  isCurrent: true,
  score: true,
  completeness: true,
  hardViolations: true,
  softPenalty: true,
  durationMs: true,
  engineVersion: true,
  dataFingerprint: true,
  generatedAt: true,
  createdAt: true,
  _count: { select: { entries: true } },
} as const;

function scheduleSummary(schedule: {
  id: string;
  version: number;
  status: string;
  isCurrent: boolean;
  score: number;
  completeness: number;
  hardViolations: number;
  softPenalty: number;
  durationMs: number;
  engineVersion: string;
  dataFingerprint: string;
  generatedAt: Date;
  createdAt: Date;
  _count: { entries: number };
}, fingerprint: string) {
  return {
    id: schedule.id,
    version: schedule.version,
    status: schedule.status,
    isCurrent: schedule.isCurrent,
    score: schedule.score,
    completeness: schedule.completeness,
    hardViolations: schedule.hardViolations,
    softPenalty: schedule.softPenalty,
    durationMs: schedule.durationMs,
    engine: schedule.engineVersion,
    generatedAt: schedule.generatedAt.toISOString(),
    createdAt: schedule.createdAt.toISOString(),
    sessions: schedule._count.entries,
    fingerprint: schedule.dataFingerprint,
    isFresh: schedule.dataFingerprint === fingerprint,
  };
}

export async function getTimetableV3Versions(
  projectId: string,
  schoolAccountId: string,
) {
  const [project, loaded, schedules, teachers] = await Promise.all([
    requireV3Project(projectId, schoolAccountId),
    loadTimetableV2GenerationProblemForSolver(projectId, schoolAccountId),
    prisma.timetableSchedule.findMany({
      where: { projectId },
      orderBy: [{ version: "desc" }, { generatedAt: "desc" }],
      select: scheduleSelect,
    }),
    prisma.timetableTeacher.findMany({
      where: { projectId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, specialty: true },
    }),
  ]);

  const versions = schedules.map((schedule) =>
    scheduleSummary(schedule, loaded.fingerprint),
  );
  const mappings = await reconcileTimetableV3ClassMappings(projectId);
  const setupClasses = await prisma.timetableClass.findMany({
    where: { projectId, isActive: true },
    select: { id: true, name: true },
  });
  const classifications = setupClasses
    .map((item) => resolveTimetableV3ClassClassification(item.id, item.name, mappings))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const stageIds = new Set(classifications.map((item) => item.stageId));
  const gradeIds = new Set(classifications.map((item) => item.gradeId));
  const printStageOptions = TIMETABLE_V3_STAGES
    .filter((stage) => stageIds.has(stage.id))
    .map((stage) => ({ id: stage.id, label: stage.name }));
  const printGradeOptions = TIMETABLE_V3_STAGES
    .flatMap((stage) => stage.grades)
    .filter((grade) => gradeIds.has(grade.id))
    .map((grade) => ({ id: grade.id, label: grade.name }));

  return {
    project: {
      id: project.id,
      name: project.name,
      academicYear: project.academicYear,
      semester: project.semester,
      schoolName: project.schoolAccount.profile?.schoolName ?? project.schoolAccount.name,
    },
    current: versions.find((version) => version.isCurrent) ?? versions[0] ?? null,
    versions,
    teachers,
    printScopes: {
      stage: {
        available: printStageOptions.length > 0,
        reason: "لا توجد بيانات مرحلة مرتبطة بالفصول داخل نموذج الجدول الحالي.",
        options: printStageOptions,
      },
      grade: {
        available: printGradeOptions.length > 0,
        reason: "لا توجد بيانات صف منظمة مرتبطة بالفصول، لذلك لن يتم استنتاجها من أسماء الفصول.",
        options: printGradeOptions,
      },
    },
  };
}

export async function getTimetableV3CurrentSchedule(
  projectId: string,
  schoolAccountId: string,
) {
  await requireV3Project(projectId, schoolAccountId);

  const current = await prisma.timetableSchedule.findFirst({
    where: { projectId, isCurrent: true },
    orderBy: { version: "desc" },
    select: scheduleSelect,
  }) ?? await prisma.timetableSchedule.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    select: scheduleSelect,
  });

  if (!current) return null;

  return {
    id: current.id,
    version: current.version,
    status: current.status,
    generatedAt: current.generatedAt.toISOString(),
    sessions: current._count.entries,
  };
}

export async function getTimetableV3PublishedScheduleSummary(
  projectId: string,
  schoolAccountId: string,
) {
  await requireV3Project(projectId, schoolAccountId);

  const schedule = await prisma.timetableSchedule.findFirst({
    where: {
      projectId,
      status: "PUBLISHED",
    },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      _count: { select: { entries: true } },
    },
  });

  return schedule
    ? {
        id: schedule.id,
        version: schedule.version,
        status: schedule.status,
        sessions: schedule._count.entries,
      }
    : null;
}

export async function getTimetableV3PublishCandidate(
  projectId: string,
  schoolAccountId: string,
) {
  await requireV3Project(projectId, schoolAccountId);

  const schedule = await prisma.timetableSchedule.findFirst({
    where: { projectId, isCurrent: true },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      generatedAt: true,
      completeness: true,
      hardViolations: true,
      _count: { select: { entries: true } },
    },
  }) ?? await prisma.timetableSchedule.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      generatedAt: true,
      completeness: true,
      hardViolations: true,
      _count: { select: { entries: true } },
    },
  });

  if (!schedule) return null;

  const validation = await validateTimetableV3Schedule(
    projectId,
    schoolAccountId,
    schedule.id,
  );

  return {
    id: schedule.id,
    version: schedule.version,
    status: schedule.status,
    generatedAt: schedule.generatedAt.toISOString(),
    sessions: schedule._count.entries,
    completeness: schedule.completeness,
    hardViolations: schedule.hardViolations,
    isFresh: validation.ok ? validation.freshness.fresh : false,
    valid: validation.ok && validation.validation.valid,
  };
}

export async function publishTimetableV3Schedule(
  projectId: string,
  scheduleId: string,
  schoolAccountId: string,
) {
  const validation = await validateTimetableV3Schedule(
    projectId,
    schoolAccountId,
    scheduleId,
  );

  if (!validation.ok || !validation.validation.valid || !validation.freshness.fresh) {
    throw new Error("SCHEDULE_VALIDATION_FAILED");
  }

  if (validation.schedule.status !== "APPROVED" && validation.schedule.status !== "PUBLISHED") {
    await approveTimetableV2Schedule(projectId, scheduleId, schoolAccountId);
  }

  return publishTimetableV2Schedule(
    projectId,
    scheduleId,
    schoolAccountId,
  );
}

export async function deleteTimetableV3Schedule(
  projectId: string,
  scheduleId: string,
  schoolAccountId: string,
) {
  await requireV3Project(projectId, schoolAccountId);
  const schedule = await prisma.timetableSchedule.findFirst({
    where: { id: scheduleId, projectId },
    select: { id: true, status: true, entries: { select: { id: true } } },
  });
  if (!schedule) throw new Error("SCHEDULE_NOT_FOUND");
  if (schedule.status === "PUBLISHED") throw new Error("PUBLISHED_SCHEDULE_DELETE_BLOCKED");

  const entryIds = schedule.entries.map((entry) => entry.id);
  if (entryIds.length > 0) {
    const operationalReference = await prisma.timetableSubstitution.count({
      where: { projectId, originalSessionId: { in: entryIds } },
    });
    if (operationalReference > 0) throw new Error("SCHEDULE_IN_USE");
  }

  await prisma.timetableSchedule.delete({ where: { id: schedule.id } });
  return { id: schedule.id };
}

async function loadSchedule(
  projectId: string,
  schoolAccountId: string,
  scheduleId?: string,
) {
  await requireV3Project(projectId, schoolAccountId);

  const schedule = await prisma.timetableSchedule.findFirst({
    where: {
      projectId,
      ...(scheduleId ? { id: scheduleId } : { isCurrent: true }),
    },
    orderBy: { version: "desc" },
    include: {
      entries: { orderBy: [{ dayId: "asc" }, { periodOrder: "asc" }, { className: "asc" }] },
    },
  });

  if (!schedule && !scheduleId) {
    return prisma.timetableSchedule.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
      include: {
        entries: { orderBy: [{ dayId: "asc" }, { periodOrder: "asc" }, { className: "asc" }] },
      },
    });
  }

  if (!schedule && scheduleId) {
    throw new Error("SCHEDULE_NOT_FOUND");
  }

  return schedule;
}

type PersistedEntry = {
  id: string;
  assignmentId: string | null;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  dayId: string;
  dayLabel: string;
  periodId: string;
  periodLabel: string;
  periodOrder: number;
  isLocked: boolean;
  source: string;
  placementScore: number;
  metadataJson: unknown;
};

function entrySessions(entries: PersistedEntry[]): GeneratedSession[] {
  return entries.map((entry) => {
    const metadata = record(entry.metadataJson);
    return {
      temporaryId: entry.id,
      blockId: typeof metadata.blockId === "string" ? metadata.blockId : entry.id,
      blockIndex: typeof metadata.blockIndex === "number" ? metadata.blockIndex : 0,
      blockLength: metadata.blockLength === 2 ? 2 : 1,
      assignmentId: entry.assignmentId ?? `persisted:${entry.id}`,
      teacherId: entry.teacherId,
      teacherName: entry.teacherName,
      classId: entry.classId,
      className: entry.className,
      subjectId: entry.subjectId,
      subjectName: entry.subjectName,
      dayId: entry.dayId,
      dayLabel: entry.dayLabel,
      periodId: entry.periodId,
      periodLabel: entry.periodLabel,
      periodOrder: entry.periodOrder,
      isLocked: entry.isLocked,
      source: entry.source as GeneratedSession["source"],
      placementScore: entry.placementScore,
    };
  });
}

function collisionCount(sessions: GeneratedSession[], target: "teacherId" | "classId") {
  const seen = new Set<string>();
  let collisions = 0;
  for (const session of sessions) {
    const key = `${session[target]}:${session.dayId}:${session.periodId}`;
    if (seen.has(key)) collisions += 1;
    seen.add(key);
  }
  return collisions;
}

export async function validateTimetableV3Schedule(
  projectId: string,
  schoolAccountId: string,
  scheduleId?: string,
) {
  const loaded = await loadTimetableV2GenerationProblemForSolver(projectId, schoolAccountId);
  const schedule = await loadSchedule(projectId, schoolAccountId, scheduleId);

  if (!schedule) {
    return { ok: false as const, code: "NO_GENERATED_SCHEDULE" as const, projectId };
  }

  const sessions = entrySessions(schedule.entries);
  const canonical = validateGeneratedTimetableV2(loaded.problem, sessions);
  const requiredSessions = loaded.problem.assignments.reduce((sum, assignment) => sum + assignment.assignedLessons, 0);
  const generatedSessions = sessions.length;
  const teacherCollisions = collisionCount(sessions, "teacherId");
  const classCollisions = collisionCount(sessions, "classId");
  const missingSessions = Math.max(0, requiredSessions - generatedSessions);
  const valid = canonical.valid && canonical.hardViolationCount === 0 && missingSessions === 0 && teacherCollisions === 0 && classCollisions === 0;

  return {
    ok: true as const,
    projectId,
    schedule: {
      id: schedule.id,
      version: schedule.version,
      status: schedule.status,
      generatedAt: schedule.generatedAt.toISOString(),
      isCurrent: schedule.isCurrent,
    },
    freshness: {
      fresh: schedule.dataFingerprint === loaded.fingerprint,
      scheduleFingerprint: schedule.dataFingerprint,
      currentFingerprint: loaded.fingerprint,
    },
    validation: {
      valid,
      hardViolationCount: canonical.hardViolationCount,
      issues: canonical.issues,
      requiredSessions,
      generatedSessions,
      missingSessions,
      teacherCollisions,
      classCollisions,
    },
  };
}

export async function getTimetableV3PrintData(
  projectId: string,
  scheduleId: string,
  schoolAccountId: string,
) {
  const [project, schedule, loaded] = await Promise.all([
    requireV3Project(projectId, schoolAccountId),
    loadSchedule(projectId, schoolAccountId, scheduleId),
    loadTimetableV2GenerationProblemForSolver(projectId, schoolAccountId),
  ]);
  if (!schedule) throw new Error("SCHEDULE_NOT_FOUND");

  const mappings = await reconcileTimetableV3ClassMappings(projectId);
  return buildScheduleWorkspace(project, schedule, loaded.problem, mappings);
}

function buildScheduleWorkspace(
  project: Awaited<ReturnType<typeof requireV3Project>>,
  schedule: NonNullable<Awaited<ReturnType<typeof loadSchedule>>>,
  problem: Awaited<ReturnType<typeof loadTimetableV2GenerationProblemForSolver>>["problem"],
  mappings = normalizeTimetableV3ClassMappings(project.settingsJson, problem.classes),
) {
  const stages = normalizeTimetableV3Stages(project.settingsJson);
  const classes = problem.classes.map((item) => ({
    ...item,
    classification: resolveTimetableV3ClassClassification(item.id, item.name, mappings),
  }));
  const classifiedClasses = classes.filter((item) => item.classification);
  const stageIds = new Set(classifiedClasses.map((item) => item.classification?.stageId));
  const gradeIds = new Set(classifiedClasses.map((item) => item.classification?.gradeId));
  const stageOptions = TIMETABLE_V3_STAGES
    .filter((stage) => stages.includes(stage.id) && stageIds.has(stage.id))
    .map((stage) => ({ id: stage.id, label: stage.name }));
  const gradeOptions = TIMETABLE_V3_STAGES
    .flatMap((stage) => stage.grades)
    .filter((grade) => gradeIds.has(grade.id))
    .map((grade) => ({ id: grade.id, label: grade.name }));

  return {
    project: {
      id: project.id,
      name: project.name,
      academicYear: project.academicYear,
      semester: project.semester,
      schoolName: project.schoolAccount.profile?.schoolName ?? project.schoolAccount.name,
      stages,
    },
    schedule: {
      id: schedule.id,
      version: schedule.version,
      status: schedule.status,
      generatedAt: schedule.generatedAt.toISOString(),
      engine: schedule.engineVersion,
      score: schedule.score,
      sessions: schedule.entries.length,
    },
    days: problem.days,
    periods: problem.periods,
    classes,
    teachers: problem.teachers,
    subjects: problem.subjects,
    scopes: {
      stage: {
        available: stageOptions.length > 0,
        reason: "مراحل المشروع محفوظة، لكن لا توجد مرحلة منظمة مرتبطة بكل فصل؛ لذلك لن يتم الاستنتاج من اسم الفصل.",
        options: TIMETABLE_V3_STAGES
          .filter((stage) => stages.includes(stage.id))
          .map((stage) => ({ id: stage.id, label: stage.name }))
          .filter((stage) => stageOptions.some((option) => option.id === stage.id)),
      },
      grade: {
        available: gradeOptions.length > 0,
        reason: "لا توجد بيانات صف منظمة مرتبطة بالفصول؛ لذلك لن يتم الاستنتاج من أسماء الفصول.",
        options: gradeOptions,
      },
    },
    entries: schedule.entries.map((entry) => ({
      id: entry.id,
      teacherId: entry.teacherId,
      teacherName: entry.teacherName,
      classId: entry.classId,
      className: entry.className,
      subjectName: entry.subjectName,
      dayId: entry.dayId,
      dayLabel: entry.dayLabel,
      periodId: entry.periodId,
      periodLabel: entry.periodLabel,
      periodOrder: entry.periodOrder,
    })),
  };
}

export async function getTimetableV3PreviewData(
  projectId: string,
  schoolAccountId: string,
  scheduleId?: string,
) {
  const project = await requireV3Project(projectId, schoolAccountId);
  const schedule = await loadSchedule(projectId, schoolAccountId, scheduleId);

  if (!schedule) {
    return {
      project: {
        id: project.id,
        name: project.name,
      },
      schedule: null,
    };
  }

  const loaded = await loadTimetableV2GenerationProblemForSolver(projectId, schoolAccountId);

  const mappings = await reconcileTimetableV3ClassMappings(projectId);
  return buildScheduleWorkspace(project, schedule, loaded.problem, mappings);
}
