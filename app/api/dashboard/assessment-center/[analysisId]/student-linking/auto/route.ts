import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { analyzeAssessmentRows } from "@/engine/assessment-center/assessment-center-engine";
import { buildAssessmentAnalysisSummary } from "@/lib/assessment-center/assessment-analysis-summary";
import { linkAssessmentRowsToStudents } from "@/lib/assessment-center/assessment-center-student-linking";
import type { AssessmentResultRow } from "@/lib/assessment-center/assessment-center-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    analysisId: string;
  }>;
};

function asRows(value: unknown): AssessmentResultRow[] {
  if (!Array.isArray(value)) return [];
  return value as AssessmentResultRow[];
}

export async function PATCH(_request: Request, context: RouteContext) {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) return auth;

  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;

  const { analysisId } = await context.params;
  const isAdmin = Boolean((auth as any).isAdmin);

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: {
      id: analysisId,
      ...(isAdmin ? {} : { schoolAccountId: auth.schoolAccountId }),
    },
  });

  if (!analysis) {
    return NextResponse.json(
      { success: false, error: "لم يتم العثور على التحليل." },
      { status: 404 }
    );
  }

  const schoolAccountId = analysis.schoolAccountId || auth.schoolAccountId;

  if (!schoolAccountId) {
    return NextResponse.json(
      { success: false, error: "لا يمكن تحديد المدرسة." },
      { status: 400 }
    );
  }

  const rows = asRows(analysis.rowsJson);
  const unlinkedRows = rows.filter((row) => !row.studentId);

  const students = await prisma.student.findMany({
    where: {
      schoolAccountId,
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

  const relinkedRows = linkAssessmentRowsToStudents({
    rows: unlinkedRows,
    students,
  });

  const relinkedMap = new Map(relinkedRows.map((row) => [row.id, row]));
  const beforeLinked = rows.filter((row) => row.studentId).length;

  const updatedRows = rows.map((row) => {
    if (row.studentId) return row;
    return relinkedMap.get(row.id) || row;
  });

  const afterLinked = updatedRows.filter((row) => row.studentId).length;
  const linkedCount = afterLinked - beforeLinked;

  const analysisOutput = analyzeAssessmentRows(updatedRows);
  const summary = buildAssessmentAnalysisSummary(analysisOutput.rows);

  await prisma.assessmentAnalysis.update({
    where: { id: analysis.id },
    data: {
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
    linkedCount,
    summary,
  });
}
