import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { buildResultsAnalysisAccessWhere } from "@/lib/results-analysis/results-analysis-access";

type RouteContext = {
  params: Promise<{
    analysisId: string;
  }>;
};

type ExportRow = {
  studentName?: unknown;
  nationalId?: unknown;
  grade?: unknown;
  classroom?: unknown;
  semester?: unknown;
  subject?: unknown;
  score?: unknown;
  maxScore?: unknown;
  percentage?: unknown;
  status?: unknown;
  sourceFile?: unknown;
};

function asRows(value: unknown): ExportRow[] {
  return Array.isArray(value) ? (value as ExportRow[]) : [];
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(rows: ExportRow[]) {
  const headers = [
    "اسم الطالب/الطالبة",
    "رقم الهوية",
    "الصف",
    "الفصل",
    "الفصل الدراسي",
    "المادة",
    "الدرجة",
    "النهاية العظمى",
    "النسبة",
    "الحالة",
    "مصدر الملف",
  ];

  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row: any) =>
      [
        row.studentName,
        row.nationalId,
        row.grade,
        row.classroom,
        row.semester,
        row.subject,
        row.score,
        row.maxScore,
        row.percentage,
        row.status,
        row.sourceFile,
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  return "\uFEFF" + lines.join("\r\n");
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (!authResult.isAdmin && !authResult.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم ربط الحساب بمدرسة.",
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      { status: 403 }
    );
  }

  const { analysisId } = await context.params;

  const analysis = await prisma.resultsAnalysis.findFirst({
    where: buildResultsAnalysisAccessWhere(analysisId, {
      schoolAccountId: authResult.schoolAccountId,
      isAdmin: authResult.isAdmin,
    }),
    select: {
      id: true,
      title: true,
      rowsJson: true,
    },
  });

  if (!analysis) {
    return NextResponse.json(
      {
        success: false,
        error: "تحليل النتائج غير موجود أو لا تملك صلاحية الوصول إليه.",
      },
      { status: 404 }
    );
  }

  const rows = asRows(analysis.rowsJson);
  const csv = buildCsv(rows);

  const safeName = analysis.title
    .replace(/[^\w\-\u0600-\u06FF ]/g, "_")
    .slice(0, 80);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        safeName || "results-analysis"
      )}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
