import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseResultsExcel } from "@/lib/results-analysis/results-analysis-parser";
import { analyzeStudentResults } from "@/engine/results-analysis/results-analysis-engine";

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

export async function POST(request: Request) {
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
        { error: "ملف Excel مطلوب." },
        { status: 400 }
      );
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
        { error: "لم يتم العثور على بيانات نتائج صالحة داخل الملف." },
        { status: 400 }
      );
    }

    const analysisOutput = analyzeStudentResults(allRows);
    const summary = analysisOutput.summary;

    const analysis = await prisma.resultsAnalysis.create({
      data: {
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
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تحليل النتائج.",
      },
      { status: 400 }
    );
  }
}