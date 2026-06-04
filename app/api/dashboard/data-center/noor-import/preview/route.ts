import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { writeNoorImportActivity } from "@/lib/data-center/noor-import-audit";
import { parseNoorStudentWorkbook } from "@/lib/noor-import/noor-student-data-list-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await resolveCurrentSchoolContext();

    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!uploaded || typeof uploaded === "string" || typeof uploaded.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "الرجاء اختيار ملف Excel صادر من نور." },
        { status: 400 },
      );
    }

    const file = uploaded as File;
    const fileName = file.name || "noor-students.xlsx";
    const lowerName = fileName.toLowerCase();

    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
      return NextResponse.json(
        { error: "صيغة الملف غير مدعومة. ارفع ملف Excel بصيغة xlsx أو xls." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseNoorStudentWorkbook(buffer, fileName);

    if (!parsed.totalRows) {
      return NextResponse.json(
        {
          error:
            "لم يتم العثور على طلاب داخل الملف. تأكد أن الملف هو كشف بيانات الطلاب من نور.",
        },
        { status: 422 },
      );
    }

    const session = await prisma.studentImportSession.create({
      data: {
        schoolAccountId: context.schoolAccountId,
        title: `استيراد نور - ${new Date().toLocaleDateString("ar-SA")}`,
        source: "NOOR_EXCEL",
        status: "PARSED",
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        invalidRows: parsed.invalidRows,
        files: {
          create: {
            fileName,
            mimeType: file.type || null,
            size: file.size || buffer.length,
            rowCount: parsed.totalRows,
          },
        },
        rows: {
          createMany: {
            data: parsed.rows.map((row) => ({
              rowIndex: row.rowIndex,
              status: row.status,
              fullName: row.fullName,
              nationalId: row.nationalId,
              gender: row.gender,
              stage: row.stage,
              grade: row.grade,
              classroom: row.classroom,
              guardianName: row.guardianName,
              guardianPhone: row.guardianPhone,
              errorMessage: [...row.errors, ...row.warnings].join(" | ") || null,
              rawJson: {
                ...row.raw,
                errors: row.errors,
                warnings: row.warnings,
                parsedSchoolName: parsed.schoolName,
              },
            })),
          },
        },
      },
      include: {
        files: true,
        rows: {
          orderBy: { rowIndex: "asc" },
          take: 50,
        },
        _count: {
          select: { rows: true },
        },
      },
    });

    await writeNoorImportActivity({
      schoolAccountId: context.schoolAccountId,
      userId: context.user.id,
      event: "NOOR_IMPORT_PREVIEW_CREATED",
      title: "تم إنشاء معاينة استيراد بيانات نور",
      description: `تمت قراءة ${parsed.totalRows} طالب/طالبة من ملف نور قبل الاعتماد النهائي.`,
      metadata: {
        sessionId: session.id,
        fileName,
        sheetsCount: parsed.sheetsCount,
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        invalidRows: parsed.invalidRows,
        grades: parsed.grades,
        classrooms: parsed.classrooms,
      },
    });

    return NextResponse.json({
      message: "تمت قراءة ملف نور وإنشاء المعاينة بنجاح.",
      parsedSummary: {
        detectedFormat: parsed.detectedFormat,
        sheetsCount: parsed.sheetsCount,
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        invalidRows: parsed.invalidRows,
        warningsCount: parsed.warningsCount,
        schoolName: parsed.schoolName,
        grades: parsed.grades,
        classrooms: parsed.classrooms,
      },
      session: {
        ...session,
        rowCount: session._count.rows,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message === "UNAUTHENTICATED_SCHOOL_USER"
              ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة قبل رفع بيانات نور."
              : error.message
            : "تعذر رفع ملف نور.",
      },
      { status: 500 },
    );
  }
}