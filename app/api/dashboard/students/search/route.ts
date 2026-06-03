import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";

export async function GET(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "";

  if (query.length > 80) {
    return NextResponse.json(
      {
        success: false,
        error: "عبارة البحث طويلة جدًا.",
      },
      { status: 400 }
    );
  }

  const students = await prisma.student.findMany({
    where: {
      schoolAccountId: authResult.schoolAccountId,
      isActive: true,
      ...(query
        ? {
            OR: [
              {
                fullName: {
                  contains: query,
                },
              },
              {
                nationalId: {
                  contains: query,
                },
              },
            ],
          }
        : {}),
    },
    include: {
      guardian: true,
    },
    orderBy: {
      fullName: "asc",
    },
    take: 20,
  });

  return NextResponse.json({
    success: true,
    students,
  });
}
