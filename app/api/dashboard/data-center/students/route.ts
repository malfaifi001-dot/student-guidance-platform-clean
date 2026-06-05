import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await resolveCurrentSchoolContext();
    const url = new URL(request.url);

    const q = (url.searchParams.get("q") || "").trim();
    const grade = (url.searchParams.get("grade") || "").trim();
    const classroom = (url.searchParams.get("classroom") || "").trim();
    const status = (url.searchParams.get("status") || "ACTIVE").trim();

    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const pageSize = Math.min(
      Math.max(Number(url.searchParams.get("pageSize") || "40"), 10),
      100,
    );

    const where: any = {
      schoolAccountId: context.schoolAccountId,
    };

    if (status === "ACTIVE") {
      where.isActive = true;
    }

    if (status === "INACTIVE") {
      where.isActive = false;
    }

    if (grade) {
      where.grade = grade;
    }

    if (classroom) {
      where.classroom = classroom;
    }

    if (q) {
      where.OR = [
        { fullName: { contains: q } },
        { nationalId: { contains: q } },
        { grade: { contains: q } },
        { classroom: { contains: q } },
        {
          guardian: {
            is: {
              name: { contains: q },
            },
          },
        },
      ];
    }

    const [total, students, filterSource] = await prisma.$transaction([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          guardian: true,
        },
        orderBy: [
          { grade: "asc" },
          { classroom: "asc" },
          { fullName: "asc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.student.findMany({
        where: {
          schoolAccountId: context.schoolAccountId,
        },
        select: {
          grade: true,
          classroom: true,
          isActive: true,
        },
      }),
    ]);

    const grades = Array.from(
      new Set(filterSource.map((item: any) => item.grade).filter(Boolean)),
    ).sort();

    const classrooms = Array.from(
      new Set(filterSource.map((item: any) => item.classroom).filter(Boolean)),
    ).sort();

    const activeCount = filterSource.filter((item: any) => item.isActive).length;
    const inactiveCount = filterSource.filter((item: any) => !item.isActive).length;

    return NextResponse.json({
      students: students.map((student: any) => ({
        id: student.id,
        fullName: student.fullName,
        nationalId: student.nationalId,
        gender: student.gender,
        stage: student.stage,
        grade: student.grade,
        classroom: student.classroom,
        isActive: student.isActive,
        guardian: student.guardian
          ? {
              id: student.guardian.id,
              name: student.guardian.name,
              phone: student.guardian.phone,
              relation: student.guardian.relation,
            }
          : null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
      filters: {
        grades,
        classrooms,
      },
      stats: {
        total: filterSource.length,
        active: activeCount,
        inactive: inactiveCount,
        grades: grades.length,
        classrooms: classrooms.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر جلب سجل الطلاب.",
      },
      { status: 500 },
    );
  }
}
