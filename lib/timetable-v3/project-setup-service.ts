import "server-only";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  TIMETABLE_V3_DAY_OPTIONS,
  type TimetableV3Day,
  type TimetableV3DayId,
  type TimetableV3Period,
  type TimetableV3SetupWorkspace,
  type TimetableV3TeacherInput,
} from "@/lib/timetable-v3/project-setup-types";

import {
  TIMETABLE_V3_STAGES,
  type TimetableV3StageId,
} from "@/lib/timetable-v3/school-setup-catalog";

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function semesterLabel(
  value: "FIRST" | "SECOND",
) {
  return value === "FIRST"
    ? "الفصل الدراسي الأول"
    : "الفصل الدراسي الثاني";
}

function asObject(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function isTimetableV3Project(
  settingsJson: unknown,
) {
  const settings =
    asObject(settingsJson);

  const v3 =
    asObject(settings.timetableV3);

  return v3.version === 3;
}

const TIMETABLE_V3_STAGE_IDS =
  TIMETABLE_V3_STAGES.map(
    (stage) => stage.id,
  );

export function normalizeTimetableV3Stages(
  settingsJson: unknown,
): TimetableV3StageId[] {
  const v3 = asObject(
    asObject(settingsJson).timetableV3,
  );

  const rawStages = Array.isArray(v3.stages)
    ? v3.stages
    : typeof v3.stage === "string"
      ? [v3.stage]
      : TIMETABLE_V3_STAGE_IDS;

  const allowed = new Set<string>(
    TIMETABLE_V3_STAGE_IDS,
  );

  return [
    ...new Set(
      rawStages.filter(
        (stage): stage is TimetableV3StageId =>
          typeof stage === "string" && allowed.has(stage),
      ),
    ),
  ];
}

function normalizeDays(
  value: unknown,
): TimetableV3Day[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed =
    new Set(
      TIMETABLE_V3_DAY_OPTIONS.map(
        (day) => day.id,
      ),
    );

  return value
    .map((item) => {
      const row =
        asObject(item);

      const id =
        typeof row.id === "string"
          ? row.id
          : "";

      if (!allowed.has(id as TimetableV3DayId)) {
        return null;
      }

      return {
        id:
          id as TimetableV3DayId,

        label:
          typeof row.label === "string"
            ? row.label
            : id,

        order:
          typeof row.order === "number"
            ? row.order
            : 0,
      };
    })
    .filter(
      (
        item,
      ): item is TimetableV3Day =>
        Boolean(item),
    )
    .sort(
      (a, b) =>
        a.order -
        b.order,
    );
}

function normalizePeriods(
  value: unknown,
): TimetableV3Period[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const row =
        asObject(item);

      if (
        typeof row.id !== "string" ||
        typeof row.label !== "string"
      ) {
        return null;
      }

      return {
        id:
          row.id,

        label:
          row.label,

        order:
          typeof row.order === "number"
            ? row.order
            : 0,

        isBreak:
          row.isBreak === true,

        startTime:
          typeof row.startTime === "string"
            ? row.startTime
            : null,

        endTime:
          typeof row.endTime === "string"
            ? row.endTime
            : null,
      };
    })
    .filter(
      (
        item,
      ): item is TimetableV3Period =>
        Boolean(item),
    )
    .sort(
      (a, b) =>
        a.order -
        b.order,
    );
}

async function requireProject(
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id:
          projectId,

        schoolAccountId,
      },
    });

  if (
    !project ||
    !isTimetableV3Project(
      project.settingsJson,
    )
  ) {
    throw new Error(
      "PROJECT_NOT_FOUND",
    );
  }

  return project;
}

