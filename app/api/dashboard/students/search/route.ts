import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await resolveCurrentSchoolContext();
    const url = new URL(request.url);

    const q = (
      url.searchParams.get("q") ||
      url.searchParams.get("query") ||
      ""
    ).trim();

    const where: any = {
      schoolAccountId: context.schoolAccountId,
      isActive: true,
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q } },
        { nationalId: { contains: q } },
        { grade: { contains: q } },
        { classroom: { contains: q } },
        {
          guardian: {
            is: {
              name: {
                contains: q,
              },
            },
          },
        },
        {
          guardian: {
            is: {
              phone: {
                contains: q,
              },
            },
          },
        },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        guardian: true,
      },
      orderBy: [
        { grade: "asc" },
        { classroom: "asc" },
        { fullName: "asc" },
      ],
      take: 40,
    });

    return NextResponse.json({
      students: students.map((student) => ({
        id: student.id,
        fullName: student.fullName,
        nationalId: student.nationalId,
        gender: student.gender,
        stage: student.stage,
        grade: student.grade,
        classroom: student.classroom,
        guardianName: student.guardian?.name ?? null,
        guardianPhone: student.guardian?.phone ?? null,
        guardian: student.guardian
          ? {
              id: student.guardian.id,
              name: student.guardian.name,
              phone: student.guardian.phone,
              relation: student.guardian.relation,
            }
          : null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر البحث في الطلاب.",
      },
      { status: 500 },
    );
  }
}
