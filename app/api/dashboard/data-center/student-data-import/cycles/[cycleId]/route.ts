import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import {
  deleteStudentDataCycle,
  normalizeStudentDataCycleId,
  StudentDataCycleDeleteError,
} from "@/lib/data-center/delete-student-data-cycle";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ cycleId: string }> | { cycleId: string };
};

async function getParams(context: RouteContext) {
  return await context.params;
}

function computeCycleStatus(sessions: Array<{ status: string }>, isArchived?: boolean) {
  if (isArchived) {
    return "ARCHIVED";
  }

  if (sessions.some((session) => session.status !== "COMMITTED")) {
    return "REVIEW_PENDING";
  }

  if (sessions.some((session) => session.status === "COMMITTED")) {
    return "COMMITTED";
  }

  return "DRAFT";
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const current = await resolveCurrentSchoolContext();
    const params = await getParams(context);

    const cycle = await prisma.noorImportCycle.findFirst({
      where: {
        id: params.cycleId,
        schoolAccountId: current.schoolAccountId,
      },
    });

    if (!cycle) {
      return NextResponse.json(
        { error: "لم يتم العثور على بطاقة بيانات الطلاب." },
        { status: 404 },
      );
    }

    const sessions = await prisma.studentImportSession.findMany({
      where: {
        cycleId: cycle.id,
        schoolAccountId: current.schoolAccountId,
      },
      include: {
        files: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const latestSession = sessions[0] ?? null;
    const committedSessions = sessions.filter((session) => session.status === "COMMITTED");
    const pendingSessions = sessions.filter((session) => session.status !== "COMMITTED");
    const latestCommitted = committedSessions[0] ?? null;

    const planGroups = latestSession
      ? await prisma.studentImportRow.groupBy({
          by: ["planAction"],
          where: {
            sessionId: latestSession.id,
          },
          _count: {
            _all: true,
          },
        })
      : [];

    const planSummary = planGroups.reduce(
      (summary, item) => {
        summary[item.planAction || "NEEDS_REVIEW"] = item._count._all;
        return summary;
      },
      {} as Record<string, number>,
    );

    const activeStudentsCount = await prisma.student.count({
      where: {
        schoolAccountId: current.schoolAccountId,
        isActive: true,
      },
    });

    return NextResponse.json({
      cycle: {
        ...cycle,
        status: computeCycleStatus(sessions, cycle.isArchived),
        totalSessions: sessions.length,
        pendingSessions: pendingSessions.length,
        committedSessions: committedSessions.length,
        totalStudents: latestCommitted?.totalRows ?? latestSession?.totalRows ?? activeStudentsCount,
        latestSession,
        latestCommitted,
        planSummary,
      },
      sessions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر جلب بطاقة بيانات الطلاب.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await resolveCurrentSchoolContext();
    const params = await getParams(context);
    const deleted = await deleteStudentDataCycle({
      cycleId: normalizeStudentDataCycleId(params.cycleId),
      schoolAccountId: current.schoolAccountId,
      actorUserId: current.user.id,
    });

    return NextResponse.json({
      message: "تم حذف بطاقة بيانات الطلاب بنجاح، وتم الاحتفاظ بالتقارير السابقة.",
      deleted,
    });
  } catch (error) {
    if (error instanceof StudentDataCycleDeleteError) {
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
      "STUDENT_DATA_CARD_DELETE_ERROR",
      error instanceof Error ? error.message : "UNKNOWN",
    );
    return NextResponse.json(
      { error: "تعذر حذف بطاقة بيانات الطلاب. حاول مرة أخرى." },
      { status: 500 },
    );
  }
}
