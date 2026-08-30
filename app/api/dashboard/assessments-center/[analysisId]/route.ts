import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { mergeEditableAi, validateAiPatch } from "@/lib/assessments-center/assessment-ai-edit";
import { calculateMultiPeriod } from "@/lib/assessments-center/multi-period-calculations";
import { calculateNafsAnalysis } from "@/lib/assessments-center/nafs-calculations";
import type { MultiPeriodInput } from "@/lib/assessments-center/assessment-types";
import type { NafsAnalysisInput } from "@/lib/assessments-center/nafs-types";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ analysisId: string }> }) {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (auth instanceof Response) return auth;
  const guard = await requireServiceAccessApi("assessment-center", { allowPrincipal: true });
  if (guard) return guard;
  const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: (await context.params).analysisId, ...(auth.isAdmin ? { schoolAccountId: auth.schoolAccountId } : assessmentAnalysisOwnershipWhere(auth.schoolAccountId, auth.user.id)), uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, select: { id: true, title: true, uploadMode: true, summaryJson: true, createdAt: true, updatedAt: true } });
  if (!analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ success: true, analysis });
}

export async function PATCH(request: Request, context: { params: Promise<{ analysisId: string }> }) {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (auth instanceof Response) return auth;
  const guard = await requireServiceAccessApi("assessment-center", { allowPrincipal: true });
  if (guard) return guard;
  const { analysisId } = await context.params;
  const body = await request.json().catch(() => null) as { ai?: unknown; input?: unknown } | null;
  if (body?.input !== undefined) {
    const existing = await prisma.assessmentAnalysis.findFirst({ where: { id: analysisId, ...(auth.isAdmin ? { schoolAccountId: auth.schoolAccountId } : assessmentAnalysisOwnershipWhere(auth.schoolAccountId, auth.user.id)), uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, select: { id: true, uploadMode: true, summaryJson: true } });
    if (!existing) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
    const input = body.input as Record<string, unknown>;
    try {
      const students = Array.isArray(input.students) ? input.students : [];
      if (!students.length || students.length > 2000 || !String(input.title || "").trim() || !String(input.subject || "").trim() || !String(input.grade || "").trim() || !String(input.classroom || "").trim()) throw new Error("INVALID_ANALYSIS_INPUT");
      const maximumScore = Number(input.maximumScore);
      if (!Number.isFinite(maximumScore) || maximumScore <= 0 || maximumScore > 100000) throw new Error("INVALID_MAXIMUM_SCORE");
      const linkedIds = students.map((value) => { const row = value as Record<string, unknown>; return typeof row.studentId === "string" && row.studentId.trim() ? row.studentId.trim() : null; }).filter((id): id is string => Boolean(id));
      if (linkedIds.length) {
        const linkedCount = await prisma.student.count({ where: { schoolAccountId: auth.schoolAccountId, isActive: true, id: { in: linkedIds } } });
        if (linkedCount !== linkedIds.length) throw new Error("INVALID_STUDENT_LINK");
      }
      if (existing.uploadMode === "NAFS_PRE_POST") {
        const nafsInput: NafsAnalysisInput = { title: String(input.title).trim().slice(0, 180), subject: String(input.subject).trim().slice(0, 120), grade: String(input.grade).trim().slice(0, 120), classroom: String(input.classroom).trim().slice(0, 120), totalScore: maximumScore, students: students.map((value) => { const row = value as Record<string, unknown>; const scoreMap = row.scores && typeof row.scores === "object" ? row.scores as Record<string, unknown> : {}; return { studentId: typeof row.studentId === "string" ? row.studentId : "", studentName: String(row.studentName || "").trim(), preScore: scoreMap.PRE == null ? null : Number(scoreMap.PRE), postScore: scoreMap.POST == null ? null : Number(scoreMap.POST), grade: String(row.grade || input.grade).trim() || null, classroom: String(row.classroom || input.classroom).trim() || null }; }) };
        if (nafsInput.students.some((student) => !student.studentName || Object.values({ pre: student.preScore, post: student.postScore }).some((score) => score !== null && (!Number.isFinite(score) || score < 0 || score > maximumScore)))) throw new Error("INVALID_SCORE_DATA");
        const result = calculateNafsAnalysis(nafsInput);
        const current = existing.summaryJson && typeof existing.summaryJson === "object" ? existing.summaryJson as Record<string, unknown> : {};
        const snapshot = { ...current, ...nafsInput, ...result, aiMeta: { ...(current.aiMeta && typeof current.aiMeta === "object" ? current.aiMeta : {}), aiStale: true, aiStaleAt: new Date().toISOString() } };
        await prisma.assessmentAnalysis.update({ where: { id: existing.id }, data: { title: nafsInput.title, totalStudents: result.statistics.studentCount, totalRows: result.statistics.studentCount, averagePercentage: result.statistics.postAverage, summaryJson: snapshot as Prisma.InputJsonValue, rowsJson: result.students as unknown as Prisma.InputJsonValue } });
        return NextResponse.json({ success: true, snapshot });
      }
      const multiInput = input as unknown as MultiPeriodInput;
      if (!Array.isArray(multiInput.periods) || !multiInput.periods.length || multiInput.periods.length > 20 || students.some((value) => { const row = value as Record<string, unknown>; return !String(row.studentName || "").trim() || !row.scores || typeof row.scores !== "object" || Object.values(row.scores as Record<string, unknown>).some((score) => score !== null && (!Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > maximumScore)); })) throw new Error("INVALID_SCORE_DATA");
      const snapshot = calculateMultiPeriod({ ...multiInput, maximumScore, title: String(input.title).trim().slice(0, 180), subject: String(input.subject).trim().slice(0, 120), grade: String(input.grade).trim().slice(0, 120), classroom: String(input.classroom).trim().slice(0, 120) });
      const current = existing.summaryJson && typeof existing.summaryJson === "object" ? existing.summaryJson as Record<string, unknown> : {};
      const nextSnapshot = { ...snapshot, ai: current.ai ?? null, aiMeta: { ...(current.aiMeta && typeof current.aiMeta === "object" ? current.aiMeta : {}), aiStale: true, aiStaleAt: new Date().toISOString() } };
      await prisma.assessmentAnalysis.update({ where: { id: existing.id }, data: { title: snapshot.title, totalStudents: snapshot.students.length, totalRows: snapshot.students.length, averagePercentage: snapshot.periodMetrics.at(-1)?.average, summaryJson: nextSnapshot as Prisma.InputJsonValue, rowsJson: snapshot.students as unknown as Prisma.InputJsonValue } });
      return NextResponse.json({ success: true, snapshot: nextSnapshot });
    } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "INVALID_ANALYSIS_INPUT" }, { status: 400 }); }
  }
  const validation = validateAiPatch(body?.ai);
  if (!validation.success) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: analysisId, ...(auth.isAdmin ? { schoolAccountId: auth.schoolAccountId } : assessmentAnalysisOwnershipWhere(auth.schoolAccountId, auth.user.id)), uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, select: { id: true, summaryJson: true } });
  if (!analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
  const snapshot = analysis.summaryJson && typeof analysis.summaryJson === "object" ? analysis.summaryJson as Record<string, unknown> : {};
  const nextSnapshot = { ...snapshot, ai: mergeEditableAi(snapshot.ai, validation.value), aiMeta: { ...(snapshot.aiMeta && typeof snapshot.aiMeta === "object" ? snapshot.aiMeta : {}), aiManuallyEdited: true, editedAt: new Date().toISOString() } };
  await prisma.assessmentAnalysis.update({ where: { id: analysis.id }, data: { summaryJson: nextSnapshot as Prisma.InputJsonValue } });
  return NextResponse.json({ success: true, snapshot: nextSnapshot });
}

export async function DELETE(_request: Request, context: { params: Promise<{ analysisId: string }> }) {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (auth instanceof Response) return auth;
  const guard = await requireServiceAccessApi("assessment-center", { allowPrincipal: true });
  if (guard) return guard;

  const { analysisId } = await context.params;
  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: {
      id: analysisId,
      ...(auth.isAdmin ? { schoolAccountId: auth.schoolAccountId } : assessmentAnalysisOwnershipWhere(auth.schoolAccountId, auth.user.id)),
      uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] },
    },
    select: { id: true },
  });

  if (!analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });

  await prisma.assessmentAnalysis.delete({ where: { id: analysis.id } });
  return NextResponse.json({ success: true });
}
