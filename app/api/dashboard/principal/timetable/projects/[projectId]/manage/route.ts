import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import {
  changeTimetableStatus,
  saveEditedTimetable,
} from "@/lib/timetable/timetable-manage-service";

const sessionSchema = z.object({
  id: z.string().min(1),
  assignmentId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1),
  classId: z.string().min(1),
  className: z.string().min(1),
  subjectId: z.string().min(1),
  subjectName: z.string().min(1),
  dayId: z.string().min(1),
  dayLabel: z.string().min(1),
  periodId: z.string().min(1),
  periodLabel: z.string().min(1),
  periodOrder: z.number().int(),
  blockIndex: z.number().int().min(0),
  blockLength: z.number().int().min(1).max(2),
  isLocked: z.boolean().optional(),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SAVE"),
    sessions: z.array(sessionSchema).max(2000),
  }),
  z.object({
    action: z.literal("STATUS"),
    status: z.enum(["APPROVED", "PUBLISHED"]),
  }),
]);

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

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "الطلب غير صالح.",
      },
      { status: 400 },
    );
  }

  const { projectId } = await context.params;

  try {
    if (parsed.data.action === "SAVE") {
      await saveEditedTimetable(
        projectId,
        access.schoolAccountId!,
        parsed.data.sessions,
      );

      return NextResponse.json({
        success: true,
        status: "GENERATED",
      });
    }

    const project = await changeTimetableStatus(
      projectId,
      access.schoolAccountId!,
      parsed.data.status,
    );

    return NextResponse.json({
      success: true,
      status: project.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "PROJECT_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: "مشروع الجدول غير موجود.",
        },
        { status: 404 },
      );
    }

    if (message === "SCHEDULE_REQUIRED") {
      return NextResponse.json(
        {
          success: false,
          error: "أنشئ الجدول قبل اعتماده.",
        },
        { status: 400 },
      );
    }

    if (message === "APPROVAL_REQUIRED") {
      return NextResponse.json(
        {
          success: false,
          error: "يجب اعتماد الجدول قبل نشره.",
        },
        { status: 400 },
      );
    }

    if (
      message === "INVALID_SESSION" ||
      message === "INVALID_SLOT"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "توجد حصة غير صالحة داخل الجدول.",
        },
        { status: 400 },
      );
    }

    if (message === "SCHEDULE_CONFLICT") {
      return NextResponse.json(
        {
          success: false,
          error:
            "التبديل سبب تعارضًا للمعلم أو الفصل.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "تعذر حفظ تعديل الجدول.",
      },
      { status: 500 },
    );
  }
}