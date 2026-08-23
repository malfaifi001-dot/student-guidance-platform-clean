import "server-only";

import { getPortfolioPerformanceElements } from "@/lib/portfolio/portfolio-performance-elements";

export type PerformanceRole = "TEACHER" | "ACTIVITY_LEADER" | "COUNSELOR" | "PRINCIPAL";

export function isPerformanceRole(value: unknown): value is PerformanceRole {
  return ["TEACHER", "ACTIVITY_LEADER", "COUNSELOR", "PRINCIPAL"].includes(String(value));
}

export function getAllowedPerformanceItems(role: PerformanceRole) {
  return getPortfolioPerformanceElements(role).map((item) => ({
    key: item.key,
    title: item.title,
    serviceSlug: item.serviceSlug,
  }));
}

export function getAllowedPerformanceItem(role: PerformanceRole, key: string) {
  return getAllowedPerformanceItems(role).find((item) => item.key === key) || null;
}
