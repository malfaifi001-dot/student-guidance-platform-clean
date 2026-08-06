import { NextResponse } from "next/server";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import {
  generateTimetable,
  getSavedGeneratedTimetable,
  saveGeneratedTimetable,
} from "@/lib/timetable/timetable-generation-service";

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

  const result = await getSavedGeneratedTimetable(
    projectId,
    access.schoolAccountId!,
  );

  if (!result.found) {
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
    sessions: result.sessions,
    generatedAt: result.generatedAt,
    status: result.status,
  });
}

export async function POST(
  _request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { projectId } = await context.params;

  const result = await generateTimetable(
    projectId,
    access.schoolAccountId!,
  );

  if (!result.found) {
    return NextResponse.json(
      {
        success: false,
        error: "مشروع الجدول غير موجود.",
      },
      { status: 404 },
    );
  }

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        errors: result.errors,
      },
      { status: 422 },
    );
  }

  const saved = await saveGeneratedTimetable(
    projectId,
    access.schoolAccountId!,
    result.sessions,
  );

  if (!saved) {
    return NextResponse.json(
      {
        success: false,
        error: "تعذر حفظ الجدول الناتج.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    sessions: result.sessions,
    generatedAt: new Date().toISOString(),
  });
}