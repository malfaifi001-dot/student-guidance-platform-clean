import { isActivityProgramDomainServiceSlug } from "@/lib/activity-programs/activity-program-catalog";

export interface BoardDef {
  id: string;
  label: string;
}

export const BOARDS: BoardDef[] = [
  { id: "all", label: "الكل" },
  { id: "guidance", label: "الموجه الطلابي" },
  { id: "activity", label: "رائد النشاط" },
  { id: "teacher", label: "المعلم" },
];

export function classifyServiceSlug(slug: string): string {
  if (
    slug === "teacher-report-issuance" ||
    slug.startsWith("teacher-") ||
    slug.endsWith("_performance") ||
    slug.includes("_interaction") ||
    slug.includes("_diversity") ||
    slug.includes("_improvement") ||
    slug.includes("_preparation") ||
    slug.includes("_technology") ||
    slug.includes("_environment") ||
    slug.includes("_management") ||
    slug.includes("_analysis")
  ) {
    return "teacher";
  }

  if (isActivityProgramDomainServiceSlug(slug)) return "activity";
  return "guidance";
}

export function filterServicesByBoard<T extends { slug: string }>(
  services: T[],
  boardId: string,
): T[] {
  if (boardId === "all") return services;
  return services.filter((s) => classifyServiceSlug(s.slug) === boardId);
}
