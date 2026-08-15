import { NextResponse } from "next/server";
import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { buildTimetableV3Workbook } from "@/lib/timetable-v3/export/schedule-excel";
import { getTimetableV3PrintData } from "@/lib/timetable-v3/schedule-service";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: Context) {
  const access = await requireTimetableApiAccess({ requireActiveSubscription: true });
  if (!access.ok) return access.response;
  const { projectId } = await context.params;
  const scheduleId = new URL(request.url).searchParams.get("scheduleId");
  if (!scheduleId) return NextResponse.json({ ok: false, code: "SCHEDULE_ID_REQUIRED", error: "حدد نسخة الجدول." }, { status: 400 });

  try {
    const data = await getTimetableV3PrintData(projectId, scheduleId, access.schoolAccountId!);
    const workbook = await buildTimetableV3Workbook(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = encodeURIComponent(`جدول-${data.project.name}-نسخة-${data.schedule.version}.xlsx`);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "EXPORT_FAILED";
    return NextResponse.json(
      { ok: false, code, error: code === "SCHEDULE_NOT_FOUND" ? "نسخة الجدول غير موجودة." : "تعذر تصدير الجدول." },
      { status: code === "PROJECT_NOT_FOUND" || code === "SCHEDULE_NOT_FOUND" ? 404 : 500 },
    );
  }
}
