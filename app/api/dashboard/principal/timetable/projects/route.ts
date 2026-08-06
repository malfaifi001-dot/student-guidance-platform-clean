import { NextResponse } from "next/server";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import {
  createTimetableProject,
  listTimetableProjects,
} from "@/lib/timetable/timetable-project-service";
import { timetableProjectInputSchema } from "@/lib/timetable/timetable-schemas";

export async function GET() {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const projects = await listTimetableProjects(access.schoolAccountId!);

  return NextResponse.json({
    success: true,
    projects,
  });
}

export async function POST(request: Request) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = timetableProjectInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "بيانات الجدول غير صالحة.",
      },
      { status: 400 },
    );
  }

  const project = await createTimetableProject(
    access.schoolAccountId!,
    access.user.id,
    parsed.data,
  );

  return NextResponse.json(
    {
      success: true,
      project,
    },
    { status: 201 },
  );
}