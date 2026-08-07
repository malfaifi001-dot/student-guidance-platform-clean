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
  createTimetableV2Teacher,
  deleteTimetableV2Teacher,
  updateTimetableV2Teacher,
} from "@/lib/timetable-v2/teacher-service";

const teacherSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(
        1,
        "اسم المعلم مطلوب.",
      )
      .max(120),

    specialty: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),

    maxWeeklyLoad: z
      .number()
      .int()
      .min(1)
      .max(60),

    isActive:
      z.boolean(),
  });

const updateSchema =
  teacherSchema.extend({
    teacherId: z
      .string()
      .min(1),
  });

const deleteSchema =
  z.object({
    teacherId: z
      .string()
      .min(1),
  });

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

function errorMessage(
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

    TEACHER_NOT_FOUND:
      "المعلم غير موجود.",

    TEACHER_NAME_REQUIRED:
      "اسم المعلم مطلوب.",

    INVALID_MAX_WEEKLY_LOAD:
      "الحد الأعلى للحصص يجب أن يكون بين 1 و60.",

    TEACHER_HAS_LINKED_DATA:
      "لا يمكن حذف المعلم لأنه مرتبط بإسنادات أو بيانات تشغيلية. يمكنك إيقافه بدل الحذف.",
  };

  return (
    messages[code] ??
    "تعذر تنفيذ العملية حاليًا."
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
    teacherSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]
            ?.message ??
          "بيانات المعلم غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const teacher =
      await createTimetableV2Teacher(
        projectId,
        access.schoolAccountId!,
        parsed.data,
      );

    return NextResponse.json(
      {
        success: true,
        teacher,
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
          errorMessage(error),
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
    updateSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]
            ?.message ??
          "بيانات المعلم غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const {
      teacherId,
      ...input
    } = parsed.data;

    const teacher =
      await updateTimetableV2Teacher(
        projectId,
        teacherId,
        access.schoolAccountId!,
        input,
      );

    return NextResponse.json({
      success: true,
      teacher,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          errorMessage(error),
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
          "معرف المعلم غير صالح.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const deleted =
      await deleteTimetableV2Teacher(
        projectId,
        parsed.data.teacherId,
        access.schoolAccountId!,
      );

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          errorMessage(error),
      },
      {
        status: 400,
      },
    );
  }
}