import { NextResponse } from "next/server";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import {
  getTimetableConstraints,
  saveTimetableConstraints,
} from "@/lib/timetable/timetable-constraint-service";
import { timetableConstraintsInputSchema } from "@/lib/timetable/timetable-constraint-schemas";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { projectId } = await context.params;

  const result = await getTimetableConstraints(
    projectId,
    access.schoolAccountId!,
  );

  if (!result) {
    return NextResponse.json(
      {
        success: false,
        error: "مشروع الجدول غير موجود.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    constraints: result.constraints,
  });
}

export async function PUT(
  request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const body = await request.json().catch(() => null);

  const parsed =
    timetableConstraintsInputSchema.safeParse(body);

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

  const { projectId } = await context.params;

  try {
    await saveTimetableConstraints(
      projectId,
      access.schoolAccountId!,
      parsed.data.constraints,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "TIMETABLE_CONSTRAINT_SAVE_FAILED",
      error,
    );

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

    if (message === "INVALID_TEACHER") {
      return invalid("المعلم المحدد غير صالح.");
    }

    if (message === "INVALID_CLASS") {
      return invalid("الفصل المحدد غير صالح.");
    }

    if (message === "INVALID_SUBJECT") {
      return invalid("المادة المحددة غير صالحة.");
    }

    if (
      message === "INVALID_DAY" ||
      message === "INVALID_PERIOD"
    ) {
      return invalid("اليوم أو الحصة غير صالحين.");
    }

    return NextResponse.json(
      {
        success: false,
        error: "تعذر حفظ القيود.",
      },
      { status: 500 },
    );
  }
}

function invalid(error: string) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status: 400 },
  );
}
