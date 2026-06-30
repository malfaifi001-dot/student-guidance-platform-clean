import fs from "node:fs";
import path from "node:path";

import type {
  AiReportKnowledgeBank,
  AiReportKnowledgeItem,
  AiReportKnowledgeMatch,
  AiReportKnowledgeReportMatch,
  AiReportKnowledgeSearchResult,
} from "@/lib/ai-report/ai-report-knowledge-types";

const KNOWLEDGE_BANK_PATH = path.join(
  process.cwd(),
  "data",
  "ai-report",
  "generated",
  "teacher-performance-knowledge-bank.json",
);

let cachedBank: AiReportKnowledgeBank | null = null;

const DOMAIN_SYNONYMS: Record<string, string[]> = {
  "نهاية وحدة": [
    "وحدة دراسية",
    "ختام الوحدة",
    "تقويم ختامي",
    "نواتج التعلم",
    "تحقق الاهداف",
    "مستوى الاتقان",
    "تحليل نتائج",
    "خطة علاجية",
    "توصيات",
  ],
  "نهايه وحده": [
    "وحدة دراسية",
    "ختام الوحدة",
    "تقويم ختامي",
    "نواتج التعلم",
    "تحقق الاهداف",
    "مستوى الاتقان",
    "تحليل نتائج",
    "خطة علاجية",
    "توصيات",
  ],
  "درس": [
    "خطة درس",
    "تنفيذ درس",
    "استراتيجيات التدريس",
    "التهيئة",
    "التقويم",
  ],
  "تقنية": [
    "تقنيات التعلم",
    "وسائل التعلم",
    "منصة تعليمية",
    "تعلم رقمي",
    "ادوات رقمية",
  ],
  "تقويم": [
    "تقويم قبلي",
    "تقويم تكويني",
    "تقويم ختامي",
    "تقويم ادائي",
    "روبرك",
  ],
  "ادارة صفية": [
    "قواعد الصف",
    "تنظيم السلوك",
    "ادارة وقت الحصة",
    "الانضباط الايجابي",
  ],
};

export function normalizeAiReportArabicText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeAiReportArabicText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);
}

function expandPromptTerms(prompt: string) {
  const normalizedPrompt = normalizeAiReportArabicText(prompt);
  const terms = new Set<string>();

  for (const token of tokenize(normalizedPrompt)) {
    terms.add(token);
  }

  for (const [key, values] of Object.entries(DOMAIN_SYNONYMS)) {
    const normalizedKey = normalizeAiReportArabicText(key);

    if (normalizedPrompt.includes(normalizedKey)) {
      terms.add(normalizedKey);

      for (const value of values) {
        terms.add(normalizeAiReportArabicText(value));
        for (const token of tokenize(value)) {
          terms.add(token);
        }
      }
    }
  }

  return Array.from(terms).filter(Boolean);
}

function getKnowledgeBank(): AiReportKnowledgeBank {
  if (cachedBank) return cachedBank;

  if (!fs.existsSync(KNOWLEDGE_BANK_PATH)) {
    throw new Error(
      `AI report knowledge bank is missing. Run: node scripts/build-ai-report-knowledge-bank.mjs`,
    );
  }

  const raw = fs.readFileSync(KNOWLEDGE_BANK_PATH, "utf8");
  cachedBank = JSON.parse(raw) as AiReportKnowledgeBank;

  return cachedBank;
}

function scoreKnowledgeItem(item: AiReportKnowledgeItem, terms: string[]) {
  const searchable = item.searchableText || "";
  const reportName = normalizeAiReportArabicText(item.reportName);
  const performanceElement = normalizeAiReportArabicText(item.performanceElement);
  const fieldLabel = normalizeAiReportArabicText(item.fieldLabel);
  const optionLabel = normalizeAiReportArabicText(item.optionLabel);
  const category = normalizeAiReportArabicText(item.category);
  const keywords = (item.keywords || []).map(normalizeAiReportArabicText);

  let score = 0;
  const matchedTerms = new Set<string>();

  for (const term of terms) {
    if (!term) continue;

    if (optionLabel.includes(term)) {
      score += 12;
      matchedTerms.add(term);
    }

    if (fieldLabel.includes(term)) {
      score += 9;
      matchedTerms.add(term);
    }

    if (reportName.includes(term)) {
      score += 8;
      matchedTerms.add(term);
    }

    if (performanceElement.includes(term)) {
      score += 6;
      matchedTerms.add(term);
    }

    if (category.includes(term)) {
      score += 4;
      matchedTerms.add(term);
    }

    if (keywords.some((keyword) => keyword.includes(term) || term.includes(keyword))) {
      score += 4;
      matchedTerms.add(term);
    }

    if (searchable.includes(term)) {
      score += 2;
      matchedTerms.add(term);
    }
  }

  if (item.sourceType === "value_bank") {
    score += 1;
  }

  return {
    score,
    matchedTerms: Array.from(matchedTerms),
  };
}

function buildReportMatches(items: AiReportKnowledgeMatch[]) {
  const reportMap = new Map<string, AiReportKnowledgeReportMatch>();

  for (const item of items) {
    const existing = reportMap.get(item.reportSlug);

    if (!existing) {
      reportMap.set(item.reportSlug, {
        reportSlug: item.reportSlug,
        reportName: item.reportName,
        performanceElement: item.performanceElement,
        reportCategory: item.reportCategory,
        templatePattern: item.templatePattern,
        keywords: [],
        score: item.score,
        matchedItemsCount: 1,
      });
      continue;
    }

    existing.score += item.score;
    existing.matchedItemsCount += 1;
  }

  return Array.from(reportMap.values())
    .sort((a, b) => b.score - a.score || b.matchedItemsCount - a.matchedItemsCount)
    .slice(0, 12);
}

export function findRelevantAiReportKnowledge({
  prompt,
  limit = 140,
}: {
  prompt: string;
  limit?: number;
}): AiReportKnowledgeSearchResult {
  const bank = getKnowledgeBank();
  const normalizedPrompt = normalizeAiReportArabicText(prompt);
  const terms = expandPromptTerms(prompt);

  const items = bank.items
    .map((item) => {
      const result = scoreKnowledgeItem(item, terms);

      return {
        ...item,
        score: result.score,
        matchedTerms: result.matchedTerms,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.optionLabel.localeCompare(b.optionLabel, "ar");
    })
    .slice(0, limit);

  return {
    prompt,
    normalizedPrompt,
    topReports: buildReportMatches(items),
    items,
  };
}