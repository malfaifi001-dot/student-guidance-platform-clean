import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  prisma,
} from "@/lib/prisma";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  createTimetableV3Assignment,
  deleteTimetableV3Assignment,
  getTimetableV3AssignmentsWorkspace,
  updateTimetableV3Assignment,
} from "@/lib/timetable-v3/assignment-service";

import {
  getTimetableHistorySnapshot,
  recordTimetableHistory,
  TIMETABLE_HISTORY_ACTIONS,
} from "@/lib/timetable-v3/history/timetable-history-service";

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

function logMutationFailure(
  action: string,
  projectId: string,
  error: unknown,
) {
  console.error("TIMETABLE_V3_ASSIGNMENT_MUTATION_FAILED", {
    action,
    projectId,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    errorCode: error instanceof Error ? error.message : "UNKNOWN",
  });
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

    const result = await prisma.$transaction(async (tx) => {
      const mutation = await createTimetableV3Assignment(
        projectId,
        access.schoolAccountId!,
        input,
        tx,
      );

      if (!mutation.overload) {
        await recordTimetableHistory({
          projectId,
          schoolAccountId: access.schoolAccountId!,
          actionType: TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_CREATED,
          entityType: "ASSIGNMENT",
          entityId: mutation.assignment.id,
          before: null,
          after: await getTimetableHistorySnapshot(
            projectId,
            TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_CREATED,
            mutation.assignment.id,
            tx,
          ),
          metadata: { source: "V3_ASSIGNMENTS" },
        }, tx);
      }

      return mutation;
    });

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
    logMutationFailure("CREATE", projectId, error);
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

    const result = await prisma.$transaction(async (tx) => {
      const assignmentBefore = await getTimetableHistorySnapshot(
        projectId,
        TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_UPDATED,
        assignmentId,
        tx,
      );

      const mutation = await updateTimetableV3Assignment(
        projectId,
        assignmentId,
        access.schoolAccountId!,
        input,
        tx,
      );

      if (!mutation.overload) {
        await recordTimetableHistory({
          projectId,
          schoolAccountId: access.schoolAccountId!,
          actionType: TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_UPDATED,
          entityType: "ASSIGNMENT",
          entityId: assignmentId,
          before: assignmentBefore,
          after: await getTimetableHistorySnapshot(
            projectId,
            TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_UPDATED,
            assignmentId,
            tx,
          ),
          metadata: { source: "V3_ASSIGNMENTS" },
        }, tx);
      }

      return mutation;
    });

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
    logMutationFailure("UPDATE", projectId, error);
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
    await prisma.$transaction(async (tx) => {
      const assignmentBefore = await getTimetableHistorySnapshot(
        projectId,
        TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_REMOVED,
        parsed.data.assignmentId,
        tx,
      );

      await deleteTimetableV3Assignment(
        projectId,
        parsed.data.assignmentId,
        access.schoolAccountId!,
        tx,
      );

      await recordTimetableHistory({
        projectId,
        schoolAccountId: access.schoolAccountId!,
        actionType: TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_REMOVED,
        entityType: "ASSIGNMENT",
        entityId: parsed.data.assignmentId,
        before: assignmentBefore,
        after: null,
        metadata: { source: "V3_ASSIGNMENTS" },
      }, tx);
    });

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
    logMutationFailure("DELETE", projectId, error);
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
