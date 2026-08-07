import {
  prisma,
} from "@/lib/prisma";

type PublishedSession = {
  id: string;
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
  isLocked?: boolean;
};

function normalizeRecord(
  value: unknown,
) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : {};
}

function normalizeSessions(
  value: unknown,
): PublishedSession[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (
        item,
      ): PublishedSession | null => {
        const row =
          normalizeRecord(item);

        const required = [
          "id",
          "teacherId",
          "teacherName",
          "classId",
          "className",
          "subjectId",
          "subjectName",
          "dayId",
          "dayLabel",
          "periodId",
          "periodLabel",
        ];

        for (
          const key of
          required
        ) {
          if (
            typeof row[key] !==
            "string" ||
            !String(
              row[key],
            ).trim()
          ) {
            return null;
          }
        }

        return {
          id:
            String(
              row.id,
            ),

          teacherId:
            String(
              row.teacherId,
            ),

          teacherName:
            String(
              row.teacherName,
            ),

          classId:
            String(
              row.classId,
            ),

          className:
            String(
              row.className,
            ),

          subjectId:
            String(
              row.subjectId,
            ),

          subjectName:
            String(
              row.subjectName,
            ),

          dayId:
            String(
              row.dayId,
            ),

          dayLabel:
            String(
              row.dayLabel,
            ),

          periodId:
            String(
              row.periodId,
            ),

          periodLabel:
            String(
              row.periodLabel,
            ),

          periodOrder:
            typeof row.periodOrder ===
              "number"
              ? row.periodOrder
              : 0,

          isLocked:
            row.isLocked ===
            true,
        };
      },
    )
    .filter(
      (
        item,
      ): item is PublishedSession =>
        item !== null,
    );
}

export async function getPublishedTimetableV2Sessions(
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

      select: {
        id: true,
        name: true,
        status: true,
        settingsJson: true,
      },
    });

  if (!project) {
    throw new Error(
      "TIMETABLE_PROJECT_NOT_FOUND",
    );
  }

  const settings =
    normalizeRecord(
      project.settingsJson,
    );

  const sessions =
    normalizeSessions(
      settings.generatedSchedule,
    );

  if (
    project.status !==
      "PUBLISHED" ||
    sessions.length ===
      0
  ) {
    throw new Error(
      "TIMETABLE_NOT_PUBLISHED",
    );
  }

  return {
    project: {
      id:
        project.id,

      name:
        project.name,

      status:
        project.status,
    },

    sessions,
  };
}