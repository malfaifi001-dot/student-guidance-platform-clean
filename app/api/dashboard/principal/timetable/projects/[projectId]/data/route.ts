import { NextResponse } from "next/server";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { getTimetableProjectData } from "@/lib/timetable/timetable-data-service";

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

  const project = await getTimetableProjectData(
    projectId,
    access.schoolAccountId!,
  );

  if (!project) {
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
    project,
  });
}