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
  saveTimetableV2SharedAssignments,
} from "@/lib/timetable-v2/assignment-service";

const inputSchema =
  z.object({
    classSubjectId: z
      .string()
      .min(1),

    shares: z
      .array(
        z.object({
          teacherId: z
            .string()
            .min(1),

          assignedLessons: z
            .number()
            .int()
            .min(1)
            .max(60),
        }),
      )
      .max(50),
  });

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

function getErrorMessage(
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

    CLASS_SUBJECT_NOT_FOUND:
      "المادة أو الفصل غير موجود.",

    TEACHER_NOT_FOUND:
      "أحد المعلمين غير موجود أو غير نشط.",

    DUPLICATE_TEACHER_SHARE:
      "لا يمكن إضافة المعلم نفسه مرتين لنفس المقرر.",

    INVALID_ASSIGNED_LESSONS:
      "عدد حصص أحد المعلمين غير صالح.",

    ASSIGNMENT_TOTAL_OVERFLOW:
      "مجموع الحصص الموزعة أكبر من عدد حصص المقرر.",
  };

  return (
    messages[code] ??
    "تعذر حفظ مشاركة الإسناد."
  );
}

export async function PUT(
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
    inputSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]
            ?.message ??
          "بيانات الإسناد غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const result =
      await saveTimetableV2SharedAssignments(
        projectId,
        access.schoolAccountId!,
        parsed.data,
      );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          getErrorMessage(
            error,
          ),
      },
      {
        status: 400,
      },
    );
  }
}