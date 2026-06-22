import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { analyzeAssessmentRows } from "@/engine/assessment-center/assessment-center-engine";
import { buildAssessmentAnalysisSummary } from "@/lib/assessment-center/assessment-analysis-summary";
import type { AssessmentResultRow } from "@/lib/assessment-center/assessment-center-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    analysisId: string;
  }>;
};

type LinkRowsRequest = {
  action?: "LINK" | "UNLINK";
  rowIds?: string[];
  studentId?: string | null;
};

function asRows(value: unknown): AssessmentResultRow[] {
  if (!Array.isArray(value)) return [];
  return value as AssessmentResultRow[];
}

async function readBody(request: Request): Promise<LinkRowsRequest> {
  try {
    return (await request.json()) as LinkRowsRequest;
  } catch {
    return {};
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) {
    return auth;
  }

  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;

  const { analysisId } = await context.params;
  const body = await readBody(request);

  const rowIds = Array.isArray(body.rowIds)
    ? body.rowIds.filter((id) => typeof id === "string" && id.length > 0)
    : [];

  if (!rowIds.length) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم تحديد نتائج للربط.",
      },
      { status: 400 }
    );
  }

  const isAdmin = Boolean((auth as any).isAdmin);

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: {
      id: analysisId,
      ...(isAdmin
        ? {}
        : {
            schoolAccountId: auth.schoolAccountId,
          }),
    },
  });

  if (!analysis) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم العثور على التحليل.",
      },
      { status: 404 }
    );
  }

  const schoolAccountId = analysis.schoolAccountId || auth.schoolAccountId;

  if (!schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "لا يمكن تحديد المدرسة المرتبطة بهذا التحليل.",
      },
      { status: 400 }
    );
  }

  const action = body.action === "UNLINK" ? "UNLINK" : "LINK";

  const targetStudent =
    action === "LINK" && body.studentId
      ? await prisma.student.findFirst({
          where: {
            id: body.studentId,
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
        })
      : null;

  if (action === "LINK" && !targetStudent) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم العثور على الطالب المحدد داخل مركز البيانات.",
      },
      { status: 404 }
    );
  }

  const rowIdSet = new Set(rowIds);
  const rows = asRows(analysis.rowsJson);

  let updatedCount = 0;

  const updatedRows = rows.map((row) => {
    if (!rowIdSet.has(row.id)) return row;

    updatedCount += 1;

    if (action === "UNLINK") {
      return {
        ...row,
        studentId: null,
        matchedStudentName: null,
        linkStatus: "UNMATCHED" as const,
        linkReason: "تم إلغاء الربط يدويًا من صفحة مراجعة الربط.",
      };
    }

    return {
      ...row,
      studentId: targetStudent?.id || null,
      matchedStudentName: targetStudent?.fullName || null,
      nationalId: row.nationalId || targetStudent?.nationalId || null,
      linkStatus: "LINKED" as const,
      linkReason: "تم الربط يدويًا من صفحة مراجعة الربط.",
    };
  });

  if (!updatedCount) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم العثور على النتائج المحددة داخل التحليل.",
      },
      { status: 404 }
    );
  }

  const analysisOutput = analyzeAssessmentRows(updatedRows);
  const summary = buildAssessmentAnalysisSummary(analysisOutput.rows);

  await prisma.assessmentAnalysis.update({
    where: {
      id: analysis.id,
    },
    data: {
      totalStudents: summary.totalStudents,
      totalRows: summary.totalRows,
      totalSubjects: summary.totalSubjects,
      averagePercentage: summary.averagePercentage,
      summaryJson: summary,
      rowsJson: analysisOutput.rows,
    },
  });

  await prisma.platformActivityLog
    .create({
      data: {
        schoolAccountId,
        category: "ASSESSMENT_CENTER",
        action:
          action === "LINK"
            ? "MANUAL_STUDENT_LINK"
            : "MANUAL_STUDENT_UNLINK",
        severity: "INFO",
        title:
          action === "LINK"
            ? "ربط يدوي لنتائج تحليل بطالب"
            : "إلغاء ربط نتيجة تحليل بطالب",
        details: {
          analysisId: analysis.id,
          analysisTitle: analysis.title,
          rowIds,
          studentId: targetStudent?.id || null,
          studentName: targetStudent?.fullName || null,
          updatedCount,
        },
      },
    })
    .catch(() => null);

  return NextResponse.json({
    success: true,
    updatedCount,
    summary,
  });
}
