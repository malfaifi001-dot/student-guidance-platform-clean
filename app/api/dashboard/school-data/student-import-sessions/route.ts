import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSchoolAccount } from "@/engine/students/student-import-engine";

export async function GET() {
  const school = await ensureDefaultSchoolAccount();

  const sessions = await prisma.studentImportSession.findMany({
    where: {
      schoolAccountId: school.id,
    },
    include: {
      files: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });


  
  return NextResponse.json({ sessions });
}