import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { writeNoorImportActivity } from "@/lib/data-center/noor-import-audit";
import { syncNoorImportCycle } from "@/lib/noor-import/noor-import-cycle-sync";

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
        { error: "لم يتم العثور على تحديث بيانات نور." },
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
          (summary: any, item: any) => {
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
            : "تعذر جلب تحديث بيانات نور.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await resolveCurrentSchoolContext();
    const params = await getParams(context);

    const session = await prisma.studentImportSession.findFirst({
      where: {
        id: params.sessionId,
        schoolAccountId: current.schoolAccountId,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "لم يتم العثور على تحديث بيانات نور." },
        { status: 404 },
      );
    }

    if (session.status === "COMMITTED") {
      return NextResponse.json(
        {
          error:
            "لا يمكن حذف تحديث معتمد. يمكن عرض أثره فقط حفاظًا على سجل بيانات المدرسة.",
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.studentImportSession.delete({
        where: {
          id: session.id,
        },
      });

      await syncNoorImportCycle(tx, {
        cycleId: session.cycleId,
        schoolAccountId: current.schoolAccountId,
      });
    });

    await writeNoorImportActivity({
      schoolAccountId: current.schoolAccountId,
      userId: current.user.id,
      event: "NOOR_IMPORT_SESSION_DELETED",
      title: "تم حذف تحديث بيانات نور غير معتمد",
      description: "تم حذف تحديث نور كان بانتظار المراجعة ولم يتم اعتماده.",
      metadata: {
        sessionId: session.id,
        cycleId: session.cycleId,
        title: session.title,
      },
    });

    return NextResponse.json({
      message: "تم حذف تحديث بيانات نور غير المعتمد.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر حذف تحديث بيانات نور.",
      },
      { status: 500 },
    );
  }
}
