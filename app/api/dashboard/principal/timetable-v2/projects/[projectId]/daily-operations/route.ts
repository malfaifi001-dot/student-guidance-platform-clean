import {
  NextResponse,
} from "next/server";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  getPublishedTimetableV2Sessions,
} from "@/lib/timetable-v2/daily-operations/daily-operations-adapter";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(
  request: Request,
  context: Context,
) {
  const access =
    await requireTimetableApiAccess({
      requireActiveSubscription:
        true,
    });

  if (!access.ok) {
    return access.response;
  }

  const {
    projectId,
  } =
    await context.params;

  try {
    const url =
      new URL(
        request.url,
      );

    const dayId =
      url.searchParams.get(
        "dayId",
      );

    const teacherId =
      url.searchParams.get(
        "teacherId",
      );

    const data =
      await getPublishedTimetableV2Sessions(
        projectId,
        access.schoolAccountId!,
      );

    const sessions =
      data.sessions.filter(
        (session) => {
          if (
            dayId &&
            session.dayId !==
              dayId
          ) {
            return false;
          }

          if (
            teacherId &&
            session.teacherId !==
              teacherId
          ) {
            return false;
          }

          return true;
        },
      );

    const teachers =
      Array.from(
        new Map(
          data.sessions.map(
            (session) => [
              session.teacherId,
              {
                id:
                  session.teacherId,

                name:
                  session.teacherName,
              },
            ],
          ),
        ).values(),
      ).sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "ar",
          ),
      );

    const days =
      Array.from(
        new Map(
          data.sessions.map(
            (session) => [
              session.dayId,
              {
                id:
                  session.dayId,

                label:
                  session.dayLabel,
              },
            ],
          ),
        ).values(),
      );

    return NextResponse.json({
      success:
        true,

      project:
        data.project,

      teachers,

      days,

      sessions:
        sessions.sort(
          (
            first,
            second,
          ) =>
            first.periodOrder -
            second.periodOrder,
        ),
    });
  }
  catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "";

    if (
      code ===
      "TIMETABLE_NOT_PUBLISHED"
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "لا يوجد جدول منشور جاهز للتشغيل اليومي.",
        },
        {
          status:
            409,
        },
      );
    }

    if (
      code ===
      "TIMETABLE_PROJECT_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "مشروع الجدول غير موجود.",
        },
        {
          status:
            404,
        },
      );
    }

    return NextResponse.json(
      {
        success:
          false,

        error:
          "تعذر تحميل التشغيل اليومي.",
      },
      {
        status:
          500,
      },
    );
  }
}