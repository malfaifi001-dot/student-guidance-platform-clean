import { NextResponse } from "next/server";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { updateTeacherUnavailableSlots } from "@/lib/timetable/timetable-data-service";
import { timetableTeacherUnavailableSlotsInputSchema } from "@/lib/timetable/timetable-schemas";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { projectId } = await context.params;
  const body = await request.json().catch(() => null);

  const parsed =
    timetableTeacherUnavailableSlotsInputSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "بيانات القيود غير صالحة.",
      },
      { status: 400 },
    );
  }

  try {
    const teacher = await updateTeacherUnavailableSlots(
      projectId,
      access.schoolAccountId!,
      parsed.data.teacherId,
      parsed.data.unavailableSlots,
    );

    return NextResponse.json({
      success: true,
      teacher,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (
      message === "PROJECT_NOT_FOUND" ||
      message === "TEACHER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "المشروع أو المعلم غير موجود.",
        },
        { status: 404 },
      );
    }

    if (message === "INVALID_SLOT") {
      return NextResponse.json(
        {
          success: false,
          error: "اليوم أو الحصة غير صالحين.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "تعذر حفظ قيود المعلم.",
      },
      { status: 500 },
    );
  }
}