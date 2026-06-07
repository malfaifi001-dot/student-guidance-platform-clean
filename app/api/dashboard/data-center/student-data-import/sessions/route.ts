import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await resolveCurrentSchoolContext();

    const sessions = await prisma.studentImportSession.findMany({
      where: {
        schoolAccountId: context.schoolAccountId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
      include: {
        files: true,
        rows: {
          orderBy: { rowIndex: "asc" },
          take: 12,
        },
        _count: {
          select: { rows: true },
        },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((session: any) => ({
        ...session,
        rowCount: session._count.rows,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر جلب جلسات الاستيراد.",
      },
      { status: 500 },
    );
  }
}