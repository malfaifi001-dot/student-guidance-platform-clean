import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  requireTimetableApiAccess,
} from "@/lib/timetable/timetable-access";

import {
  createTimetableV3Project,
  listTimetableV3Projects,
} from "@/lib/timetable-v3/project-setup-service";

const createSchema =
  z.object({
    name:
      z.string()
        .trim()
        .min(1)
        .max(120),

    academicYear:
      z.string()
        .trim()
        .min(1)
        .max(40),

    semester:
      z.enum([
        "FIRST",
        "SECOND",
      ]),
  });

export async function GET() {
  const access =
    await requireTimetableApiAccess({
      requireActiveSubscription:
        true,
    });

  if (!access.ok) {
    return access.response;
  }

  const projects =
    await listTimetableV3Projects(
      access.schoolAccountId!,
    );

  return NextResponse.json({
    success:
      true,

    projects,
  });
}

export async function POST(
  request: Request,
) {
  const access =
    await requireTimetableApiAccess({
      requireActiveSubscription:
        true,
    });

  if (!access.ok) {
    return access.response;
  }

  const body =
    await request
      .json()
      .catch(
        () => null,
      );

  const parsed =
    createSchema.safeParse(
      body,
    );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "أكمل بيانات المشروع.",
      },
      {
        status:
          400,
      },
    );
  }

  try {
    const project =
      await createTimetableV3Project(
        access.schoolAccountId!,
        access.user.id,
        parsed.data,
      );

    return NextResponse.json(
      {
        success:
          true,

        project,
      },
      {
        status:
          201,
      },
    );
  }
  catch (error) {
    console.error(
      "TIMETABLE_V3_PROJECT_CREATE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "تعذر إنشاء المشروع.",
      },
      {
        status:
          400,
      },
    );
  }
}