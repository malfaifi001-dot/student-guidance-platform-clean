import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  activateTimetableV2Schedule,
  approveTimetableV2Schedule,
  generateAndSaveTimetableV2,
  getTimetableV2GenerationWorkspace,
  publishTimetableV2Schedule,
} from "@/lib/timetable-v2/generation/generation-service";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

const generationSchema =
  z.object({
    attempts:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(60)
        .default(20),

    seed:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(2147483647)
        .optional(),
  });

const actionSchema =
  z.object({
    action:
      z.enum([
        "ACTIVATE",
        "APPROVE",
        "PUBLISH",
      ]),

    scheduleId:
      z.string().min(1),
  });

function errorMessage(
  error: unknown,
) {
  const code =
    error instanceof Error
      ? error.message
      : "";

  if (
    code ===
    "PROJECT_NOT_FOUND"
  ) {
    return {
      status: 404,
      message:
        "مشروع الجدول غير موجود.",
    };
  }

  if (
    code ===
    "SCHEDULE_NOT_FOUND"
  ) {
    return {
      status: 404,
      message:
        "نسخة الجدول غير موجودة.",
    };
  }

  if (
    code ===
    "SCHEDULE_NOT_APPROVED"
  ) {
    return {
      status: 400,
      message:
        "يجب اعتماد النسخة قبل نشرها.",
    };
  }

  if (
    code ===
    "SCHEDULE_STALE"
  ) {
    return {
      status: 409,
      message:
        "هذه النسخة أقدم من بيانات المشروع الحالية. أنشئ نسخة جديدة قبل الاعتماد أو النشر.",
    };
  }

  if (
    code ===
    "SCHEDULE_VALIDATION_FAILED"
  ) {
    return {
      status: 409,
      message:
        "لا يمكن اعتماد نسخة غير مكتملة أو تحتوي مخالفات إلزامية.",
    };
  }

  return {
    status: 500,
    message:
      "تعذر تنفيذ العملية حاليًا.",
  };
}

export async function GET(
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
    const workspace =
      await getTimetableV2GenerationWorkspace(
        projectId,
        access.schoolAccountId!,
      );

    return NextResponse.json({
      success: true,
      workspace,
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V2_GENERATION_GET_FAILED",
      {
        projectId,
        error,
      },
    );

    const mapped =
      errorMessage(error);

    return NextResponse.json(
      {
        success: false,
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

  const payload =
    await request
      .json()
      .catch(
        () => null,
      );

  const parsed =
    generationSchema.safeParse(
      payload,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          "إعدادات إنشاء الجدول غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  const seed =
    parsed.data.seed ??
    (
      Math.floor(
        Date.now() %
        2147483647,
      ) || 1
    );

  try {
    const result =
      await generateAndSaveTimetableV2(
        projectId,
        access.schoolAccountId!,
        access.user.id,
        {
          attempts:
            parsed.data.attempts,

          seed,
        },
      );

    if (!result.ok) {
      if (
        result.reason ===
        "READINESS_BLOCKED"
      ) {
        return NextResponse.json(
          {
            success: false,

            code:
              result.reason,

            error:
              "المشروع غير جاهز للإنشاء. عالج الأخطاء الإلزامية أولًا.",

            readiness:
              result.readiness,
          },
          {
            status: 409,
          },
        );
      }

      return NextResponse.json(
        {
          success: false,

          code:
            result.reason,

          error:
            "لم يتمكن المحرك من إنشاء جدول كامل وصالح ضمن المحاولات الحالية.",

          result:
            result.result,
        },
        {
          status: 422,
        },
      );
    }

    return NextResponse.json({
      success: true,

      schedule:
        result.schedule,

      result: {
        score:
          result.result.best.score,

        scoreBreakdown:
          result.result.best
            .scoreBreakdown,

        completeness:
          result.result.best
            .completeness,

        sessions:
          result.result.best
            .scheduledSessions,

        hardViolations:
          result.result.best
            .validation
            .hardViolationCount,

        attempts:
          result.result.attemptCount,

        completedAttempts:
          result.result
            .completedAttempts,

        durationMs:
          result.result.durationMs,

        seed:
          result.result.seed,
      },
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V2_GENERATION_POST_FAILED",
      {
        projectId,
        error,
      },
    );

    const mapped =
      errorMessage(error);

    return NextResponse.json(
      {
        success: false,
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

export async function PATCH(
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

  const payload =
    await request
      .json()
      .catch(
        () => null,
      );

  const parsed =
    actionSchema.safeParse(
      payload,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          "الإجراء غير صالح.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    if (
      parsed.data.action ===
      "ACTIVATE"
    ) {
      await activateTimetableV2Schedule(
        projectId,
        parsed.data.scheduleId,
        access.schoolAccountId!,
      );
    }

    if (
      parsed.data.action ===
      "APPROVE"
    ) {
      await approveTimetableV2Schedule(
        projectId,
        parsed.data.scheduleId,
        access.schoolAccountId!,
      );
    }

    if (
      parsed.data.action ===
      "PUBLISH"
    ) {
      await publishTimetableV2Schedule(
        projectId,
        parsed.data.scheduleId,
        access.schoolAccountId!,
      );
    }

    return NextResponse.json({
      success: true,
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V2_GENERATION_ACTION_FAILED",
      {
        projectId,
        error,
      },
    );

    const mapped =
      errorMessage(error);

    return NextResponse.json(
      {
        success: false,
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