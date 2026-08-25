import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { mergeEditableAi, validateAiPatch } from "@/lib/assessments-center/assessment-ai-edit";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ analysisId: string }> }) {
  const auth = await requireSchoolDashboardApiContext();
  if (auth instanceof Response) return auth;
  const guard = await requireServiceAccessApi("assessment-center");
  if (guard) return guard;
  const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: (await context.params).analysisId, schoolAccountId: auth.schoolAccountId, uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, select: { id: true, title: true, uploadMode: true, summaryJson: true, createdAt: true, updatedAt: true } });
  if (!analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ success: true, analysis });
}

export async function PATCH(request: Request, context: { params: Promise<{ analysisId: string }> }) {
  const auth = await requireSchoolDashboardApiContext();
  if (auth instanceof Response) return auth;
  const guard = await requireServiceAccessApi("assessment-center");
  if (guard) return guard;
  const { analysisId } = await context.params;
  const body = await request.json().catch(() => null) as { ai?: unknown } | null;
  const validation = validateAiPatch(body?.ai);
  if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: analysisId, schoolAccountId: auth.schoolAccountId, uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, select: { id: true, summaryJson: true } });
  if (!analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
  const snapshot = analysis.summaryJson && typeof analysis.summaryJson === "object" ? analysis.summaryJson as Record<string, unknown> : {};
  const nextSnapshot = { ...snapshot, ai: mergeEditableAi(snapshot.ai, validation.value), aiMeta: { ...(snapshot.aiMeta && typeof snapshot.aiMeta === "object" ? snapshot.aiMeta : {}), aiManuallyEdited: true, editedAt: new Date().toISOString() } };
  await prisma.assessmentAnalysis.update({ where: { id: analysis.id }, data: { summaryJson: nextSnapshot as Prisma.InputJsonValue } });
  return NextResponse.json({ success: true, snapshot: nextSnapshot });
}