export async function listTimetableV3Projects(
  schoolAccountId: string,
) {
  const projects =
    await prisma.timetableProject.findMany({
      where: {
        schoolAccountId,
      },

      orderBy: {
        updatedAt:
          "desc",
      },

      include: {
        _count: {
          select: {
            teachers:
              true,

            classes:
              true,

            subjects:
              true,

            assignments:
              true,
          },
        },
        schedules: {
          where: {
            status: "PUBLISHED",
          },
          orderBy: {
            version: "desc",
          },
          take: 1,
          select: {
            id: true,
            version: true,
            status: true,
            _count: {
              select: {
                entries: true,
              },
            },
          },
        },
      },
    });

  return projects
    .filter(
      (project) =>
        isTimetableV3Project(
          project.settingsJson,
        ),
    )
    .map((project) => ({
      id:
        project.id,

      name:
        project.name,

      academicYear:
        project.academicYear,

      semester:
        project.semester,

      status:
        project.status,

      updatedAt:
        project.updatedAt,

      counts:
        project._count,

      publishedSchedule:
        project.schedules[0]
          ? {
              id: project.schedules[0].id,
              version: project.schedules[0].version,
              status: project.schedules[0].status,
              sessions: project.schedules[0]._count.entries,
            }
          : null,
    }));
}

export async function createTimetableV3Project(
  schoolAccountId: string,
  createdById: string,
  input: {
    name: string;
    academicYear: string;
    semester: "FIRST" | "SECOND";
  },
) {
  const name =
    normalizeText(
      input.name,
    );

  const academicYear =
    normalizeText(
      input.academicYear,
    );

  if (!name) {
    throw new Error(
      "PROJECT_NAME_REQUIRED",
    );
  }

  if (!academicYear) {
    throw new Error(
      "ACADEMIC_YEAR_REQUIRED",
    );
  }

  const days =
    TIMETABLE_V3_DAY_OPTIONS.map(
      (day, index) => ({
        id:
          day.id,

        label:
          day.label,

        order:
          index + 1,
      }),
    );

  const periods:
    TimetableV3Period[] =
      Array.from(
        {
          length: 7,
        },
        (_, index) => ({
          id:
            `PERIOD_${index + 1}`,

          label:
            `الحصة ${index + 1}`,

          order:
            index + 1,

          isBreak:
            false,

          startTime:
            null,

          endTime:
            null,
        }),
      );

  return prisma.timetableProject.create({
    data: {
      schoolAccountId,
      createdById,

      name,
      academicYear,

      semester:
        semesterLabel(
          input.semester,
        ),

      daysJson:
        days as Prisma.InputJsonValue,

      periodsJson:
        periods as Prisma.InputJsonValue,

      settingsJson: {
        timetableV3: {
          version:
            3,

          semesterId:
            input.semester,

          setupVersion:
            1,
        },
      } as Prisma.InputJsonValue,
    },

    select: {
      id:
        true,

      name:
        true,
    },
  });
}

export async function getTimetableV3SetupWorkspace(
  projectId: string,
  schoolAccountId: string,
): Promise<TimetableV3SetupWorkspace> {
  const project =
    await requireProject(
      projectId,
      schoolAccountId,
    );

  const [
    classes,
    subjects,
    teachers,
  ] = await Promise.all([
    prisma.timetableClass.findMany({
      where: {
        projectId,
        isActive:
          true,
      },

      orderBy: {
        createdAt:
          "asc",
      },

      select: {
        id:
          true,

        name:
          true,
      },
    }),

    prisma.timetableSubject.findMany({
      where: {
        projectId,
        isActive:
          true,
      },

      orderBy: {
        name:
          "asc",
      },

      select: {
        id:
          true,

        name:
          true,
      },
    }),

    prisma.timetableTeacher.findMany({
      where: {
        projectId,
        isActive:
          true,
      },

      orderBy: {
        createdAt:
          "asc",
      },

      select: {
        id:
          true,

        name:
          true,

        specialty:
          true,

        maxWeeklyLoad:
          true,
      },
    }),
  ]);

  return {
    project: {
      id:
        project.id,

      name:
        project.name,

      academicYear:
        project.academicYear,

      semester:
        project.semester,

      stages:
        normalizeTimetableV3Stages(
          project.settingsJson,
        ),
    },

    days:
      normalizeDays(
        project.daysJson,
      ),

    periods:
      normalizePeriods(
        project.periodsJson,
      ),

    classes,

    subjects,

    teachers:
      teachers.map(
        (teacher) => ({
          id:
            teacher.id,

          name:
            teacher.name,

          specialty:
            teacher.specialty ??
            "",

          maxWeeklyLoad:
            teacher.maxWeeklyLoad,
        }),
      ),
  };
}

