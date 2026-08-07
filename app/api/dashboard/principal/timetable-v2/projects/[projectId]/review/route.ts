import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  getCurrentSessionUser,
} from "@/lib/auth/current-user";

import {
  prisma,
} from "@/lib/prisma";

import {
  getTimetableReviewWorkspace,
  saveTimetableReviewVersion,
} from "@/lib/timetable-v2/review/review-service";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

const editSchema =
  z.discriminatedUnion(
    "type",
    [
      z.object({
        type:
          z.literal(
            "MOVE",
          ),

        entryId:
          z.string().min(1),

        dayId:
          z.string().min(1),

        periodId:
          z.string().min(1),
      }),

      z.object({
        type:
          z.literal(
            "SWAP",
          ),

        firstEntryId:
          z.string().min(1),

        secondEntryId:
          z.string().min(1),
      }),

      z.object({
        type:
          z.literal(
            "LOCK",
          ),

        entryId:
          z.string().min(1),

        isLocked:
          z.boolean(),
      }),
    ],
  );

const saveSchema =
  z.object({
    baseScheduleId:
      z.string().min(1),

    edits:
      z
        .array(
          editSchema,
        )
        .min(1)
        .max(500),
  });

async function resolveAccess(
  projectId: string,
) {
  const current =
    await getCurrentSessionUser();

  if (!current) {
    return {
      error:
        NextResponse.json(
          {
            success:
              false,

            error:
              "غير مصرح.",
          },
          {
            status:
              401,
          },
        ),
    };
  }

  const {
    user,
  } = current;

  const account =
    await prisma.schoolAccount.findFirst({
      where: {
        users: {
          some: {
            id:
              user.id,
          },
        },
      },

      select: {
        id:
          true,
      },
    });

  if (!account) {
    return {
      error:
        NextResponse.json(
          {
            success:
              false,

            error:
              "تعذر تحديد حساب المدرسة.",
          },
          {
            status:
              403,
          },
        ),
    };
  }

  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id:
          projectId,

        schoolAccountId:
          account.id,
      },

      select: {
        id:
          true,
      },
    });

  if (!project) {
    return {
      error:
        NextResponse.json(
          {
            success:
              false,

            error:
              "المشروع غير موجود.",
          },
          {
            status:
              404,
          },
        ),
    };
  }

  return {
    user,
    schoolAccountId:
      account.id,
  };
}

function mapError(
  error: unknown,
) {
  const code =
    error instanceof Error
      ? error.message
      : "";

  if (
    code ===
    "REVIEW_CLASS_COLLISION"
  ) {
    return {
      status:
        409,

      message:
        "لا يمكن حفظ التعديل لأن الفصل لديه حصة أخرى في نفس الوقت.",
    };
  }

  if (
    code ===
    "REVIEW_TEACHER_COLLISION"
  ) {
    return {
      status:
        409,

      message:
        "لا يمكن حفظ التعديل لأن المعلم لديه حصة أخرى في نفس الوقت.",
    };
  }

  if (
    code ===
    "REVIEW_ENTRY_LOCKED"
  ) {
    return {
      status:
        409,

      message:
        "الحصة مقفلة. افتح القفل أولًا قبل نقلها أو تبديلها.",
    };
  }

  if (
    code ===
    "REVIEW_INVALID_SLOT"
  ) {
    return {
      status:
        400,

      message:
        "الخلية الزمنية غير صالحة.",
    };
  }

  if (
    code ===
    "REVIEW_PUBLISHED_SCHEDULE_IMMUTABLE"
  ) {
    return {
      status:
        409,

      message:
        "لا يتم تعديل النسخة المنشورة مباشرة. أنشئ نسخة مراجعة من نسخة غير منشورة.",
    };
  }

  if (
    code ===
      "TIMETABLE_PROJECT_NOT_FOUND" ||
    code ===
      "TIMETABLE_SCHEDULE_NOT_FOUND"
  ) {
    return {
      status:
        404,

      message:
        "تعذر العثور على المشروع أو النسخة.",
    };
  }

  return {
    status:
      500,

    message:
      "تعذر تنفيذ عملية المراجعة.",
  };
}

export async function GET(
  request: Request,
  context: Context,
) {
  const {
    projectId,
  } =
    await context.params;

  const access =
    await resolveAccess(
      projectId,
    );

  if (
    "error" in access
  ) {
    return access.error;
  }

  try {
    const url =
      new URL(
        request.url,
      );

    const scheduleId =
      url.searchParams.get(
        "scheduleId",
      ) ??
      undefined;

    const workspace =
      await getTimetableReviewWorkspace(
        projectId,
        access.schoolAccountId,
        scheduleId,
      );

    return NextResponse.json({
      success:
        true,

      workspace,
    });
  }
  catch (error) {
    const mapped =
      mapError(
        error,
      );

    return NextResponse.json(
      {
        success:
          false,

        error:
          mapped.message,
      },
      {
        status:
          mapped.status,
      },
    );
  }
}

export async function POST(
  request: Request,
  context: Context,
) {
  const {
    projectId,
  } =
    await context.params;

  const access =
    await resolveAccess(
      projectId,
    );

  if (
    "error" in access
  ) {
    return access.error;
  }

  const body =
    await request
      .json()
      .catch(
        () =>
          null,
      );

  const parsed =
    saveSchema.safeParse(
      body,
    );

  if (
    !parsed.success
  ) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "بيانات التعديل غير صحيحة.",
      },
      {
        status:
          400,
      },
    );
  }

  try {
    const created =
      await saveTimetableReviewVersion(
        projectId,
        access.schoolAccountId,
        access.user.id,
        parsed.data,
      );

    return NextResponse.json({
      success:
        true,

      schedule:
        created,

      message:
        `تم حفظ التعديلات كنسخة جديدة #${created.version}.`,
    });
  }
  catch (error) {
    const mapped =
      mapError(
        error,
      );

    return NextResponse.json(
      {
        success:
          false,

        error:
          mapped.message,
      },
      {
        status:
          mapped.status,
      },
    );
  }
}
