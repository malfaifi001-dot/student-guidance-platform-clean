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
  createTimetableV2Constraint,
  deleteTimetableV2Constraint,
  saveTimetableV2Periods,
  setTimetableV2ConstraintActive,
  updateTimetableV2Constraint,
} from "@/lib/timetable-v2/constraint-service";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

const slotSchema =
  z.object({
    dayId:
      z.string().min(1),

    periodId:
      z.string().min(1),
  });

const constraintFields = {
  type:
    z.string().min(1),

  strength:
    z.enum([
      "HARD",
      "SOFT",
    ]),

  title:
    z.string()
      .max(160)
      .nullable()
      .optional(),

  valueInt:
    z.number()
      .int()
      .nullable()
      .optional(),

  notes:
    z.string()
      .max(1000)
      .nullable()
      .optional(),

  configJson:
    z.any()
      .nullable()
      .optional(),

  teacherIds:
    z.array(
      z.string().min(1),
    )
      .max(200)
      .optional(),

  subjectIds:
    z.array(
      z.string().min(1),
    )
      .max(200)
      .optional(),

  classIds:
    z.array(
      z.string().min(1),
    )
      .max(200)
      .optional(),

  dayIds:
    z.array(
      z.string().min(1),
    )
      .max(20)
      .optional(),

  periodIds:
    z.array(
      z.string().min(1),
    )
      .max(30)
      .optional(),

  slots:
    z.array(
      slotSchema,
    )
      .max(500)
      .optional(),
} as const;

const constraintSchema =
  z.object({
    action:
      z.literal(
        "CREATE_CONSTRAINT",
      ),

    ...constraintFields,
  });

const updateConstraintSchema =
  z.object({
    action:
      z.literal(
        "UPDATE_CONSTRAINT",
      ),

    constraintId:
      z.string().min(1),

    ...constraintFields,
  });

const toggleConstraintSchema =
  z.object({
    action:
      z.literal(
        "TOGGLE_CONSTRAINT",
      ),

    constraintId:
      z.string().min(1),

    isActive:
      z.boolean(),
  });

const periodsSchema =
  z.object({
    action:
      z.literal(
        "SAVE_PERIODS",
      ),

    periods:
      z.array(
        z.object({
          id:
            z.string().min(1),

          label:
            z.string().min(1),

          order:
            z.number().int(),

          isBreak:
            z.boolean(),

          startTime:
            z.string()
              .nullable()
              .optional(),

          endTime:
            z.string()
              .nullable()
              .optional(),
        }),
      )
      .max(40),
  });

const deleteSchema =
  z.object({
    constraintId:
      z.string().min(1),
  });

const patchSchema =
  z.discriminatedUnion(
    "action",
    [
      updateConstraintSchema,
      toggleConstraintSchema,
      periodsSchema,
    ],
  );

function message(
  error: unknown,
) {
  const code =
    error instanceof Error
      ? error.message
      : "UNKNOWN";

  const messages: Record<
    string,
    string
  > = {
    PROJECT_NOT_FOUND:
      "مشروع الجدول غير موجود.",

    INVALID_TEACHER_TARGET:
      "يوجد معلم غير صالح داخل القيد.",

    INVALID_SUBJECT_TARGET:
      "توجد مادة غير صالحة داخل القيد.",

    INVALID_CLASS_TARGET:
      "يوجد فصل غير صالح داخل القيد.",

    INVALID_DAY_TARGET:
      "يوجد يوم غير صالح داخل القيد.",

    INVALID_PERIOD_TARGET:
      "توجد حصة غير صالحة داخل القيد.",

    INVALID_CONSTRAINT_VALUE:
      "القيمة العددية للقيد غير صالحة.",

    INVALID_WEIGHT:
      "وزن القيد غير صالح.",

    INVALID_STRENGTH:
      "درجة القيد غير صالحة.",

    CONSTRAINT_TYPE_REQUIRED:
      "نوع القيد مطلوب.",

    CONSTRAINT_NOT_FOUND:
      "القيد غير موجود.",
  };

  return (
    messages[code] ??
    "تعذر تنفيذ العملية."
  );
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const {
    projectId,
  } = await context.params;

  const body =
    await request
      .json()
      .catch(() => null);

  const parsed =
    constraintSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]
            ?.message ??
          "بيانات القيد غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const {
      action: _action,
      ...input
    } = parsed.data;

    const constraint =
      await createTimetableV2Constraint(
        projectId,
        access.schoolAccountId!,
        input,
      );

    return NextResponse.json(
      {
        success: true,
        constraint,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          message(error),
      },
      {
        status: 400,
      },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const {
    projectId,
  } = await context.params;

  const body =
    await request
      .json()
      .catch(() => null);

  const parsed =
    patchSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          "بيانات العملية غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    if (
      parsed.data.action ===
      "UPDATE_CONSTRAINT"
    ) {
      const {
        action: _action,
        constraintId,
        ...input
      } = parsed.data;

      const constraint =
        await updateTimetableV2Constraint(
          projectId,
          constraintId,
          access.schoolAccountId!,
          input,
        );

      return NextResponse.json({
        success: true,
        constraint,
      });
    }

    if (
      parsed.data.action ===
      "TOGGLE_CONSTRAINT"
    ) {
      const constraint =
        await setTimetableV2ConstraintActive(
          projectId,
          parsed.data.constraintId,
          access.schoolAccountId!,
          parsed.data.isActive,
        );

      return NextResponse.json({
        success: true,
        constraint,
      });
    }

    const project =
      await saveTimetableV2Periods(
        projectId,
        access.schoolAccountId!,
        parsed.data.periods,
      );

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          message(error),
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const {
    projectId,
  } = await context.params;

  const body =
    await request
      .json()
      .catch(() => null);

  const parsed =
    deleteSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          "معرف القيد غير صالح.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await deleteTimetableV2Constraint(
      projectId,
      parsed.data.constraintId,
      access.schoolAccountId!,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          message(error),
      },
      {
        status: 400,
      },
    );
  }
}