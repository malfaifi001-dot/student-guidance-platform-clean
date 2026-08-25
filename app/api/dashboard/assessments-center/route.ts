import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logPlatformActivity } from "@/lib/admin/activity-log";
import { calculateNafsAnalysis } from "@/lib/assessments-center/nafs-calculations";
import type { NafsAnalysisInput } from "@/lib/assessments-center/nafs-types";
import { calculateMultiPeriod } from "@/lib/assessments-center/multi-period-calculations";
import type { MultiPeriodInput } from "@/lib/assessments-center/assessment-types";

export const runtime = "nodejs";

function validScore(value: unknown, totalScore: number) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > totalScore) throw new Error("INVALID_SCORE");
  return score;
}

function normalizeInput(value: unknown): NafsAnalysisInput {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const totalScore = Number(body.totalScore);
  if (!Number.isFinite(totalScore) || totalScore <= 0 || totalScore > 100000) throw new Error("INVALID_TOTAL_SCORE");
  const rawStudents = Array.isArray(body.students) ? body.students : [];
  if (!rawStudents.length || rawStudents.length > 2000) throw new Error("INVALID_STUDENTS");
  const students = rawStudents.map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const studentId = String(row.studentId || "").trim();
    const studentName = String(row.studentName || "").trim();
    if (!studentId || !studentName) throw new Error("INVALID_STUDENT");
    return { studentId, studentName, preScore: validScore(row.preScore, totalScore), postScore: validScore(row.postScore, totalScore), grade: String(row.grade || "").trim() || null, classroom: String(row.classroom || "").trim() || null };
  });
  return { title: String(body.title || "تحليل نتائج نافس").trim().slice(0, 180) || "تحليل نتائج نافس", subject: String(body.subject || "").trim().slice(0, 120), grade: String(body.grade || "").trim().slice(0, 120), classroom: String(body.classroom || "").trim().slice(0, 120), semester: String(body.semester || "").trim().slice(0, 120) || undefined, academicYear: String(body.academicYear || "").trim().slice(0, 120) || undefined, totalScore, students };
}

export async function GET(request: Request) {
  const context = await requireSchoolDashboardApiContext();
  if (context instanceof Response) return context;
  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;
  const url = new URL(request.url);
  const grade = url.searchParams.get("grade")?.trim() || "";
  const classroom = url.searchParams.get("classroom")?.trim() || "";
  const [students, studentCount, profile, grades, classrooms, current, analyses] = await Promise.all([
    prisma.student.findMany({ where: { schoolAccountId: context.schoolAccountId, isActive: true, ...(grade ? { grade } : {}), ...(classroom ? { classroom } : {}) }, select: { id: true, fullName: true, grade: true, classroom: true }, orderBy: { fullName: "asc" }, take: 2000 }),
    prisma.student.count({ where: { schoolAccountId: context.schoolAccountId, isActive: true } }),
    prisma.schoolProfile.findUnique({ where: { schoolAccountId: context.schoolAccountId }, select: { schoolName: true, logoUrl: true, principalName: true, educationDepartment: true, educationOffice: true, academicYear: true, currentSemester: true } }),
    prisma.student.findMany({ where: { schoolAccountId: context.schoolAccountId, isActive: true, grade: { not: null } }, distinct: ["grade"], select: { grade: true }, orderBy: { grade: "asc" } }),
    prisma.student.findMany({ where: { schoolAccountId: context.schoolAccountId, isActive: true, ...(grade ? { grade } : {}), classroom: { not: null } }, distinct: ["classroom"], select: { classroom: true }, orderBy: { classroom: "asc" } }),
    getCurrentSessionUser(),
    prisma.assessmentAnalysis.findMany({ where: { schoolAccountId: context.schoolAccountId, uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, title: true, uploadMode: true, totalStudents: true, averagePercentage: true, createdAt: true, updatedAt: true, summaryJson: true } }),
  ]);
  return NextResponse.json({ success: true, hasStudentData: studentCount > 0, students, grades: grades.map((item) => item.grade).filter(Boolean), classrooms: classrooms.map((item) => item.classroom).filter(Boolean), profile, teacherName: current?.user?.name || null, analyses });
}

export async function POST(request: Request) {
  const context = await requireSchoolDashboardApiContext();
  if (context instanceof Response) return context;
  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;
  try {
    const body = await request.json();
    if (body?.type) {
      const input = body as MultiPeriodInput;
      if (!Number.isFinite(Number(input.maximumScore)) || Number(input.maximumScore) <= 0 || !Array.isArray(input.periods) || !Array.isArray(input.students) || input.students.some((student) => !student.studentName?.trim() || Object.values(student.scores || {}).some((score) => score !== null && (!Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > Number(input.maximumScore))))) throw new Error("INVALID_SCORE_DATA");
      const linkedIds = input.students.map((student) => student.studentId).filter((id): id is string => typeof id === "string" && id.length > 0);
      if (linkedIds.length) { const count = await prisma.student.count({ where: { schoolAccountId: context.schoolAccountId, isActive: true, id: { in: linkedIds } } }); if (count !== linkedIds.length) throw new Error("INVALID_STUDENT_LINK"); }
      const snapshot = calculateMultiPeriod(input);
      const analysis = await prisma.assessmentAnalysis.create({ data: { schoolAccountId: context.schoolAccountId, title: input.title, status: input.type, uploadMode: input.type, totalStudents: input.students.length, totalRows: input.students.length, totalSubjects: 1, averagePercentage: snapshot.periodMetrics.at(-1)?.average, summaryJson: JSON.parse(JSON.stringify(snapshot)), rowsJson: JSON.parse(JSON.stringify(snapshot.students)) } });
      await logPlatformActivity({ actorUserId: context.user.id, schoolAccountId: context.schoolAccountId, category: "REPORT", action: "assessment-analysis-created", severity: "SUCCESS", title: "Assessment analysis created", details: { analysisId: analysis.id, type: input.type } });
      return NextResponse.json({ success: true, analysisId: analysis.id, snapshot });
    }
    const input = normalizeInput(body);
    const result = calculateNafsAnalysis(input);
    const snapshot = { ...input, ...result, ai: null, aiMeta: null };
    const analysis = await prisma.assessmentAnalysis.create({ data: { schoolAccountId: context.schoolAccountId, title: input.title, status: "NAFS_PRE_POST", uploadMode: "NAFS_PRE_POST", totalStudents: result.statistics.studentCount, totalRows: result.statistics.studentCount, totalSubjects: 1, averagePercentage: result.statistics.postAverage, summaryJson: snapshot, rowsJson: result.students } });
    await logPlatformActivity({ actorUserId: context.user.id, schoolAccountId: context.schoolAccountId, category: "REPORT", action: "nafs-analysis-created", severity: "SUCCESS", title: "NAFS analysis created", details: { analysisId: analysis.id } });
    return NextResponse.json({ success: true, analysisId: analysis.id, snapshot });
  } catch (error) {
    const code = error instanceof Error ? error.message : "NAFS_SAVE_FAILED";
    return NextResponse.json({ success: false, error: code }, { status: 400 });
  }
}
