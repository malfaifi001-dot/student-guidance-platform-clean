import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";
import {
  DEFAULT_COUNSELOR_ASSESSMENT_REPORT_OPTIONS,
  normalizeCounselorAssessmentReportOptions,
} from "@/lib/assessment-center/assessment-report-options";

type RouteContext = { params: Promise<{ analysisId: string }> };

function isMissingReportOptionsColumn(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("reportVisibilityOptions") || message.includes("P2022");
}

async function findAnalysis(analysisId: string) {
  const auth = await requireSchoolDashboardApiContext();
  if (auth instanceof Response) return { response: auth } as const;
  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return { response: serviceGuard } as const;
  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: { id: analysisId, ...(auth.isAdmin ? { schoolAccountId: auth.schoolAccountId } : assessmentAnalysisOwnershipWhere(auth.schoolAccountId, auth.user.id, { historicalPersonalRead: true })) },
    select: { id: true, reportVisibilityOptions: true },
  });
  return { auth, analysis, response: null } as const;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const result = await findAnalysis((await context.params).analysisId);
    if (result.response) return result.response;
    if (!result.analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ success: true, options: normalizeCounselorAssessmentReportOptions(result.analysis.reportVisibilityOptions) });
  } catch (error) {
    if (isMissingReportOptionsColumn(error)) {
      return NextResponse.json({
        success: true,
        options: DEFAULT_COUNSELOR_ASSESSMENT_REPORT_OPTIONS,
        warning: "خيارات التقرير تعمل مؤقتًا بالإعدادات الافتراضية. يلزم تطبيق ترقية قاعدة البيانات لحفظ التعديلات.",
      });
    }
    console.error("Unable to load assessment report options.", error);
    return NextResponse.json({ success: false, error: "REPORT_OPTIONS_LOAD_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const result = await findAnalysis((await context.params).analysisId);
    if (result.response) return result.response;
    if (!result.analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
    const body = await request.json().catch(() => null);
    const options = normalizeCounselorAssessmentReportOptions(body);
    await prisma.assessmentAnalysis.update({ where: { id: result.analysis.id }, data: { reportVisibilityOptions: options as Prisma.InputJsonValue } });
    return NextResponse.json({ success: true, options });
  } catch (error) {
    if (isMissingReportOptionsColumn(error)) {
      return NextResponse.json({ success: false, error: "REPORT_OPTIONS_SCHEMA_PENDING" }, { status: 503 });
    }
    console.error("Unable to save assessment report options.", error);
    return NextResponse.json({ success: false, error: "REPORT_OPTIONS_SAVE_FAILED" }, { status: 500 });
  }
}
