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
  generateAndSaveTimetableV2,
} from "@/lib/timetable-v2/generation/generation-service";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

const schema =
  z.object({
    seed:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(2147483647)
        .optional(),
  });

export async function POST(
  request: Request,
  context: Context,
) {
  const access =
    await requireTimetableApiAccess({
      requireActiveSubscription: true,
    });

  if (!access.ok) {
    return access.response;
  }

  const {
    projectId,
  } = await context.params;

  const payload =
    await request
      .json()
      .catch(
        () => ({}),
      );

  const parsed =
    schema.safeParse(
      payload,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        code:
          "INVALID_GENERATION_REQUEST",
        error:
          "تعذر بدء إنشاء الجدول.",
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
          attempts: 1,
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
              "READINESS_BLOCKED",
            error:
              "المشروع لم يعد جاهزًا للإنشاء. راجع الجاهزية أولًا.",
            readiness:
              result.readiness,
          },
          {
            status: 409,
          },
        );
      }

      const feasibilityBlocked =
        result.result.diagnostics.some(
          (diagnostic) =>
            diagnostic.code ===
            "FEASIBILITY_PRECHECK_FAILED",
        );

      return NextResponse.json(
        {
          success: false,
          code:
            feasibilityBlocked
              ? "FEASIBILITY_BLOCKED"
              : "TIMEFOLD_FAILED",

          error:
            feasibilityBlocked
              ? "فحص الإمكانية أثبت وجود تعارض يمنع إنشاء الجدول."
              : "لم يتمكن Timefold من الوصول إلى جدول صالح لجميع القيود الإلزامية.",

          result: {
            engine:
              result.result.best
                .scoreBreakdown
                .engine,

            score:
              result.result.best
                .score,

            completeness:
              result.result.best
                .completeness,

            sessions:
              result.result.best
                .sessions.length,

            hardViolations:
              result.result.best
                .validation
                .hardViolationCount,

            softPenalty:
              result.result.best
                .softPenalty,

            durationMs:
              result.result
                .durationMs,

            seed:
              result.result.seed,

            diagnostics:
              result.result
                .diagnostics,
          },
        },
        {
          status: 422,
        },
      );
    }

    const schedule =
      result.schedule;

    if (!schedule) {
      throw new Error(
        "GENERATED_SCHEDULE_MISSING",
      );
    }

    return NextResponse.json({
      success: true,

      schedule: {
        id:
          schedule.id,

        version:
          schedule.version,

        status:
          schedule.status,

        generatedAt:
          schedule.generatedAt,
      },

      result: {
        engine:
          result.result.best
            .scoreBreakdown
            .engine,

        score:
          result.result.best
            .score,

        completeness:
          result.result.best
            .completeness,

        sessions:
          result.result.best
            .sessions.length,

        hardViolations:
          result.result.best
            .validation
            .hardViolationCount,

        softPenalty:
          result.result.best
            .softPenalty,

        durationMs:
          result.result
            .durationMs,

        seed:
          result.result.seed,
      },
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V3_TIMEFOLD_FAILED",
      {
        projectId,
        error,
      },
    );

    const code =
      error instanceof Error
        ? error.message
        : "";

    const unavailable =
      code.includes(
        "TIMEFOLD_V1_UNAVAILABLE",
      );

    return NextResponse.json(
      {
        success: false,
        code:
          unavailable
            ? "TIMEFOLD_UNAVAILABLE"
            : "TIMEFOLD_REQUEST_FAILED",

        error:
          unavailable
            ? "خدمة إنشاء الجدول غير متاحة حاليًا."
            : "تعذر إنشاء الجدول حاليًا.",
      },
      {
        status:
          unavailable
            ? 503
            : 500,
      },
    );
  }
}