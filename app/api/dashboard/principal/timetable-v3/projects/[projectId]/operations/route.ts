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
  saveWaitingPolicyAndReevaluate,
  updateSubstitutionStatus,
  updateSupervisionDuty,
} from "@/lib/timetable-v2/daily-operations/daily-operations-service";
import {
  getTimetableV3PublishedScheduleSummary,
  getTimetableV3PublishCandidate,
} from "@/lib/timetable-v3/schedule-service";

type Context = { params: Promise<{ projectId: string }> };

function errorMessage(code: string) {
  const messages: Record<string, string> = {
    PROJECT_NOT_FOUND: "مشروع الجدول غير موجود.",
    PUBLISHED_SCHEDULE_REQUIRED: "يجب نشر الجدول أولًا قبل استخدام التشغيل اليومي.",
    NO_ABSENT_SESSIONS: "لا توجد حصص ضمن الغياب المحدد.",
    TEACHER_NOT_FOUND: "المعلم غير موجود.",
    TEACHER_BUSY: "المعلم لديه حصة في الوقت نفسه.",
    TEACHER_ALREADY_ASSIGNED: "المعلم مسند له انتظار آخر في الحصة نفسها.",
    INVALID_TEACHERS: "يوجد معلم غير صالح ضمن المناوبة.",
    SUBSTITUTION_NOT_FOUND: "حصة الانتظار غير موجودة.",
    SUPERVISION_NOT_FOUND: "سجل المناوبة غير موجود.",
    SUPERVISION_SCHEDULE_CONFLICT: "يوجد تعارض بين المناوبة وجدول أحد المعلمين.",
  };
  return messages[code] ?? "تعذر تنفيذ العملية حاليًا.";
}

export async function GET(
  _request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess({
    requireActiveSubscription: true,
  });
  if (!access.ok) return access.response;

  const { projectId } = await context.params;
  try {
    const dashboard = await getDailyOperationsDashboard(
      projectId,
      access.schoolAccountId!,
    );
    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: "مشروع الجدول غير موجود." },
        { status: 404 },
      );
    }
    const publishedSchedule = await getTimetableV3PublishedScheduleSummary(
      projectId,
      access.schoolAccountId!,
    );
    return NextResponse.json({
      success: true,
      dashboard,
      publishedSchedule,
      publishCandidate: publishedSchedule
        ? null
        : await getTimetableV3PublishCandidate(projectId, access.schoolAccountId!),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { success: false, error: errorMessage(code) },
      { status: code === "PROJECT_NOT_FOUND" ? 404 : 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess({
    requireActiveSubscription: true,
  });
  if (!access.ok) return access.response;

  const payload = await request.json().catch(() => null);
  const parsed = dailyOperationsRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "البيانات غير صالحة." },
      { status: 400 },
    );
  }

  const { projectId } = await context.params;
  const schoolAccountId = access.schoolAccountId!;
  try {
    switch (parsed.data.action) {
      case "SAVE_POLICY": {
        const result = await saveWaitingPolicyAndReevaluate(
          projectId,
          schoolAccountId,
          parsed.data.data,
        );
        if (!result) {
          return NextResponse.json(
            { success: false, error: "مشروع الجدول غير موجود." },
            { status: 404 },
          );
        }
        return NextResponse.json({ success: true, ...result });
      }
      case "CREATE_ABSENCE":
        return NextResponse.json(
          {
            success: true,
            absence: await createAbsenceWithSuggestions(
              projectId,
              schoolAccountId,
              access.user.id,
              parsed.data.data,
            ),
          },
          { status: 201 },
        );
      case "ASSIGN_SUBSTITUTE":
        return NextResponse.json({
          success: true,
          substitution: await assignSubstitute(
            projectId,
            schoolAccountId,
            access.user.id,
            parsed.data.data,
          ),
        });
      case "UPDATE_SUBSTITUTION":
        return NextResponse.json({
          success: true,
          substitution: await updateSubstitutionStatus(
            projectId,
            schoolAccountId,
            access.user.id,
            parsed.data.data,
          ),
        });
      case "CREATE_SUPERVISION":
        return NextResponse.json(
          {
            success: true,
            duty: await createSupervisionDuty(
              projectId,
              schoolAccountId,
              access.user.id,
              parsed.data.data,
            ),
          },
          { status: 201 },
        );
      case "UPDATE_SUPERVISION":
        return NextResponse.json({
          success: true,
          duty: await updateSupervisionDuty(
            projectId,
            schoolAccountId,
            parsed.data.dutyId,
            parsed.data.data,
          ),
        });
      case "DELETE_ABSENCE":
        return NextResponse.json({
          success: await deleteDailyAbsence(
            projectId,
            schoolAccountId,
            parsed.data.absenceId,
          ),
        });
      case "DELETE_SUPERVISION":
        return NextResponse.json({
          success: await deleteSupervisionDuty(
            projectId,
            schoolAccountId,
            parsed.data.dutyId,
          ),
        });
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { success: false, error: errorMessage(code) },
      { status: code === "PROJECT_NOT_FOUND" ? 404 : 409 },
    );
  }
}
