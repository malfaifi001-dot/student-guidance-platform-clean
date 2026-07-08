import fs from "node:fs";
import path from "node:path";

import { normalizeAiReportArabicText } from "@/lib/ai-report/ai-report-knowledge-retriever";

import type { TeacherIntentAnalysis } from "./teacher-intent-engine";

type GeneratedPattern = {
  orderedLabels?: string[];
};

type GeneratedPatternsFile = {
  patternsByIntent?: Record<string, GeneratedPattern>;
  patternsByPerformanceElement?: Record<string, GeneratedPattern>;
  globalPattern?: GeneratedPattern | null;
};

let cachedPatterns: GeneratedPatternsFile | null | undefined;

const STATIC_FALLBACK_PATTERNS: Record<string, string[]> = {
  LEARNING_ENVIRONMENT_SETUP: [
    "عنوان التهيئة الصفية",
    "الصف أو الفئة المستهدفة",
    "تاريخ التنفيذ",
    "أهداف التهيئة والتحفيز",
    "إجراءات التهيئة",
    "أثر التهيئة على التعلم",
    "الشواهد والتوثيق",
  ],
  STUDENT_RECOGNITION: [
    "عنوان التكريم",
    "تاريخ التنفيذ",
    "الفئة المستهدفة",
    "عدد الطلاب المكرمين",
    "أهداف التكريم",
    "آلية التنفيذ",
    "أثر التكريم",
    "الشواهد والتوثيق",
  ],
  NATIONAL_EVENT: [
    "اسم الفعالية أو المناسبة",
    "تاريخ التنفيذ",
    "الفئة المستهدفة",
    "الأهداف الوطنية أو التربوية",
    "وصف الفعالية والفقرات المنفذة",
    "آلية التنفيذ",
    "أثر الفعالية",
    "الشواهد والتوثيق",
  ],
  LESSON_IMPLEMENTATION: [
    "موضوع الدرس",
    "المادة والصف",
    "تاريخ التنفيذ",
    "الأهداف التعليمية",
    "إجراءات التنفيذ",
    "مشاركة المتعلمين",
    "أثر التنفيذ",
    "الشواهد",
  ],
  TEACHING_STRATEGY: [
    "اسم الاستراتيجية",
    "موضوع الدرس",
    "المادة والصف",
    "تاريخ التنفيذ",
    "خطوات تطبيق الاستراتيجية",
    "دور المتعلمين",
    "أثر الاستراتيجية",
    "الشواهد",
  ],
  ASSESSMENT_PRACTICE: [
    "نوع أداة التقويم",
    "المادة والصف",
    "تاريخ التنفيذ",
    "الفئة المستهدفة",
    "الغرض من التقويم",
    "آلية التطبيق",
    "أثر التقويم",
    "الشواهد",
  ],
  RESULTS_ANALYSIS: [
    "اسم الاختبار أو الوحدة",
    "المادة والصف",
    "تاريخ الاختبار",
    "عدد الطلاب",
    "مستوى الإتقان",
    "أبرز الفجوات التعليمية",
    "الإجراءات المقترحة",
    "مؤشرات التحسن",
  ],
  REMEDIAL_PLAN: [
    "اسم الخطة العلاجية",
    "المادة والصف",
    "تاريخ بداية الخطة",
    "الفئة المستهدفة",
    "جوانب الضعف",
    "الأهداف العلاجية",
    "إجراءات التنفيذ",
    "مؤشرات التحسن",
  ],
  PARENT_COMMUNICATION: [
    "موضوع التواصل",
    "اسم الطالب",
    "الأطراف المشاركة",
    "تاريخ التواصل",
    "سبب التواصل",
    "الإجراءات المتفق عليها",
    "مخرجات التواصل",
  ],
  TECHNOLOGY_USE: [
    "اسم الأداة أو المنصة",
    "المادة والصف",
    "تاريخ التنفيذ",
    "الغرض من الاستخدام",
    "آلية التوظيف",
    "تفاعل المتعلمين",
    "الأثر على التعلم",
    "الشواهد",
  ],
  PROFESSIONAL_COMMUNITY: [
    "عنوان المشاركة المهنية",
    "الأطراف المشاركة",
    "تاريخ التنفيذ",
    "الجهة المنظمة",
    "هدف المشاركة",
    "محاور اللقاء",
    "الأثر المهني",
    "الشواهد",
  ],
  DUTY_FOLLOWUP: [
    "نوع المهمة أو التكليف",
    "تاريخ التنفيذ",
    "الفئة المستفيدة",
    "الإجراءات المنفذة",
    "مستوى الالتزام",
    "الأثر",
    "الشواهد",
  ],
  PORTFOLIO_EVIDENCE: [
    "عنوان المنجز",
    "تاريخ التوثيق",
    "مجال الارتباط بالأداء",
    "وصف المنجز",
    "الشواهد المتاحة",
    "أثر المنجز",
    "الدروس المستفادة",
  ],
  GENERAL_TEACHER_REPORT: [
    "عنوان التقرير",
    "تاريخ التنفيذ",
    "الفئة المستهدفة",
    "الغرض من التقرير",
    "الإجراءات المنفذة",
    "الأثر",
    "الشواهد",
  ],
};

