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
  createTimetableV3Assignment,
  deleteTimetableV3Assignment,
  getTimetableV3AssignmentsWorkspace,
  updateTimetableV3Assignment,
} from "@/lib/timetable-v3/assignment-service";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

const assignmentFields = {
  teacherId:
    z.string()
      .min(1),

  classId:
    z.string()
      .min(1),

  subjectId:
    z.string()
      .min(1),

  assignedLessons:
    z.number()
      .int()
      .min(1)
      .max(60),

  allowOverload:
    z.boolean()
      .optional(),
} as const;

const createSchema =
  z.object({
    action:
      z.literal(
        "CREATE",
      ),

    ...assignmentFields,
  });

const updateSchema =
  z.object({
    action:
      z.literal(
        "UPDATE",
      ),

    assignmentId:
      z.string()
        .min(1),

    ...assignmentFields,
  });

const deleteSchema =
  z.object({
    assignmentId:
      z.string()
        .min(1),
  });

function errorMessage(
  error: unknown,
) {
  const code =
    error instanceof Error
      ? error.message
      : "UNKNOWN";

  const messages:
    Record<
      string,
      string
    > = {
      PROJECT_NOT_FOUND:
        "المشروع غير موجود.",

      TEACHER_NOT_FOUND:
        "المعلم غير موجود.",

      CLASS_NOT_FOUND:
        "الفصل غير موجود.",

      SUBJECT_NOT_FOUND:
        "المادة غير موجودة.",

      INVALID_ASSIGNED_LESSONS:
        "عدد الحصص غير صالح.",

      ASSIGNMENT_ALREADY_EXISTS:
        "هذا الإسناد موجود مسبقًا.",

      ASSIGNMENT_NOT_FOUND:
        "الإسناد غير موجود.",
    };

  return (
    messages[
      code
    ] ??
    "تعذر تنفيذ العملية."
  );
}

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
      await getTimetableV3AssignmentsWorkspace(
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
      "TIMETABLE_V3_ASSIGNMENTS_GET_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          errorMessage(
            error,
          ),
      },
      {
        status:
          404,
      },
    );
  }
}

export async function POST(
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
    createSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "تحقق من بيانات الإسناد.",
      },
      {
        status:
          400,
      },
    );
  }

  try {
    const {
      action:
        _action,
      ...input
    } = parsed.data;

    const result =
      await createTimetableV3Assignment(
        projectId,
        access.schoolAccountId!,
        input,
      );

    if (
      result.overload
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "TEACHER_LOAD_EXCEEDED",

          error:
            "الإسناد يتجاوز نصاب المعلم.",

          overload:
            result.teacher,
        },
        {
          status:
            409,
        },
      );
    }

    const workspace =
      await getTimetableV3AssignmentsWorkspace(
        projectId,
        access.schoolAccountId!,
      );

    return NextResponse.json(
      {
        success:
          true,

        workspace,
      },
      {
        status:
          201,
      },
    );
  }
  catch (error) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          errorMessage(
            error,
          ),
      },
      {
        status:
          400,
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
    updateSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "تحقق من بيانات الإسناد.",
      },
      {
        status:
          400,
      },
    );
  }

  try {
    const {
      action:
        _action,
      assignmentId,
      ...input
    } = parsed.data;

    const result =
      await updateTimetableV3Assignment(
        projectId,
        assignmentId,
        access.schoolAccountId!,
        input,
      );

    if (
      result.overload
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "TEACHER_LOAD_EXCEEDED",

          error:
            "الإسناد يتجاوز نصاب المعلم.",

          overload:
            result.teacher,
        },
        {
          status:
            409,
        },
      );
    }

    const workspace =
      await getTimetableV3AssignmentsWorkspace(
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
    return NextResponse.json(
      {
        success:
          false,

        error:
          errorMessage(
            error,
          ),
      },
      {
        status:
          400,
      },
    );
  }
}

export async function DELETE(
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
    deleteSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "الإسناد غير صالح.",
      },
      {
        status:
          400,
      },
    );
  }

  try {
    await deleteTimetableV3Assignment(
      projectId,
      parsed.data.assignmentId,
      access.schoolAccountId!,
    );

    const workspace =
      await getTimetableV3AssignmentsWorkspace(
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
    return NextResponse.json(
      {
        success:
          false,

        error:
          errorMessage(
            error,
          ),
      },
      {
        status:
          400,
      },
    );
  }
}