import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";

export const runtime = "nodejs";

function normalizeSearchQuery(value: string | null) {
  return String(value || "").trim().slice(0, 80);
}

function isUnauthenticatedSchoolUser(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER";
}

function toStudentPickerItem(student: {
  id: string;
  fullName: string;
  nationalId: string | null;
  gender: string;
  stage: string | null;
  grade: string | null;
  classroom: string | null;
  phone: string | null;
  guardian: {
    id: string;
    name: string;
    phone: string | null;
    relation: string | null;
  } | null;
}) {
  return {
    id: student.id,
    fullName: student.fullName,
    nationalId: student.nationalId,
    gender: student.gender,
    stage: student.stage,
    grade: student.grade,
    classroom: student.classroom,
    phone: student.phone,

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
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveCurrentSchoolContext();

    const q = normalizeSearchQuery(
      request.nextUrl.searchParams.get("q") ||
        request.nextUrl.searchParams.get("query"),
    );

    const where: Prisma.StudentWhereInput = {
      schoolAccountId: context.schoolAccountId,
      isActive: true,
    };

    if (q) {
      const guardians = await prisma.guardian.findMany({
        where: {
          schoolAccountId: context.schoolAccountId,
          OR: [
            {
              name: {
                contains: q,
              },
            },
            {
              phone: {
                contains: q,
              },
            },
          ],
        },
        select: {
          id: true,
        },
        take: 100,
      });

      const guardianIds = guardians.map((guardian) => guardian.id);

      const searchOr: Prisma.StudentWhereInput[] = [
        {
          fullName: {
            contains: q,
          },
        },
        {
          nationalId: {
            contains: q,
          },
        },
        {
          grade: {
            contains: q,
          },
        },
        {
          classroom: {
            contains: q,
          },
        },
        {
          phone: {
            contains: q,
          },
        },
      ];

      if (guardianIds.length > 0) {
        searchOr.push({
          guardianId: {
            in: guardianIds,
          },
        });
      }

      where.OR = searchOr;
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        guardian: true,
      },
      orderBy: [
        {
          grade: "asc",
        },
        {
          classroom: "asc",
        },
        {
          fullName: "asc",
        },
      ],
      take: 40,
    });

    return NextResponse.json({
      success: true,
      students: students.map(toStudentPickerItem),
    });
  } catch (error) {
    console.error("[students-search-api]", error);

    return NextResponse.json(
      {
        success: false,
        error: isUnauthenticatedSchoolUser(error)
          ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
          : "تعذر البحث في الطلاب.",
      },
      {
        status: isUnauthenticatedSchoolUser(error) ? 401 : 500,
      },
    );
  }
}
