import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";

export async function GET() {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const sessions = await prisma.studentImportSession.findMany({
    where: {
      schoolAccountId: authResult.schoolAccountId,
    },
    include: {
      files: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    sessions,
  });
}
