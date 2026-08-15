import { NextResponse } from "next/server";
import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { getTimetableV3Versions } from "@/lib/timetable-v3/schedule-service";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Context) {
  const access = await requireTimetableApiAccess({ requireActiveSubscription: true });
  if (!access.ok) return access.response;
  const { projectId } = await context.params;

  try {
    return NextResponse.json({
      ok: true,
      workspace: await getTimetableV3Versions(projectId, access.schoolAccountId!),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "VERSIONS_FAILED";
    return NextResponse.json(
      { ok: false, code, error: code === "PROJECT_NOT_FOUND" ? "المشروع غير موجود." : "تعذر تحميل نسخ الجدول." },
      { status: code === "PROJECT_NOT_FOUND" ? 404 : 500 },
    );
  }
}
