import fs from "node:fs";
import path from "node:path";

const bankPath = path.join(
  process.cwd(),
  "data",
  "ai-report",
  "generated",
  "teacher-performance-knowledge-bank.json",
);

const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));

function normalize(value) {
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

const synonyms = {
  "نهايه وحده": [
    "وحده دراسيه",
    "ختام الوحده",
    "تقويم ختامي",
    "نواتج التعلم",
    "تحقق الاهداف",
    "مستوي الاتقان",
    "تحليل نتائج",
    "خطه علاجيه",
    "توصيات",
  ],
};

function terms(prompt) {
  const normalized = normalize(prompt);
  const set = new Set(normalized.split(" ").filter((x) => x.length >= 3));

  for (const [key, values] of Object.entries(synonyms)) {
    if (normalized.includes(key)) {
      set.add(key);
      for (const value of values) {
        set.add(normalize(value));
        for (const token of normalize(value).split(" ")) {
          if (token.length >= 3) set.add(token);
        }
      }
    }
  }

  return Array.from(set);
}

function score(item, searchTerms) {
  const text = item.searchableText || "";
  let total = 0;

  for (const term of searchTerms) {
    if ((item.optionLabel || "").includes(term)) total += 12;
    if ((item.fieldLabel || "").includes(term)) total += 9;
    if ((item.reportName || "").includes(term)) total += 8;
    if ((item.performanceElement || "").includes(term)) total += 6;
    if (text.includes(term)) total += 2;
  }

  return total;
}

const prompt = "أبي تقرير عن نهاية وحدة";
const searchTerms = terms(prompt);

const matches = bank.items
  .map((item) => ({
    score: score(item, searchTerms),
    reportName: item.reportName,
    performanceElement: item.performanceElement,
    fieldLabel: item.fieldLabel,
    optionLabel: item.optionLabel,
  }))
  .filter((item) => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 20);

console.log("Prompt:", prompt);
console.log("Knowledge counts:", bank.counts);
console.log("Matches:", matches.length);
console.table(matches);