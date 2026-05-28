import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseNoorExcel } from "@/lib/noor/excel-parser";
import {
  createStudentImportSession,
  ensureDefaultSchoolAccount,
} from "@/engine/students/student-import-engine";

export async function GET() {
  const school = await ensureDefaultSchoolAccount();

  const students = await prisma.student.findMany({
    where: {
      schoolAccountId: school.id,
      isActive: true,
    },
    include: {
      guardian: true,
    },
    orderBy: {
      fullName: "asc",
    },
    take: 200,
  });

  return NextResponse.json({ students });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "لم يتم إرفاق ملف Excel." },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const rows = await parseNoorExcel(buffer);

  const session = await createStudentImportSession({
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    rows,
  });

  return NextResponse.json({
    message: "تم تحليل الملف وإنشاء دفعة استيراد للمراجعة.",
    sessionId: session.id,
  });
}