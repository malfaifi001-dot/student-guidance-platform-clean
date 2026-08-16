import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { publishTimetableV3Schedule } from "@/lib/timetable-v3/schedule-service";

type Context = { params: Promise<{ projectId: string }> };
const bodySchema = z.object({ scheduleId: z.string().min(1) });

function messageFor(code: string) {
  const messages: Record<string, string> = {
    PROJECT_NOT_FOUND: "مشروع الجدول غير موجود.",
    SCHEDULE_NOT_FOUND: "نسخة الجدول غير موجودة.",
    SCHEDULE_STALE: "هذه النسخة قديمة، أنشئ نسخة حديثة قبل النشر.",
    SCHEDULE_VALIDATION_FAILED: "لا يمكن نشر نسخة غير مكتملة أو تحتوي على مخالفات.",
    SCHEDULE_RUNTIME_VALIDATION_FAILED: "فشل التحقق النهائي من بنية الجدول.",
  };
  return messages[code] ?? "تعذر اعتماد الجدول ونشره حاليًا.";
}

export async function POST(request: Request, context: Context) {
  const access = await requireTimetableApiAccess({ requireActiveSubscription: true });
  if (!access.ok) return access.response;
  const { projectId } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "نسخة الجدول غير صالحة." }, { status: 400 });
  }

  try {
    const schedule = await publishTimetableV3Schedule(
      projectId,
      parsed.data.scheduleId,
      access.schoolAccountId!,
    );
    return NextResponse.json({
      success: true,
      schedule: { id: schedule.id, version: schedule.version, status: schedule.status, isCurrent: schedule.isCurrent },
      message: "تم اعتماد الجدول ونشره بنجاح.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PUBLISH_FAILED";
    return NextResponse.json({ success: false, error: messageFor(code) }, { status: code === "PROJECT_NOT_FOUND" || code === "SCHEDULE_NOT_FOUND" ? 404 : 409 });
  }
}
