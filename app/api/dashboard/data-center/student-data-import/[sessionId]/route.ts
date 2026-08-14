import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import {
  deleteStudentImportSession,
  normalizeStudentImportSessionId,
  StudentImportDeleteError,
} from "@/lib/data-center/delete-student-import-session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

async function getParams(context: RouteContext) {
  return await context.params;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const current = await resolveCurrentSchoolContext();
    const params = await getParams(context);

    const session = await prisma.studentImportSession.findFirst({
      where: {
        id: params.sessionId,
        schoolAccountId: current.schoolAccountId,
      },
      include: {
        files: true,
        _count: {
          select: {
            rows: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "لم يتم العثور على تحديث بيانات الطلاب." },
        { status: 404 },
      );
    }

    const planGroups = await prisma.studentImportRow.groupBy({
      by: ["planAction"],
      where: {
        sessionId: session.id,
      },
      _count: {
        _all: true,
      },
    });

    return NextResponse.json({
      session: {
        ...session,
        rowCount: session._count.rows,
        planSummary: planGroups.reduce(
          (summary, item) => {
            summary[item.planAction || "NEEDS_REVIEW"] = item._count._all;
            return summary;
          },
          {} as Record<string, number>,
        ),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر جلب تحديث بيانات الطلاب.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await resolveCurrentSchoolContext();
    const params = await getParams(context);

    const deleted = await deleteStudentImportSession({
      sessionId: normalizeStudentImportSessionId(params.sessionId),
      schoolAccountId: current.schoolAccountId,
      actorUserId: current.user.id,
    });

    return NextResponse.json({
      message: "تم حذف ملف بيانات الطلاب بنجاح.",
      deleted,
    });
  } catch (error) {
    if (error instanceof StudentImportDeleteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "NOT_FOUND" ? 404 : 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER") {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول بحساب مرتبط بمدرسة." },
        { status: 401 },
      );
    }

    console.error(
      "STUDENT_DATA_IMPORT_DELETE_ERROR",
      error instanceof Error ? error.message : "UNKNOWN",
    );

    return NextResponse.json(
      { error: "تعذر حذف ملف بيانات الطلاب. حاول مرة أخرى." },
      { status: 500 },
    );
  }
}
