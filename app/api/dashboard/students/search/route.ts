import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSchoolAccount } from "@/engine/students/student-import-engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("query")?.trim() || "";

  const school = await ensureDefaultSchoolAccount();

  const students = await prisma.student.findMany({
    where: {
      schoolAccountId: school.id,
      isActive: true,
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
    students,
  });
}