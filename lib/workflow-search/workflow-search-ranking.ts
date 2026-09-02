import type { WorkflowSearchResult } from "./workflow-search-types";
import { WORKFLOW_SEARCH_RESULT_LIMIT } from "./workflow-search-types";

export function normalizeWorkflowSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ");
}

export function rankWorkflowSearchText(value: string, query: string) {
  const text = normalizeWorkflowSearchText(value);
  const normalizedQuery = normalizeWorkflowSearchText(query);
  if (!text || !normalizedQuery) return 0;
  if (text === normalizedQuery) return 100;
  if (text.startsWith(normalizedQuery)) return 75;
  if (text.includes(normalizedQuery)) return 50;

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const matched = tokens.filter((token) => text.includes(token)).length;
  return matched ? 20 + matched * 5 : 0;
}

export function sortWorkflowSearchResults(results: WorkflowSearchResult[]) {
  return [...results]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ar"))
    .slice(0, WORKFLOW_SEARCH_RESULT_LIMIT);
}
