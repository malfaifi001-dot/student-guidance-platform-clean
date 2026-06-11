import { isActivityProgramDomainServiceSlug } from "@/lib/activity-programs/activity-program-catalog";

export interface BoardDef {
  id: string;
  label: string;
}

export const BOARDS: BoardDef[] = [
  { id: "all", label: "الكل" },
  { id: "guidance", label: "الموجه الطلابي" },
  { id: "activity", label: "رائد النشاط" },
];

export function classifyServiceSlug(slug: string): string {
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
