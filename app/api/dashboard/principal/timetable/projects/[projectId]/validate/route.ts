import { NextResponse } from "next/server";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { validateTimetableProject } from "@/lib/timetable/timetable-validation-service";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(
  _request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { projectId } = await context.params;

  const result = await validateTimetableProject(
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
    issues: result.issues,
    summary: result.summary,
  });
}