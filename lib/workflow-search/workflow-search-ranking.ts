import type { WorkflowSearchResult } from "./workflow-search-types";
import { WORKFLOW_SEARCH_RESULT_LIMIT } from "./workflow-search-types";

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;

// Keep this list intentionally small and tied to terminology used by Teachix services.
const SEARCH_SYNONYM_GROUPS = [
  ["تعزيز", "تحفيز"],
  ["ولي الامر", "الاسرة"],
  ["استدعاء", "طلب حضور"],
  ["تحصيل", "نتائج"],
  ["متابعة", "رصد"],
] as const;

export function normalizeWorkflowSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ar")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ");
}

function getTokens(value: string) {
  return normalizeWorkflowSearchText(value).split(" ").filter(Boolean);
}

function getSynonymAlternatives(token: string) {
  const normalizedToken = normalizeWorkflowSearchText(token);
  const group = SEARCH_SYNONYM_GROUPS.find((items) =>
    items.some((item) => normalizeWorkflowSearchText(item) === normalizedToken),
  );

  return group
    ? group.map((item) => normalizeWorkflowSearchText(item)).filter((item) => item !== normalizedToken)
    : [];
}

function getSynonymQueryVariants(query: string) {
  const variants = new Set<string>();
  for (const group of SEARCH_SYNONYM_GROUPS) {
    const normalizedGroup = group.map((item) => normalizeWorkflowSearchText(item));
    for (const term of normalizedGroup) {
      if (!query.includes(term)) continue;
      for (const replacement of normalizedGroup) {
        if (replacement !== term) {
          variants.add(query.replace(term, replacement));
        }
      }
    }
  }
  return [...variants];
}

function levenshteinDistance(first: string, second: string) {
  if (first === second) return 0;
  if (!first.length) return second.length;
  if (!second.length) return first.length;

  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= second.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[second.length];
}

function fuzzyMatchScore(queryToken: string, textToken: string) {
  const length = Math.max(queryToken.length, textToken.length);
  if (length < 4) return 0;

  const distance = levenshteinDistance(queryToken, textToken);
  const allowedDistance = length >= 8 ? 2 : 1;
  if (distance > allowedDistance) return 0;

  const similarity = 1 - distance / length;
  const minimumSimilarity = length >= 8 ? 0.72 : 0.8;
  return similarity >= minimumSimilarity ? 1 : 0;
}

function tokenMatchScore(queryToken: string, textTokens: string[]) {
  const alternatives = getSynonymAlternatives(queryToken);
  let best = 0;

  for (const textToken of textTokens) {
    if (textToken === queryToken) {
      best = Math.max(best, 3);
      continue;
    }

    if (
      queryToken.length >= 3 &&
      (textToken.includes(queryToken) || queryToken.includes(textToken))
    ) {
      best = Math.max(best, 2);
      continue;
    }

    if (alternatives.some((alternative) => textToken === alternative || textToken.includes(alternative))) {
      best = Math.max(best, 1);
      continue;
    }

    if (fuzzyMatchScore(queryToken, textToken)) {
      best = Math.max(best, 0.5);
    }
  }

  return best;
}

/** Returns a deterministic relevance score from 0 to 100; matching stays server-side. */
export function rankWorkflowSearchText(value: string, query: string) {
  const text = normalizeWorkflowSearchText(value);
  const normalizedQuery = normalizeWorkflowSearchText(query);
  if (!text || !normalizedQuery) return 0;
  if (text === normalizedQuery) return 100;
  if (text.startsWith(normalizedQuery)) return 94;
  if (text.includes(normalizedQuery)) return 88;

  const synonymVariantMatch = getSynonymQueryVariants(normalizedQuery).some(
    (variant) => text === variant || text.startsWith(variant) || text.includes(variant),
  );
  if (synonymVariantMatch) return 70;

  const queryTokens = getTokens(normalizedQuery);
  const textTokens = getTokens(text);
  if (!queryTokens.length || !textTokens.length) return 0;

  const scores = queryTokens.map((token) => tokenMatchScore(token, textTokens));
  const matched = scores.filter((score) => score > 0);
  if (!matched.length) return 0;

  const coverage = matched.length / queryTokens.length;
  const average = matched.reduce((sum, score) => sum + score, 0) / matched.length;
  const hasFuzzyOnlyMatch = matched.every((score) => score === 0.5);
  const hasSynonymMatch = matched.some((score) => score === 1);

  // Exact/partial tokens remain ahead of synonym and typo matches.
  const base = hasFuzzyOnlyMatch ? 34 : hasSynonymMatch ? 52 : 68;
  return Math.min(86, base + coverage * 10 + average * 2);
}

export function sortWorkflowSearchResults(results: WorkflowSearchResult[]) {
  return [...results]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ar"))
    .slice(0, WORKFLOW_SEARCH_RESULT_LIMIT);
}
