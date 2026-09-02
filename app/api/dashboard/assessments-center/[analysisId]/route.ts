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
import { LEARNING_STYLE_TYPE, learningStageForGrade, LEARNING_STYLE_BANKS } from "@/lib/assessments-center/learning-style";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ analysisId: string }> }) {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (auth instanceof Response) return auth;
  const guard = await requireServiceAccessApi("assessment-center", { allowPrincipal: true });
  if (guard) return guard;
  const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: (await context.params).analysisId, ...(auth.isAdmin ? { schoolAccountId: auth.schoolAccountId } : assessmentAnalysisOwnershipWhere(auth.schoolAccountId, auth.user.id, { historicalPersonalRead: true })), uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC", "LEARNING_STYLE"] } }, select: { id: true, title: true, uploadMode: true, summaryJson: true, createdAt: true, updatedAt: true } });
  if (!analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ success: true, analysis });
}

export async function PATCH(request: Request, context: { params: Promise<{ analysisId: string }> }) {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (auth instanceof Response) return auth;
  const guard = await requireServiceAccessApi("assessment-center", { allowPrincipal: true });
  if (guard) return guard;
  const { analysisId } = await context.params;
  const body = await request.json().catch(() => null) as { ai?: unknown; input?: unknown; learningStyleRoster?: unknown } | null;
  if (body && "learningStylePreference" in body) {
    const current = await prisma.assessmentAnalysis.findFirst({ where: { id: analysisId, schoolAccountId: auth.schoolAccountId, uploadMode: "LEARNING_STYLE" }, select: { summaryJson: true } });
    if (!current) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
    const snapshot = current.summaryJson && typeof current.summaryJson === "object" ? current.summaryJson as Record<string, unknown> : {};
    const next = { ...snapshot, showStudentNames: Boolean((body as Record<string, unknown>).learningStylePreference) };
    await prisma.assessmentAnalysis.update({ where: { id: analysisId }, data: { summaryJson: next as Prisma.InputJsonValue } });
    return NextResponse.json({ success: true, snapshot: next });
  }
  if (body?.learningStyleRoster && typeof body.learningStyleRoster === "object") {
    const payload = body.learningStyleRoster as Record<string, unknown>;
    const current = await prisma.assessmentAnalysis.findFirst({ where: { id: analysisId, schoolAccountId: auth.schoolAccountId, uploadMode: LEARNING_STYLE_TYPE }, select: { summaryJson: true } });
    if (!current) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });
    try {
      const title = String(payload.title || "").trim(); const grade = String(payload.grade || "").trim(); const classroom = String(payload.classroom || "").trim();
      const requested = Array.isArray(payload.students) ? payload.students : [];
      if (!title || !grade || !classroom || !requested.length || requested.length > 2000) throw new Error("INVALID_LEARNING_STYLE_ROSTER");
      const entries = requested.map((value) => value && typeof value === "object" ? value as Record<string, unknown> : {});
      const ids = entries.map((item) => String(item.studentId || "").trim()).filter(Boolean);
      if (new Set(ids).size !== ids.length) throw new Error("INVALID_LEARNING_STYLE_ROSTER");
      const linked = ids.length ? await prisma.student.findMany({ where: { schoolAccountId: auth.schoolAccountId, isActive: true, id: { in: ids }, grade, classroom }, select: { id: true, fullName: true, grade: true, classroom: true } }) : [];
      if (linked.length !== ids.length) throw new Error("INVALID_LEARNING_STYLE_ROSTER");
      const linkedById = new Map(linked.map((student) => [student.id, student]));
      const old = current.summaryJson && typeof current.summaryJson === "object" ? current.summaryJson as Record<string, unknown> : {};
      const oldByKey = new Map((Array.isArray(old.students) ? old.students : []).map((value) => { const item = value as Record<string, unknown>; return [String(item.studentKey || ""), item]; }));
      const manualNames = new Set<string>();
      const students = entries.map((item) => {
        const studentId = String(item.studentId || "").trim();
        let participant;
        if (studentId) { const student = linkedById.get(studentId); if (!student) throw new Error("INVALID_LEARNING_STYLE_ROSTER"); participant = { studentKey: student.id, studentId: student.id, studentName: student.fullName, grade: student.grade || grade, classroom: student.classroom || classroom, source: "DATA_CENTER" }; }
        else { const key = String(item.participantKey || "").trim(); const name = String(item.studentName || "").trim(); const rowGrade = String(item.grade || grade).trim(); const compatible = rowGrade.startsWith("أخرى:") || learningStageForGrade(rowGrade) === stage; const nameKey = `${name.toLocaleLowerCase()}|${rowGrade}`; if (!key.startsWith("manual-") || !name || !rowGrade || !compatible || manualNames.has(nameKey)) throw new Error("INVALID_LEARNING_STYLE_ROSTER"); manualNames.add(nameKey); participant = { studentKey: key, studentId: null, studentName: name, grade: rowGrade, classroom, source: "MANUAL" }; }
        const previous = oldByKey.get(participant.studentKey);
        return previous ? { ...previous, ...participant } : { ...participant, completed: false, classificationStatus: "NOT_COMPLETED", learningStyle: null };
      });
      const stage = payload.stage === "PRIMARY" || payload.stage === "MIDDLE" || payload.stage === "SECONDARY" ? payload.stage : learningStageForGrade(grade);
      const snapshot = { ...old, type: LEARNING_STYLE_TYPE, title, grade, classroom, stage, questions: Array.isArray(old.questions) && old.questions.length === 10 ? old.questions : LEARNING_STYLE_BANKS[stage], showStudentNames: Boolean(payload.showStudentNames), classroomStudentCount: students.length, students };
      await prisma.assessmentAnalysis.update({ where: { id: analysisId }, data: { title, totalStudents: students.length, totalRows: students.length, summaryJson: snapshot as Prisma.InputJsonValue, rowsJson: students as unknown as Prisma.InputJsonValue } });
      return NextResponse.json({ success: true, analysisId, snapshot });
    } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "INVALID_LEARNING_STYLE_ROSTER" }, { status: 400 }); }
  }
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
      uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC", "LEARNING_STYLE"] },
    },
    select: { id: true },
  });

  if (!analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_FOUND" }, { status: 404 });

  await prisma.assessmentAnalysis.delete({ where: { id: analysis.id } });
  return NextResponse.json({ success: true });
}
