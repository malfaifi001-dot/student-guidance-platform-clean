import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logPlatformActivity } from "@/lib/admin/activity-log";
import { generateMultiPeriodAiAnalysis, generateNafsAiAnalysis } from "@/lib/assessments-center/nafs-ai";
import { generateSubjectPeriodicAiAnalysis } from "@/lib/assessments-center/subject-periodic-ai";
import type { NafsSnapshot } from "@/lib/assessments-center/nafs-types";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (context instanceof Response) return context;
  const serviceGuard = await requireServiceAccessApi("assessment-center", { allowPrincipal: true });
  if (serviceGuard) return serviceGuard;
  try {
    const body = await request.json() as { analysisId?: unknown; snapshot?: unknown };
    const analysisId = String(body.analysisId || "");
    if (!analysisId) return NextResponse.json({ success: false, error: "ANALYSIS_REQUIRED" }, { status: 400 });
    const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: analysisId, ...(context.isAdmin ? { schoolAccountId: context.schoolAccountId } : assessmentAnalysisOwnershipWhere(context.schoolAccountId, context.user.id)), uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, select: { summaryJson: true, uploadMode: true } });
    if (!analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
    const snapshot = (analysis.uploadMode === "SUBJECT_PERIODIC" ? analysis.summaryJson : (body.snapshot || analysis.summaryJson)) as NafsSnapshot;
    const ai = analysis.uploadMode === "SUBJECT_PERIODIC"
      ? await generateSubjectPeriodicAiAnalysis(snapshot)
      : "periodMetrics" in (snapshot as object) ? await generateMultiPeriodAiAnalysis(snapshot as never) : await generateNafsAiAnalysis(snapshot);
    const nextSnapshot = { ...snapshot, ai, aiMeta: { provider: "deepseek", model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat", generatedAt: new Date().toISOString() } };
    await prisma.assessmentAnalysis.update({ where: { id: analysisId }, data: { summaryJson: nextSnapshot } });
    const current = await getCurrentSessionUser();
    await logPlatformActivity({ actorUserId: current?.user?.id, schoolAccountId: context.schoolAccountId, category: "REPORT", action: analysis.uploadMode === "SUBJECT_PERIODIC" ? "subject-periodic-ai-generated" : "nafs-ai-generated", severity: "SUCCESS", title: analysis.uploadMode === "SUBJECT_PERIODIC" ? "Subject periodic AI analysis generated" : "NAFS AI analysis generated", details: { analysisId } });
    return NextResponse.json({ success: true, snapshot: nextSnapshot });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "AI_UNAVAILABLE" }, { status: 503 });
  }
}
