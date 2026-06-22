import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { parseAssessmentExcel } from "@/lib/assessment-center/assessment-center-parser";
import { analyzeAssessmentRows } from "@/engine/assessment-center/assessment-center-engine";
import { buildAssessmentAnalysisSummary } from "@/lib/assessment-center/assessment-analysis-summary";
import { linkAssessmentRowsToStudents } from "@/lib/assessment-center/assessment-center-student-linking";

export const runtime = "nodejs";

const MAX_ASSESSMENT_FILE_SIZE = 8 * 1024 * 1024;

function hasExcelExtension(fileName: string) {
  return /\.(xlsx|xls|csv)$/i.test(fileName);
}

function validateFile(file: File) {
  if (file.size <= 0) return "ملف النتائج فارغ.";

  if (file.size > MAX_ASSESSMENT_FILE_SIZE) {
    return "حجم ملف النتائج أكبر من الحد المسموح 8MB.";
  }

  if (!hasExcelExtension(file.name)) {
    return "صيغة الملف غير مدعومة. ارفع ملف xlsx أو xls أو csv.";
  }

  return null;
}

export async function POST(request: Request) {
  const context = await requireSchoolDashboardApiContext();

  if (context instanceof Response) {
    return context;
  }

  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;

  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const title = String(formData.get("title") || "").trim();
    const uploadMode = String(formData.get("uploadMode") || "GENERAL").trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "ملف Excel مطلوب.",
        },
        { status: 400 }
      );
    }

    const validationError = validateFile(file);

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
    const parsedRows = await parseAssessmentExcel(buffer);

    if (!parsedRows.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "لم يتم العثور على بيانات صالحة. تأكد من وجود أعمدة: اسم الطالب، المادة، الدرجة، الدرجة الكلية.",
        },
        { status: 400 }
      );
    }

    const students = await prisma.student.findMany({
      where: {
        schoolAccountId: context.schoolAccountId,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        nationalId: true,
        grade: true,
        classroom: true,
      },
    });

    const linkedRows = linkAssessmentRowsToStudents({
      rows: parsedRows,
      students,
    });

    const analysisOutput = analyzeAssessmentRows(linkedRows);
    const summary = buildAssessmentAnalysisSummary(analysisOutput.rows);

    const analysis = await prisma.assessmentAnalysis.create({
      data: {
        schoolAccountId: context.schoolAccountId,
        title:
          title ||
          `تحليل اختبارات - ${new Date().toLocaleDateString("ar-SA")}`,
        sourceFile: file.name,
        uploadMode: uploadMode || "GENERAL",
        totalStudents: summary.totalStudents,
        totalRows: summary.totalRows,
        totalSubjects: summary.totalSubjects,
        averagePercentage: summary.averagePercentage,
        summaryJson: summary,
        rowsJson: analysisOutput.rows,
      },
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تحليل ملف النتائج.",
      },
      { status: 400 }
    );
  }
}
