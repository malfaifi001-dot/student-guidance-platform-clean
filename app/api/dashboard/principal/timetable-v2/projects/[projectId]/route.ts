import {
  NextResponse,
} from "next/server";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  deleteTimetableV2Project,
} from "@/lib/timetable-v2/project-delete-service";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function DELETE(
  _request: Request,
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
    const result =
      await deleteTimetableV2Project(
        projectId,
        access.schoolAccountId!,
      );

    return NextResponse.json({
      success: true,
      result,
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V2_PROJECT_DELETE_FAILED",
      {
        projectId,
        error,
      },
    );

    const code =
      error instanceof Error
        ? error.message
        : "";

    if (
      code ===
      "PROJECT_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "مشروع الجدول غير موجود.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      code ===
      "PUBLISHED_PROJECT_CANNOT_BE_DELETED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "لا يمكن حذف جدول منشور مباشرة. ألغِ النشر أو غيّر حالته أولًا.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "تعذر حذف المشروع حاليًا.",
      },
      {
        status: 500,
      },
    );
  }
}