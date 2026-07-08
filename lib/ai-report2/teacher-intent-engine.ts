import { normalizeAiReportArabicText } from "@/lib/ai-report/ai-report-knowledge-retriever";

import {
  getTeacherPerformanceElement,
  normalizeTeacherPerformanceElementScope,
  TEACHER_PERFORMANCE_ELEMENTS,
  type TeacherPerformanceElementScope,
} from "./teacher-performance-elements";
import {
  getTeacherIntentBlueprint,
  TEACHER_INTENT_BLUEPRINTS,
  type TeacherIntentBlueprint,
} from "./teacher-intent-blueprints";

export type TeacherIntentAnalysis = {
  prompt: string;
  normalizedPrompt: string;
  performanceElementScope: TeacherPerformanceElementScope;
  selectedPerformanceElementLabel: string;
  resolvedPerformanceElementCode: string;
  resolvedPerformanceElementLabel: string;
  primaryIntent: TeacherIntentBlueprint;
  candidateIntents: Array<{
    code: string;
    label: string;
    family: string;
    score: number;
    matchedKeywords: string[];
  }>;
  confidence: number;
  teacherAction: string;
  teacherAudience: string;
  teacherPurpose: string;
  strictGuidance: string[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function scoreKeywords(text: string, keywords: string[]) {
  const matchedKeywords = keywords.filter((keyword) =>
    text.includes(normalizeAiReportArabicText(keyword)),
  );

  return {
    score: matchedKeywords.length,
    matchedKeywords,
  };
}

function inferPerformanceElementFromPrompt(normalizedPrompt: string) {
  const scored = TEACHER_PERFORMANCE_ELEMENTS.map((element) => {
    const score = element.keywords.filter((keyword) =>
      normalizedPrompt.includes(normalizeAiReportArabicText(keyword)),
    ).length;

    return {
      element,
      score,
    };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].element : null;
}

function inferSlots(prompt: string, intent: TeacherIntentBlueprint) {
  const normalized = normalizeAiReportArabicText(prompt);

  let teacherAction = "توثيق ممارسة مهنية";
  let teacherAudience = "الطلاب أو المستفيدون حسب سياق التقرير";
  let teacherPurpose = "تحسين الممارسة التعليمية وتوثيق الأثر";

  if (normalized.includes("تكريم")) {
    teacherAction = "تكريم وتحفيز";
    teacherAudience = "الطلاب المكرمون أو المتفوقون";
    teacherPurpose = "تعزيز الدافعية وإبراز النماذج الإيجابية";
  } else if (normalized.includes("احتفالية") || normalized.includes("اليوم الوطني")) {
    teacherAction = "تنفيذ فعالية أو مناسبة";
    teacherAudience = "المجتمع المدرسي أو الطلاب المشاركون";
    teacherPurpose = "تعزيز القيم والانتماء والمشاركة";
  } else if (normalized.includes("تحليل") || normalized.includes("اختبار")) {
    teacherAction = "تحليل نتائج وتشخيص مستويات";
    teacherAudience = "الطلاب محل التحليل";
    teacherPurpose = "تحديد الفجوات وبناء إجراءات تحسين";
  } else if (normalized.includes("ولي امر") || normalized.includes("اولياء الامور")) {
    teacherAction = "تواصل تربوي";
    teacherAudience = "ولي الأمر والطالب";
    teacherPurpose = "تعزيز المتابعة المشتركة وتحسين السلوك أو التعلم";
  } else if (normalized.includes("استراتيجية")) {
    teacherAction = "تطبيق استراتيجية تدريس";
    teacherAudience = "طلاب الدرس أو الصف";
    teacherPurpose = "رفع جودة التعلم وتنويع الممارسة الصفية";
  } else if (normalized.includes("تقويم")) {
    teacherAction = "استخدام أسلوب أو أداة تقويم";
    teacherAudience = "طلاب الصف أو المادة";
    teacherPurpose = "قياس التعلم وتحسين جودة التغذية الراجعة";
  } else if (normalized.includes("منصة") || normalized.includes("تقنية")) {
    teacherAction = "توظيف تقنية تعليمية";
    teacherAudience = "طلاب الصف أو المادة";
    teacherPurpose = "دعم التعلم وتحسين التفاعل";
  } else if (intent.code === "GENERAL_TEACHER_REPORT") {
    teacherAction = "إعداد تقرير عام";
  }

  return {
    teacherAction,
    teacherAudience,
    teacherPurpose,
  };
}

export function analyzeTeacherIntent({
  prompt,
  performanceElementScope,
}: {
  prompt: string;
  performanceElementScope?: unknown;
}): TeacherIntentAnalysis {
  const cleanPrompt = clean(prompt);
  const normalizedPrompt = normalizeAiReportArabicText(cleanPrompt);
  const scope = normalizeTeacherPerformanceElementScope(performanceElementScope);
  const selectedPerformanceElement = getTeacherPerformanceElement(scope);

  const candidateIntents = TEACHER_INTENT_BLUEPRINTS.map((blueprint) => {
    const keywordScore = scoreKeywords(normalizedPrompt, blueprint.keywords);
    const scopeScore =
      selectedPerformanceElement &&
      blueprint.defaultPerformanceElements.includes(selectedPerformanceElement.code)
        ? 5
        : 0;

    const score = keywordScore.score * 3 + scopeScore;

    return {
      code: blueprint.code,
      label: blueprint.label,
      family: blueprint.family,
      score,
      matchedKeywords: keywordScore.matchedKeywords,
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const primaryIntent = getTeacherIntentBlueprint(
    candidateIntents[0]?.code || "GENERAL_TEACHER_REPORT",
  );

  const inferredPerformanceElement = inferPerformanceElementFromPrompt(normalizedPrompt);
  const resolvedPerformanceElement =
    selectedPerformanceElement ||
    inferredPerformanceElement ||
    TEACHER_PERFORMANCE_ELEMENTS.find((element) =>
      primaryIntent.defaultPerformanceElements.includes(element.code),
    ) ||
    TEACHER_PERFORMANCE_ELEMENTS[TEACHER_PERFORMANCE_ELEMENTS.length - 1];

  const slots = inferSlots(cleanPrompt, primaryIntent);
  const rawConfidence =
    0.55 +
    Math.min(candidateIntents[0]?.score || 0, 8) * 0.045 +
    (selectedPerformanceElement ? 0.14 : 0);

  return {
    prompt: cleanPrompt,
    normalizedPrompt,
    performanceElementScope: scope,
    selectedPerformanceElementLabel: selectedPerformanceElement?.label || "يحدد تلقائيًا",
    resolvedPerformanceElementCode: resolvedPerformanceElement.code,
    resolvedPerformanceElementLabel: resolvedPerformanceElement.label,
    primaryIntent,
    candidateIntents,
    confidence: Math.min(0.96, Math.max(0.55, rawConfidence)),
    ...slots,
    strictGuidance: [
      `نية المعلم الأقرب: ${primaryIntent.label}`,
      `عنصر الأداء المعتمد: ${resolvedPerformanceElement.label}`,
      `ماذا فعل المعلم: ${slots.teacherAction}`,
      `لمن: ${slots.teacherAudience}`,
      `لماذا: ${slots.teacherPurpose}`,
      "ابن النموذج من منظور المعلم، وليس من منظور تشابه الكلمات فقط.",
      "لا تضف حقولًا من عناصر أداء أخرى إلا إذا ذكرها المعلم صراحة.",
      ...primaryIntent.avoidUnlessExplicit.map(
        (item) => `تجنب هذا الحقل إلا عند التصريح: ${item}`,
      ),
    ],
  };
}

export function buildTeacherRetrievalPrompt(analysis: TeacherIntentAnalysis) {
  return [
    analysis.prompt,
    analysis.primaryIntent.label,
    analysis.primaryIntent.description,
    analysis.resolvedPerformanceElementLabel,
    analysis.teacherAction,
    analysis.teacherAudience,
    analysis.teacherPurpose,
    ...analysis.primaryIntent.keywords,
    ...analysis.primaryIntent.recommendedFields,
  ].join(" ");
}