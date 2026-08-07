import { NextResponse } from "next/server";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";

import {
  dailyOperationsRequestSchema,
} from "@/lib/timetable-v2/daily-operations/daily-operations-schemas";

import {
  assignSubstitute,
  createAbsenceWithSuggestions,
  createSupervisionDuty,
  deleteDailyAbsence,
  deleteSupervisionDuty,
  getDailyOperationsDashboard,
  saveWaitingPolicy,
  saveWaitingPolicyAndReevaluate,
  updateSubstitutionStatus,
  updateSupervisionDuty,
} from "@/lib/timetable-v2/daily-operations/daily-operations-service";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { projectId } =
    await context.params;

  let dashboard;

  try {
    dashboard =
      await getDailyOperationsDashboard(
        projectId,
        access.schoolAccountId!,
      );
  } catch (error) {
    console.error(
      "Failed to load timetable daily operations",
      {
        projectId,
        schoolAccountId:
          access.schoolAccountId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "تعذر تحميل التشغيل اليومي حاليًا.",
      },
      {
        status: 500,
      },
    );
  }

  if (!dashboard) {
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

  return NextResponse.json({
    success: true,
    dashboard,
  });
}

export async function POST(
  request: Request,
  context: Context,
) {
  const access =
    await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const payload =
    await request.json().catch(() => null);

  const parsed =
    dailyOperationsRequestSchema.safeParse(
      payload,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "البيانات غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  const { projectId } =
    await context.params;

  try {
    if (
      parsed.data.action ===
      "SAVE_POLICY"
    ) {
      const result =
        await saveWaitingPolicyAndReevaluate(
          projectId,
          access.schoolAccountId!,
          parsed.data.data,
        );

      if (!result) {
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

      return NextResponse.json({
        success:
          true,

        policy:
          result.policy,

        reevaluation:
          result.reevaluation,

        message:
          result.reevaluation.updated > 0
            ? `تم حفظ الضوابط وإعادة تحليل ${result.reevaluation.updated} حصة انتظار.`
            : "تم حفظ ضوابط الانتظار.",
      });
    }

    if (
      parsed.data.action ===
      "CREATE_ABSENCE"
    ) {
      const absence =
        await createAbsenceWithSuggestions(
          projectId,
          access.schoolAccountId!,
          access.user.id,
          parsed.data.data,
        );

      return NextResponse.json(
        {
          success: true,
          absence,
        },
        {
          status: 201,
        },
      );
    }

    if (
      parsed.data.action ===
      "ASSIGN_SUBSTITUTE"
    ) {
      const substitution =
        await assignSubstitute(
          projectId,
          access.schoolAccountId!,
          access.user.id,
          parsed.data.data,
        );

      return NextResponse.json({
        success: true,
        substitution,
      });
    }

    if (
      parsed.data.action ===
      "UPDATE_SUBSTITUTION"
    ) {
      const substitution =
        await updateSubstitutionStatus(
          projectId,
          access.schoolAccountId!,
          access.user.id,
          parsed.data.data,
        );

      return NextResponse.json({
        success: true,
        substitution,
      });
    }

    if (
      parsed.data.action ===
      "CREATE_SUPERVISION"
    ) {
      const duty =
        await createSupervisionDuty(
          projectId,
          access.schoolAccountId!,
          access.user.id,
          parsed.data.data,
        );

      return NextResponse.json(
        {
          success: true,
          duty,
        },
        {
          status: 201,
        },
      );
    }

    if (parsed.data.action === "UPDATE_SUPERVISION") {
      const duty = await updateSupervisionDuty(
        projectId,
        access.schoolAccountId!,
        parsed.data.dutyId,
        parsed.data.data,
      );
      return NextResponse.json({ success: true, duty });
    }

    if (
      parsed.data.action ===
      "DELETE_ABSENCE"
    ) {
      const deleted =
        await deleteDailyAbsence(
          projectId,
          access.schoolAccountId!,
          parsed.data.absenceId,
        );

      return NextResponse.json(
        {
          success: deleted,
        },
        {
          status: deleted ? 200 : 404,
        },
      );
    }

    const deleted =
      await deleteSupervisionDuty(
        projectId,
        access.schoolAccountId!,
        parsed.data.dutyId,
      );

    return NextResponse.json(
      {
        success: deleted,
      },
      {
        status: deleted ? 200 : 404,
      },
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    const messages: Record<
      string,
      string
    > = {
      PROJECT_NOT_FOUND:
        "مشروع الجدول غير موجود.",
      SUPERVISION_NOT_FOUND:
        "سجل المناوبة غير موجود.",
      TEACHER_NOT_FOUND:
        "المعلم غير موجود.",
      PUBLISHED_SCHEDULE_REQUIRED:
        "يجب إنشاء الجدول وحفظه قبل تسجيل الغياب.",
      NO_ABSENT_SESSIONS:
        "لا توجد حصص للمعلم ضمن الغياب المحدد.",
      SUBSTITUTION_NOT_FOUND:
        "حصة الانتظار غير موجودة.",
      TEACHER_BUSY:
        "المعلم لديه حصة في الوقت نفسه.",
      TEACHER_ALREADY_ASSIGNED:
        "المعلم مسند له انتظار آخر في الحصة نفسها.",
      INVALID_TEACHERS:
        "يوجد معلم غير صالح ضمن المناوبة.",
      SUPERVISION_SCHEDULE_CONFLICT:
        "يوجد تعارض بين المناوبة وجدول أحد المعلمين.",
    };

    return NextResponse.json(
      {
        success: false,
        error:
          messages[code] ||
          "تعذر تنفيذ العملية.",
      },
      {
        status:
          code === "PROJECT_NOT_FOUND"
            ? 404
            : 409,
      },
    );
  }
}
