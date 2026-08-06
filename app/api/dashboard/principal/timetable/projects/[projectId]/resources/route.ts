import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import {
  createTimetableAssignment,
  createTimetableClass,
  createTimetableClassSubject,
  createTimetableSubject,
  createTimetableTeacher,
  deleteTimetableResource,
  findScopedProject,
  isTimetableResourceName,
} from "@/lib/timetable/timetable-data-service";
import {
  timetableAssignmentInputSchema,
  timetableClassInputSchema,
  timetableClassSubjectInputSchema,
  timetableSubjectInputSchema,
  timetableTeacherInputSchema,
} from "@/lib/timetable/timetable-schemas";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(
  request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { projectId } = await context.params;

  const project = await findScopedProject(
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

  const body = await request.json().catch(() => null);
  const resource = String(body?.resource || "");

  if (!isTimetableResourceName(resource)) {
    return NextResponse.json(
      {
        success: false,
        error: "نوع البيانات غير صالح.",
      },
      { status: 400 },
    );
  }

  try {
    if (resource === "teachers") {
      const parsed = timetableTeacherInputSchema.safeParse(
        body?.data,
      );

      if (!parsed.success) {
        return invalid(parsed.error.issues[0]?.message);
      }

      const item = await createTimetableTeacher(
        projectId,
        access.schoolAccountId!,
        parsed.data,
      );

      return created(item);
    }

    if (resource === "classes") {
      const parsed = timetableClassInputSchema.safeParse(
        body?.data,
      );

      if (!parsed.success) {
        return invalid(parsed.error.issues[0]?.message);
      }

      const item = await createTimetableClass(
        projectId,
        access.schoolAccountId!,
        parsed.data,
      );

      return created(item);
    }

    if (resource === "subjects") {
      const parsed = timetableSubjectInputSchema.safeParse(
        body?.data,
      );

      if (!parsed.success) {
        return invalid(parsed.error.issues[0]?.message);
      }

      const item = await createTimetableSubject(
        projectId,
        access.schoolAccountId!,
        parsed.data,
      );

      return created(item);
    }

    if (resource === "class-subjects") {
      const parsed =
        timetableClassSubjectInputSchema.safeParse(
          body?.data,
        );

      if (!parsed.success) {
        return invalid(parsed.error.issues[0]?.message);
      }

      const item = await createTimetableClassSubject(
        projectId,
        access.schoolAccountId!,
        parsed.data,
      );

      return created(item);
    }

    const parsed = timetableAssignmentInputSchema.safeParse(
      body?.data,
    );

    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message);
    }

    const item = await createTimetableAssignment(
      projectId,
      access.schoolAccountId!,
      parsed.data,
    );

    return created(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "PROJECT_RESOURCE_MISMATCH") {
      return invalid(
        "المعلم أو الفصل أو المادة لا تتبع مشروع الجدول.",
      );
    }

    if (message === "ASSIGNED_LESSONS_OVERFLOW") {
      return invalid(
        "عدد الحصص المسندة أكبر من حصص المادة في الفصل.",
      );
    }

    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002") ||
      message.includes("Unique constraint") ||
      message.includes("UniqueConstraint")
    ) {
      return invalid("هذه البيانات مضافة مسبقًا.");
    }

    if (process.env.NODE_ENV === "development") {
      console.error("Timetable resource creation failed", {
        projectId,
        schoolAccountId: access.schoolAccountId,
        resource,
        error,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "تعذر حفظ البيانات الآن. تحقق من البيانات ثم حاول مرة أخرى.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: Context,
) {
  const access = await requireTimetableApiAccess();

  if (!access.ok) {
    return access.response;
  }

  const { projectId } = await context.params;

  const project = await findScopedProject(
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

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "";
  const id = url.searchParams.get("id") || "";

  if (!isTimetableResourceName(resource) || !id) {
    return invalid("طلب الحذف غير صالح.");
  }

  try {
    const result = await deleteTimetableResource(
      projectId,
      access.schoolAccountId!,
      resource,
      id,
    );

    if (!result.count) {
      return NextResponse.json(
        {
          success: false,
          error: "العنصر غير موجود.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "لا يمكن حذف العنصر قبل حذف البيانات المرتبطة به.",
      },
      { status: 409 },
    );
  }
}

function invalid(message?: string) {
  return NextResponse.json(
    {
      success: false,
      error: message || "البيانات غير صالحة.",
    },
    { status: 400 },
  );
}

function created(item: unknown) {
  return NextResponse.json(
    {
      success: true,
      item,
    },
    { status: 201 },
  );
}
