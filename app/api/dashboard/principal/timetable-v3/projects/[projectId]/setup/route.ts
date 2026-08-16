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
  getTimetableV3SetupWorkspace,
  saveTimetableV3Classes,
  saveTimetableV3ClassMappings,
  saveTimetableV3Days,
  saveTimetableV3Periods,
  saveTimetableV3Subjects,
  saveTimetableV3Teachers,
  saveTimetableV3Stages,
  saveTimetableV3StageWeeklyPeriodTargets,
} from "@/lib/timetable-v3/project-setup-service";

const dayId =
  z.enum([
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
  ]);

const timetableStageId =
  z.enum([
    "ELEMENTARY",
    "MIDDLE",
    "HIGH",
  ]);

const stageWeeklyPeriodTarget =
  z.preprocess(
    (value) => {
      if (
        typeof value === "string" &&
        value.trim().length > 0
      ) {
        return Number(value);
      }

      return value;
    },
    z.number().int().min(1).max(100),
  );

const stageWeeklyPeriodTargets =
  z.partialRecord(
    timetableStageId,
    stageWeeklyPeriodTarget,
  )
    .refine(
      (value) => Object.keys(value).length <= 3,
    );

const schema =
  z.discriminatedUnion(
    "action",
    [
      z.object({
        action:
          z.literal(
            "SAVE_DAYS",
          ),

        dayIds:
          z.array(
            dayId,
          )
            .min(1)
            .max(5),
      }),

      z.object({
        action:
          z.literal(
            "SAVE_PERIODS",
          ),

        periods:
          z.array(
            z.object({
              label:
                z.string()
                  .trim()
                  .min(1)
                  .max(50),

              startTime:
                z.string()
                  .trim()
                  .max(10)
                  .nullable()
                  .optional(),

              endTime:
                z.string()
                  .trim()
                  .max(10)
                  .nullable()
                  .optional(),

              isBreak:
                z.boolean()
                  .optional(),
            }),
          )
            .min(1)
            .max(12),
      }),

      z.object({
        action:
          z.literal(
            "SAVE_CLASSES",
          ),

        names:
          z.array(
            z.string()
              .trim()
              .min(1)
              .max(100),
          )
            .min(1)
            .max(200),

        stages:
          z.array(
            timetableStageId,
          )
            .min(1)
            .max(3),

        stageWeeklyPeriodTargets:
          stageWeeklyPeriodTargets.optional(),
      }),

      z.object({
        action:
          z.literal(
            "SAVE_CLASS_MAPPINGS",
          ),

        classMappings:
          z.record(
            z.string().min(1),
            z.object({
              stageId:
                z.enum([
                  "ELEMENTARY",
                  "MIDDLE",
                  "HIGH",
                ]),

              gradeId:
                z.string()
                  .trim()
                  .min(1)
                  .max(50),

              gradeName:
                z.string()
                  .trim()
                  .min(1)
                  .max(120),
            }),
          )
          .refine(
            (value) => Object.keys(value).length <= 500,
          ),
      }),

      z.object({
        action:
          z.literal(
            "SAVE_STAGE_WEEKLY_PERIOD_TARGETS",
          ),

        stageWeeklyPeriodTargets:
          stageWeeklyPeriodTargets,
      }),

      z.object({
        action:
          z.literal(
            "SAVE_SUBJECTS",
          ),

        names:
          z.array(
            z.string()
              .trim()
              .min(1)
              .max(120),
          )
            .min(1)
            .max(200),
      }),

      z.object({
        action:
          z.literal(
            "SAVE_TEACHERS",
          ),

        teachers:
          z.array(
            z.object({
              name:
                z.string()
                  .trim()
                  .min(1)
                  .max(120),

              specialty:
                z.string()
                  .trim()
                  .max(120),

              maxWeeklyLoad:
                z.number()
                  .int()
                  .min(1)
                  .max(60),
            }),
          )
            .min(1)
            .max(500),
      }),
    ],
  );

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
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
  } = await context.params;

  try {
    const workspace =
      await getTimetableV3SetupWorkspace(
        projectId,
        access.schoolAccountId!,
      );

    return NextResponse.json({
      success:
        true,

      workspace,
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V3_SETUP_GET_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "تعذر تحميل إعداد المشروع.",
      },
      {
        status:
          404,
      },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
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
  } = await context.params;

  const body =
    await request
      .json()
      .catch(
        () => null,
      );

  const parsed =
    schema.safeParse(
      body,
    );

  if (!parsed.success) {
    const rawAction =
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      "action" in body
        ? (body as { action?: unknown }).action
        : undefined;
    const action =
      typeof rawAction === "string"
        ? rawAction
        : "UNKNOWN";

    console.error(
      "TIMETABLE_V3_SETUP_VALIDATION_FAILED",
      {
        action,
        issues: parsed.error.issues
          .slice(0, 8)
          .map((issue) => ({
            path: issue.path,
            code: issue.code,
            message: issue.message,
          })),
      },
    );

    const hasStageTargetIssue =
      parsed.error.issues.some((issue) =>
        issue.path.includes(
          "stageWeeklyPeriodTargets",
        ),
      );

    return NextResponse.json(
      {
        success: false,
        error: hasStageTargetIssue
          ? "تحقق من عدد الحصص الأسبوعية للمرحلة."
          : "تحقق من البيانات المدخلة.",
      },
      { status: 400 },
    );
  }

  try {
    switch (
      parsed.data.action
    ) {
      case "SAVE_DAYS":
        await saveTimetableV3Days(
          projectId,
          access.schoolAccountId!,
          parsed.data.dayIds,
        );
        break;

      case "SAVE_PERIODS":
        await saveTimetableV3Periods(
          projectId,
          access.schoolAccountId!,
          parsed.data.periods,
        );
        break;

      case "SAVE_CLASSES":
        await saveTimetableV3Stages(
          projectId,
          access.schoolAccountId!,
          parsed.data.stages,
        );
        await saveTimetableV3Classes(
          projectId,
          access.schoolAccountId!,
          parsed.data.names,
        );
        if (parsed.data.stageWeeklyPeriodTargets) {
          await saveTimetableV3StageWeeklyPeriodTargets(
            projectId,
            access.schoolAccountId!,
            parsed.data.stageWeeklyPeriodTargets,
          );
        }
        break;

      case "SAVE_CLASS_MAPPINGS":
        await saveTimetableV3ClassMappings(
          projectId,
          access.schoolAccountId!,
          parsed.data.classMappings,
        );
        break;

      case "SAVE_STAGE_WEEKLY_PERIOD_TARGETS":
        await saveTimetableV3StageWeeklyPeriodTargets(
          projectId,
          access.schoolAccountId!,
          parsed.data.stageWeeklyPeriodTargets,
        );
        break;

      case "SAVE_SUBJECTS":
        await saveTimetableV3Subjects(
          projectId,
          access.schoolAccountId!,
          parsed.data.names,
        );
        break;

      case "SAVE_TEACHERS":
        await saveTimetableV3Teachers(
          projectId,
          access.schoolAccountId!,
          parsed.data.teachers,
        );
        break;
    }

    const workspace =
      await getTimetableV3SetupWorkspace(
        projectId,
        access.schoolAccountId!,
      );

    return NextResponse.json({
      success:
        true,

      workspace,
    });
  }
  catch (error) {
    console.error(
      "TIMETABLE_V3_SETUP_SAVE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error &&
          error.message ===
            "DUPLICATE_TEACHER_NAME"
            ? "يوجد اسم معلم مكرر."
            : "تعذر حفظ هذه الخطوة.",
      },
      {
        status:
          400,
      },
    );
  }
}
