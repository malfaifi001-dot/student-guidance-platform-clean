import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

async function getParams(context: RouteContext) {
  return await context.params;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const current = await resolveCurrentSchoolContext();
    const params = await getParams(context);
    const url = new URL(request.url);

    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const pageSize = Math.min(
      Math.max(Number(url.searchParams.get("pageSize") || "50"), 10),
      200,
    );

    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const planAction = (url.searchParams.get("planAction") || "").trim();

    const session = await prisma.studentImportSession.findFirst({
      where: {
        id: params.sessionId,
        schoolAccountId: current.schoolAccountId,
      },
      select: {
        id: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "لم يتم العثور على جلسة الاستيراد." },
        { status: 404 },
      );
    }

    const where: any = {
      sessionId: session.id,
    };

    if (status) {
      where.status = status;
    }

    if (planAction) {
      where.planAction = planAction;
    }

    if (q) {
      where.OR = [
        { fullName: { contains: q } },
        { nationalId: { contains: q } },
        { guardianName: { contains: q } },
        { grade: { contains: q } },
        { classroom: { contains: q } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.studentImportRow.count({ where }),
      prisma.studentImportRow.findMany({
        where,
        orderBy: {
          rowIndex: "asc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر جلب صفوف جلسة الاستيراد.",
      },
      { status: 500 },
    );
  }
}