function loadGeneratedPatterns() {
  if (cachedPatterns !== undefined) {
    return cachedPatterns;
  }

  const filePath = path.join(
    process.cwd(),
    "data",
    "ai-report",
    "generated",
    "teacher-report-patterns.json",
  );

  try {
    if (!fs.existsSync(filePath)) {
      cachedPatterns = null;
      return cachedPatterns;
    }

    cachedPatterns = JSON.parse(fs.readFileSync(filePath, "utf8")) as GeneratedPatternsFile;
    return cachedPatterns;
  } catch {
    cachedPatterns = null;
    return cachedPatterns;
  }
}

function isExcludedPatternLabel(label: string) {
  const normalized = normalizeAiReportArabicText(label);

  return (
    normalized.includes("تحديات") ||
    normalized.includes("تحدي") ||
    normalized.includes("صعوبات") ||
    normalized.includes("معوقات") ||
    normalized.includes("توصيات") ||
    normalized.includes("توصية") ||
    normalized.includes("مقترحات") ||
    normalized.includes("فرص التحسين") ||
    normalized.includes("مكان التنفيذ")
  );
}

function dedupeLabels(labels: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const label of labels) {
    const cleanLabel = String(label ?? "").trim();

    if (!cleanLabel || isExcludedPatternLabel(cleanLabel)) {
      continue;
    }

    const key = normalizeAiReportArabicText(cleanLabel);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleanLabel);

    if (result.length >= 14) {
      break;
    }
  }

  return result;
}

export function getTeacherReportPatternLabels(analysis: TeacherIntentAnalysis) {
  const generated = loadGeneratedPatterns();
  const intentCode = analysis.primaryIntent.code;
  const performanceCode = analysis.resolvedPerformanceElementCode;
  const performanceLabel = analysis.resolvedPerformanceElementLabel;

  const generatedByIntent =
    generated?.patternsByIntent?.[intentCode]?.orderedLabels || [];

  const generatedByPerformanceCode =
    generated?.patternsByPerformanceElement?.[performanceCode]?.orderedLabels || [];

  const generatedByPerformanceLabel =
    generated?.patternsByPerformanceElement?.[performanceLabel]?.orderedLabels || [];

  const globalLabels = generated?.globalPattern?.orderedLabels || [];
  const fallbackLabels =
    STATIC_FALLBACK_PATTERNS[intentCode] ||
    STATIC_FALLBACK_PATTERNS.GENERAL_TEACHER_REPORT;

  return dedupeLabels([
    ...fallbackLabels,
    ...generatedByIntent,
    ...generatedByPerformanceCode,
    ...generatedByPerformanceLabel,
    ...globalLabels,
  ]);
}