export async function saveTimetableV3Stages(
  projectId: string,
  schoolAccountId: string,
  stages: TimetableV3StageId[],
) {
  const project = await requireProject(
    projectId,
    schoolAccountId,
  );

  const allowed = new Set<string>(
    TIMETABLE_V3_STAGE_IDS,
  );
  const unique = [...new Set(stages)];

  if (unique.length < 1) {
    throw new Error("STAGES_REQUIRED");
  }

  if (unique.some((stage) => !allowed.has(stage))) {
    throw new Error("INVALID_STAGE");
  }

  const settings = asObject(project.settingsJson);
  const timetableV3 = asObject(settings.timetableV3);

  await prisma.timetableProject.update({
    where: { id: projectId },
    data: {
      settingsJson: {
        ...settings,
        timetableV3: {
          ...timetableV3,
          stages: unique,
        },
      } as Prisma.InputJsonValue,
    },
  });
}

export async function saveTimetableV3Days(
  projectId: string,
  schoolAccountId: string,
  dayIds: TimetableV3DayId[],
) {
  await requireProject(
    projectId,
    schoolAccountId,
  );

  const unique =
    [...new Set(dayIds)];

  if (
    unique.length <
    1
  ) {
    throw new Error(
      "DAYS_REQUIRED",
    );
  }

  const days =
    unique.map(
      (dayId, index) => {
        const definition =
          TIMETABLE_V3_DAY_OPTIONS.find(
            (day) =>
              day.id ===
              dayId,
          );

        if (!definition) {
          throw new Error(
            "INVALID_DAY",
          );
        }

        return {
          id:
            definition.id,

          label:
            definition.label,

          order:
            index + 1,
        };
      },
    );

  await prisma.timetableProject.update({
    where: {
      id:
        projectId,
    },

    data: {
      daysJson:
        days as Prisma.InputJsonValue,
    },
  });
}

export async function saveTimetableV3Periods(
  projectId: string,
  schoolAccountId: string,
  periods: Array<{
    label: string;
    startTime?: string | null;
    endTime?: string | null;
    isBreak?: boolean;
  }>,
) {
  await requireProject(
    projectId,
    schoolAccountId,
  );

  if (
    periods.length <
      1 ||
    periods.length >
      12
  ) {
    throw new Error(
      "INVALID_PERIOD_COUNT",
    );
  }

  const normalized =
    periods.map(
      (period, index) => {
        const label =
          normalizeText(
            period.label,
          );

        if (!label) {
          throw new Error(
            "PERIOD_LABEL_REQUIRED",
          );
        }

        return {
          id:
            `PERIOD_${index + 1}`,

          label,

          order:
            index + 1,

          isBreak:
            period.isBreak ===
            true,

          startTime:
            period.startTime?.trim() ||
            null,

          endTime:
            period.endTime?.trim() ||
            null,
        };
      },
    );

  await prisma.timetableProject.update({
    where: {
      id:
        projectId,
    },

    data: {
      periodsJson:
        normalized as Prisma.InputJsonValue,
    },
  });
}

export async function saveTimetableV3Classes(
  projectId: string,
  schoolAccountId: string,
  names: string[],
) {
  await requireProject(
    projectId,
    schoolAccountId,
  );

  const normalized =
    [...new Set(
      names
        .map(
          normalizeText,
        )
        .filter(
          Boolean,
        ),
    )];

  if (
    normalized.length <
    1
  ) {
    throw new Error(
      "CLASSES_REQUIRED",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const existing =
        await tx.timetableClass.findMany({
          where: {
            projectId,
          },
        });

      const wanted =
        new Set(
          normalized,
        );

      for (
        const item of
        existing
      ) {
        if (
          wanted.has(
            item.name,
          )
        ) {
          await tx.timetableClass.update({
            where: {
              id:
                item.id,
            },

            data: {
              isActive:
                true,
            },
          });

          wanted.delete(
            item.name,
          );
        }
        else if (
          item.isActive
        ) {
          await tx.timetableClass.update({
            where: {
              id:
                item.id,
            },

            data: {
              isActive:
                false,
            },
          });
        }
      }

      for (
        const name of
        wanted
      ) {
        await tx.timetableClass.create({
          data: {
            projectId,
            name,
          },
        });
      }
    },
  );
}

