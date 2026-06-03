import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { buildResultsAnalysisAccessWhere } from "@/lib/results-analysis/results-analysis-access";

type RouteContext = {
  params: Promise<{
    analysisId: string;
  }>;
};

async function deleteAnalysis(analysisId: string, scope: {
  schoolAccountId: string | null;
  isAdmin: boolean;
}) {
  const existing = await prisma.resultsAnalysis.findFirst({
    where: buildResultsAnalysisAccessWhere(analysisId, scope),
    select: {
      id: true,
    },
  });

  if (!existing) {
    return {
      ok: false,
      status: 404,
      error: "تحليل النتائج غير موجود أو لا تملك صلاحية الوصول إليه.",
    };
  }

  await prisma.resultsAnalysis.delete({
    where: {
      id: existing.id,
    },
  });

  return {
    ok: true,
    status: 200,
  };
}

export async function POST(_request: NextRequest, context: RouteContext) {
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

  try {
    const result = await deleteAnalysis(analysisId, {
      schoolAccountId: authResult.schoolAccountId,
      isAdmin: authResult.isAdmin,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف تحليل النتائج بنجاح.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "تعذر حذف تحليل النتائج.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return POST(request, context);
}
