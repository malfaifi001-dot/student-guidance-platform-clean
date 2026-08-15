import { NextResponse } from "next/server";
import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { validateTimetableV3Schedule } from "@/lib/timetable-v3/schedule-service";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: Context) {
  const access = await requireTimetableApiAccess({ requireActiveSubscription: true });
  if (!access.ok) return access.response;

  const { projectId } = await context.params;
  const scheduleId = new URL(request.url).searchParams.get("scheduleId") ?? undefined;

  try {
    const result = await validateTimetableV3Schedule(projectId, access.schoolAccountId!, scheduleId);
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "VALIDATION_FAILED";
    return NextResponse.json(
      {
        ok: false,
        code,
        error: code === "SCHEDULE_NOT_FOUND" ? "نسخة الجدول غير موجودة." : "تعذر التحقق من الجدول.",
      },
      { status: code === "PROJECT_NOT_FOUND" || code === "SCHEDULE_NOT_FOUND" ? 404 : 500 },
    );
  }
}
