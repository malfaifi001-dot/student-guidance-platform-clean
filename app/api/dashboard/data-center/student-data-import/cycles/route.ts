import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { writeNoorImportActivity } from "@/lib/data-center/noor-import-audit";

export const runtime = "nodejs";

function buildCycleTitle(academicYear: string, term: string) {
  return `بيانات الطلاب ${academicYear} - ${term}`;
}

function computeCycleStatus(sessions: Array<{ status: string }>, isArchived?: boolean) {
  if (isArchived) {
    return "ARCHIVED";
  }

  if (sessions.some((session: any) => session.status !== "COMMITTED")) {
    return "REVIEW_PENDING";
  }

  if (sessions.some((session: any) => session.status === "COMMITTED")) {
    return "COMMITTED";
  }

  return "DRAFT";
}

export async function GET() {
  try {
    const context = await resolveCurrentSchoolContext();

    const cycles = await prisma.noorImportCycle.findMany({
      where: {
        schoolAccountId: context.schoolAccountId,
      },
      orderBy: [
        { createdAt: "desc" },
      ],
    });

    const cycleIds = cycles.map((cycle: any) => cycle.id);

    const sessions = cycleIds.length
      ? await prisma.studentImportSession.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
          },
          include: {
            files: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : [];

    const sessionsByCycle = new Map<string, typeof sessions>();

    for (const session of sessions) {
      if (!session.cycleId) {
        continue;
      }

      const list = sessionsByCycle.get(session.cycleId) ?? [];
      list.push(session);
      sessionsByCycle.set(session.cycleId, list);
    }

    const responseCycles = cycles.map((cycle: any) => {
      const cycleSessions = sessionsByCycle.get(cycle.id) ?? [];
      const latestSession = cycleSessions[0] ?? null;
      const status = computeCycleStatus(cycleSessions, cycle.isArchived);
      const committedSessions = cycleSessions.filter((session: any) => session.status === "COMMITTED");
      const pendingSessions = cycleSessions.filter((session: any) => session.status !== "COMMITTED");
      const latestCommitted = committedSessions[0] ?? null;

      return {
        ...cycle,
        status,
        totalSessions: cycleSessions.length,
        pendingSessions: pendingSessions.length,
        committedSessions: committedSessions.length,
        totalStudents: latestCommitted?.totalRows ?? latestSession?.totalRows ?? cycle.totalStudents,
        latestSession,
      };
    });

    return NextResponse.json({
      cycles: responseCycles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر جلب بطاقات بيانات الطلاب.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveCurrentSchoolContext();
    const body = await request.json().catch(() => ({}));

    const academicYear = String(body.academicYear || "").trim();
    const term = String(body.term || "").trim();

    if (!academicYear) {
      return NextResponse.json(
        { error: "السنة الدراسية مطلوبة." },
        { status: 400 },
      );
    }

    if (!term) {
      return NextResponse.json(
        { error: "الفصل الدراسي مطلوب." },
        { status: 400 },
      );
    }

    const existing = await prisma.noorImportCycle.findFirst({
      where: {
        schoolAccountId: context.schoolAccountId,
        academicYear,
        term,
        isArchived: false,
      },
    });

    if (existing) {
      return NextResponse.json({
        message: "توجد بطاقة بيانات الطلاب لهذه السنة والفصل، تم فتحها بدل إنشاء نسخة مكررة.",
        cycle: existing,
      });
    }

    const cycle = await prisma.noorImportCycle.create({
      data: {
        schoolAccountId: context.schoolAccountId,
        academicYear,
        term,
        title: buildCycleTitle(academicYear, term),
        status: "DRAFT",
        createdByUserId: context.user.id,
      },
    });

    await writeNoorImportActivity({
      schoolAccountId: context.schoolAccountId,
      userId: context.user.id,
      event: "NOOR_IMPORT_CYCLE_CREATED",
      title: "تم إنشاء بطاقة بيانات الطلاب",
      description: `تم إنشاء بطاقة بيانات الطلاب للسنة ${academicYear} - ${term}.`,
      metadata: {
        cycleId: cycle.id,
        academicYear,
        term,
      },
    });

    return NextResponse.json({
      message: "تم إنشاء بطاقة بيانات الطلاب بنجاح.",
      cycle,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر إنشاء بطاقة بيانات الطلاب.",
      },
      { status: 500 },
    );
  }
}
