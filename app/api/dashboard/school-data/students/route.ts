import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseNoorExcel } from "@/lib/noor/excel-parser";
import { createStudentImportSession } from "@/engine/students/student-import-engine";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";

export const runtime = "nodejs";

const MAX_EXCEL_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_EXCEL_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
  "",
]);

function hasExcelExtension(fileName: string) {
  return /\.(xlsx|xls|csv)$/i.test(fileName);
}

function validateExcelFile(file: File) {
  if (file.size <= 0) {
    return "ملف Excel فارغ.";
  }

  if (file.size > MAX_EXCEL_FILE_SIZE) {
    return "حجم ملف Excel أكبر من الحد المسموح 8MB.";
  }

  if (!hasExcelExtension(file.name)) {
    return "صيغة الملف غير مدعومة. ارفع ملف xlsx أو xls أو csv.";
  }

  if (!ALLOWED_EXCEL_TYPES.has(file.type)) {
    return "نوع ملف Excel غير مسموح.";
  }

  return null;
}

export async function GET() {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const students = await prisma.student.findMany({
    where: {
      schoolAccountId: authResult.schoolAccountId,
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

  return NextResponse.json({
    success: true,
    students,
  });
}

export async function POST(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم إرفاق ملف Excel.",
      },
      { status: 400 }
    );
  }

  const validationError = validateExcelFile(file);

  if (validationError) {
    return NextResponse.json(
      {
        success: false,
        error: validationError,
      },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const rows = await parseNoorExcel(buffer);

  if (!rows.length) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم العثور على بيانات طلاب صالحة داخل الملف.",
      },
      { status: 400 }
    );
  }

  const session = await createStudentImportSession({
    schoolAccountId: authResult.schoolAccountId,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    rows,
  });

  return NextResponse.json({
    success: true,
    message: "تم تحليل الملف وإنشاء دفعة استيراد للمراجعة.",
    sessionId: session.id,
  });
}
