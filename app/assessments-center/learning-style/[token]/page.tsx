import { prisma } from "@/lib/prisma";
import { LearningStylePublicForm } from "@/components/assessments-center/learning-style-public-form";

export const dynamic = "force-dynamic";

export default async function LearningStylePublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rows = await prisma.assessmentAnalysis.findMany({ where: { uploadMode: "LEARNING_STYLE" }, select: { summaryJson: true }, take: 100 });
  const found = rows.map((row) => row.summaryJson as Record<string, unknown>).find((snapshot) => snapshot.publicToken === token);
  if (!found) return <main dir="rtl" className="p-8 text-center font-bold">الرابط غير متاح.</main>;
  const students = Array.isArray(found.students) ? found.students.map((value) => value as Record<string, unknown>).filter((value) => typeof value.studentKey === "string" && typeof value.studentName === "string").map((value) => ({ id: value.studentKey as string, name: value.studentName as string, completed: value.completed === true })) : [];
  const questions = Array.isArray(found.questions) ? found.questions as Array<{ id: string; label: string; options: string[] }> : [];
  return <main dir="rtl" className="min-h-screen bg-slate-50 p-4"><div className="mx-auto max-w-2xl space-y-4"><section className="rounded-3xl border bg-white p-6 shadow-sm"><p className="font-bold text-teal-700">مركز التقييمات</p><h1 className="mt-2 text-2xl font-black">{String(found.title || "تحليل أنماط التعلم")}</h1><p className="mt-2 text-sm font-bold text-slate-500">الصف {String(found.grade || "—")} · الفصل {String(found.classroom || "—")}</p></section><LearningStylePublicForm token={token} students={students} questions={questions} gender={typeof found.teacherGender === "string" ? found.teacherGender : null} /></div></main>;
}