export async function saveTimetableV3Subjects(
  projectId: string,
  schoolAccountId: string,
  names: string[],
) {
  await requireProject(
    projectId,
    schoolAccountId,
  );

  const normalized =
    [...new Set(
      names
        .map(
          normalizeText,
        )
        .filter(
          Boolean,
        ),
    )];

  if (
    normalized.length <
    1
  ) {
    throw new Error(
      "SUBJECTS_REQUIRED",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const existing =
        await tx.timetableSubject.findMany({
          where: {
            projectId,
          },
        });

      const wanted =
        new Set(
          normalized,
        );

      for (
        const item of
        existing
      ) {
        if (
          wanted.has(
            item.name,
          )
        ) {
          await tx.timetableSubject.update({
            where: {
              id:
                item.id,
            },

            data: {
              isActive:
                true,
            },
          });

          wanted.delete(
            item.name,
          );
        }
        else if (
          item.isActive
        ) {
          await tx.timetableSubject.update({
            where: {
              id:
                item.id,
            },

            data: {
              isActive:
                false,
            },
          });
        }
      }

      for (
        const name of
        wanted
      ) {
        await tx.timetableSubject.create({
          data: {
            projectId,
            name,
          },
        });
      }
    },
  );
}

export async function saveTimetableV3Teachers(
  projectId: string,
  schoolAccountId: string,
  rows: TimetableV3TeacherInput[],
) {
  await requireProject(
    projectId,
    schoolAccountId,
  );

  const normalized =
    rows
      .map(
        (row) => ({
          name:
            normalizeText(
              row.name,
            ),

          specialty:
            normalizeText(
              row.specialty,
            ),

          maxWeeklyLoad:
            row.maxWeeklyLoad,
        }),
      )
      .filter(
        (row) =>
          Boolean(
            row.name,
          ),
      );

  if (
    normalized.length <
    1
  ) {
    throw new Error(
      "TEACHERS_REQUIRED",
    );
  }

  const nameSet =
    new Set<string>();

  for (
    const teacher of
    normalized
  ) {
    if (
      nameSet.has(
        teacher.name,
      )
    ) {
      throw new Error(
        "DUPLICATE_TEACHER_NAME",
      );
    }

    nameSet.add(
      teacher.name,
    );

    if (
      !Number.isInteger(
        teacher.maxWeeklyLoad,
      ) ||
      teacher.maxWeeklyLoad <
        1 ||
      teacher.maxWeeklyLoad >
        60
    ) {
      throw new Error(
        "INVALID_TEACHER_LOAD",
      );
    }
  }

  await prisma.$transaction(
    async (tx) => {
      const existing =
        await tx.timetableTeacher.findMany({
          where: {
            projectId,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        });

      const matchedIds =
        new Set<string>();

      for (
        const teacher of
        normalized
      ) {
        const match =
          existing.find(
            (item) =>
              !matchedIds.has(
                item.id,
              ) &&
              item.name ===
                teacher.name,
          );

        if (match) {
          matchedIds.add(
            match.id,
          );

          await tx.timetableTeacher.update({
            where: {
              id:
                match.id,
            },

            data: {
              name:
                teacher.name,

              specialty:
                teacher.specialty ||
                null,

              maxWeeklyLoad:
                teacher.maxWeeklyLoad,

              isActive:
                true,
            },
          });
        }
        else {
          const created =
            await tx.timetableTeacher.create({
              data: {
                projectId,

                name:
                  teacher.name,

                specialty:
                  teacher.specialty ||
                  null,

                maxWeeklyLoad:
                  teacher.maxWeeklyLoad,
              },
            });

          matchedIds.add(
            created.id,
          );
        }
      }

      const removedIds =
        existing
          .filter(
            (item) =>
              !matchedIds.has(
                item.id,
              ),
          )
          .map(
            (item) =>
              item.id,
          );

      if (
        removedIds.length >
        0
      ) {
        await tx.timetableTeacher.updateMany({
          where: {
            projectId,

            id: {
              in:
                removedIds,
            },
          },

          data: {
            isActive:
              false,
          },
        });
      }
    },
  );
}
