import { NextResponse } from "next/server";
import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { deleteTimetableV3Schedule, getTimetableV3Versions } from "@/lib/timetable-v3/schedule-service";
import { z } from "zod";

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

export async function DELETE(request: Request, context: Context) {
  const access = await requireTimetableApiAccess({ requireActiveSubscription: true });
  if (!access.ok) return access.response;
  const { projectId } = await context.params;
  const parsed = z.object({ scheduleId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "نسخة الجدول غير صالحة." }, { status: 400 });
  try {
    await deleteTimetableV3Schedule(projectId, parsed.data.scheduleId, access.schoolAccountId!);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "DELETE_FAILED";
    const message = code === "PUBLISHED_SCHEDULE_DELETE_BLOCKED" || code === "SCHEDULE_IN_USE"
      ? "لا يمكن حذف النسخة المنشورة أو المستخدمة في التشغيل اليومي."
      : code === "SCHEDULE_NOT_FOUND" ? "نسخة الجدول غير موجودة." : "تعذر حذف النسخة.";
    return NextResponse.json({ ok: false, error: message }, { status: code === "SCHEDULE_NOT_FOUND" ? 404 : 409 });
  }
}
