import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseResultsExcel } from "@/lib/results-analysis/results-analysis-parser";
import { analyzeStudentResults } from "@/engine/results-analysis/results-analysis-engine";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

export const runtime = "nodejs";

const MAX_RESULTS_FILE_SIZE = 8 * 1024 * 1024;
const MAX_RESULTS_FILES = 5;

const ALLOWED_RESULTS_FILE_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
  "",
]);

type ResultRowWithSource = {
  id: string;
  studentId?: string | null;
  studentName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  semester?: string | null;
  subject?: string | null;
  score?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  status?: "PASS" | "FAIL" | "NEEDS_SUPPORT" | "UNKNOWN";
  sourceFile?: string | null;
};

function hasExcelExtension(fileName: string) {
  return /\.(xlsx|xls|csv)$/i.test(fileName);
}

function validateResultsFile(file: File) {
  if (file.size <= 0) {
    return "ملف النتائج فارغ.";
  }

  if (file.size > MAX_RESULTS_FILE_SIZE) {
    return "حجم ملف النتائج أكبر من الحد المسموح 8MB.";
  }

  if (!hasExcelExtension(file.name)) {
    return "صيغة ملف النتائج غير مدعومة. ارفع ملف xlsx أو xls أو csv.";
  }

  if (!ALLOWED_RESULTS_FILE_TYPES.has(file.type)) {
    return "نوع ملف النتائج غير مسموح.";
  }

  return null;
}

export async function POST(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const serviceGuard = await requireServiceAccessApi("results-analysis");
  if (serviceGuard) return serviceGuard;

  try {
    const formData = await request.formData();

    const uploadedFiles = formData.getAll("files");
    const fallbackFile = formData.get("file");

    const files =
      uploadedFiles.length > 0
        ? uploadedFiles
        : fallbackFile
          ? [fallbackFile]
          : [];

    const title = String(formData.get("title") || "").trim();
    const grade = String(formData.get("grade") || "").trim();
    const classroom = String(formData.get("classroom") || "").trim();
    const semester = String(formData.get("semester") || "").trim();

    const excelFiles = files.filter(
      (file): file is File => file instanceof File
    );

    if (excelFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ملف Excel مطلوب.",
        },
        { status: 400 }
      );
    }

    if (excelFiles.length > MAX_RESULTS_FILES) {
      return NextResponse.json(
        {
          success: false,
          error: `يمكن رفع ${MAX_RESULTS_FILES} ملفات كحد أقصى في كل تحليل.`,
        },
        { status: 400 }
      );
    }

    for (const file of excelFiles) {
      const validationError = validateResultsFile(file);

      if (validationError) {
        return NextResponse.json(
          {
            success: false,
            error: validationError,
          },
          { status: 400 }
        );
      }
    }

    const allRows: ResultRowWithSource[] = [];

    for (const file of excelFiles) {
      const buffer = await file.arrayBuffer();
      const rows = await parseResultsExcel(buffer);

      allRows.push(
        ...rows.map((row): ResultRowWithSource => ({
          ...row,
          semester: row.semester ?? (semester || null),
          sourceFile: file.name,
        }))
      );
    }

    if (!allRows.length) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على بيانات نتائج صالحة داخل الملف.",
        },
        { status: 400 }
      );
    }

    const analysisOutput = analyzeStudentResults(allRows);
    const summary = analysisOutput.summary;

    const analysis = await prisma.resultsAnalysis.create({
      data: {
        schoolAccountId: authResult.schoolAccountId,
        title:
          title ||
          `تحليل نتائج - ${new Date().toLocaleDateString("ar-SA")}`,
        grade: grade || null,
        classroom: classroom || null,
        sourceFile: excelFiles.map((file) => file.name).join("، "),
        totalStudents: summary.totalStudents,
        totalSubjects: new Set(allRows.map((row) => row.subject).filter(Boolean))
          .size,
        averageScore: summary.averagePercentage,
        summaryJson: analysisOutput,
        rowsJson: allRows,
      },
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تحليل النتائج.",
      },
      { status: 400 }
    );
  }
}
