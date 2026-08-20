import "server-only";
import { prisma } from "@/lib/prisma";
import type { CurriculumDistribution } from "./types";

const stageOrder = new Map([
  ["المرحلة الابتدائية", 10],
  ["المرحلة المتوسطة", 20],
  ["الثانوية العامة", 30],
  ["التعليم المستمر", 40],
  ["التربية الخاصة", 50],
]);

const educationOrder = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];

function orderEducationNames<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const score = (name: string) => {
      const index = educationOrder.findIndex((word) => name.includes(word));
      return index < 0 ? 999 : index;
    };
    return score(a.name) - score(b.name) || a.name.localeCompare(b.name, "ar");
  });
}

export async function getCurriculumOptions(
  kind: string,
  params: { stageId?: string; trackId?: string; gradeId?: string; semesterId?: string; parentId?: string },
) {
  if (kind === "stages") {
    const stages = await prisma.curriculumStage.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
    return [...stages].sort((a, b) => (stageOrder.get(a.name) ?? 999) - (stageOrder.get(b.name) ?? 999));
  }
  if (kind === "child-stages" && params.parentId) {
    return prisma.curriculumStage.findMany({
      where: { parentId: params.parentId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
  }
  if (kind === "tracks" && params.stageId) {
    return prisma.curriculumTrack.findMany({ where: { stageId: params.stageId }, orderBy: { sourceKey: "asc" }, select: { id: true, name: true } });
  }
  if (kind === "grades" && params.stageId) {
    const grades = await prisma.curriculumGrade.findMany({
      where: { stageId: params.stageId, ...(params.trackId ? { trackId: params.trackId } : { trackId: null }) },
      select: { id: true, name: true },
    });
    return orderEducationNames(grades);
  }
  if (kind === "semesters" && params.gradeId) {
    return prisma.curriculumSemester.findMany({ where: { gradeId: params.gradeId }, orderBy: { sourceKey: "asc" }, select: { id: true, name: true } });
  }
  if (kind === "subjects" && params.semesterId) {
    return prisma.curriculumSubject.findMany({ where: { semesterId: params.semesterId }, orderBy: [{ isExtra: "asc" }, { name: "asc" }], select: { id: true, name: true, isExtra: true } });
  }
  return [];
}

export async function getDistribution(subjectId: string, semesterId: string): Promise<CurriculumDistribution | null> {
  const subject = await prisma.curriculumSubject.findFirst({
    where: { id: subjectId, semesterId },
    include: { semester: { include: { grade: { include: { stage: true, track: true } } } }, weeks: { orderBy: { sequence: "asc" }, include: { lessons: { orderBy: { id: "asc" } } } } },
  });
  if (!subject) return null;
  return { stage: subject.semester.grade.stage, track: subject.semester.grade.track, grade: subject.semester.grade, semester: subject.semester, subject, weeks: subject.weeks };
}
