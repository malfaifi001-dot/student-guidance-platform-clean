import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    analysisId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) {
    return auth;
  }

  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;

  const { analysisId } = await context.params;
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

  await prisma.assessmentAnalysis.delete({
    where: {
      id: analysis.id,
    },
  });

  await prisma.platformActivityLog
    .create({
      data: {
        schoolAccountId: analysis.schoolAccountId,
        category: "ASSESSMENT_CENTER",
        action: "DELETE_ANALYSIS",
        severity: "WARNING",
        title: "حذف تحليل من مركز التحليل والاختبارات",
        details: {
          analysisId: analysis.id,
          title: analysis.title,
          sourceFile: analysis.sourceFile,
          totalStudents: analysis.totalStudents,
          totalRows: analysis.totalRows,
        },
      },
    })
    .catch(() => null);

  return NextResponse.json({
    success: true,
  });
}