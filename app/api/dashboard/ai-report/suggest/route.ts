import { NextResponse } from "next/server";

import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import {
  findRelevantAiReportKnowledge,
  normalizeAiReportArabicText,
} from "@/lib/ai-report/ai-report-knowledge-retriever";
import { normalizeAiReportSchema } from "@/lib/ai-report/ai-report-runtime-adapter";
import {
  sanitizeAiReportSchema,
  sanitizeAiReportText,
} from "@/lib/ai-report/ai-report-text-sanitizer";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";
import { extractJsonObject } from "@/lib/custom-report/custom-report-normalizer";
import {
  generateCustomReportSchema,
  type CustomReportGenerationContext,
} from "@/lib/custom-report/custom-report-ai-generator";
import type { CustomReportSchema } from "@/lib/custom-report/custom-report-types";

type ClarificationQuestionType = "text" | "textarea" | "select";

type ClarificationQuestion = {
  id: string;
  label: string;
  placeholder?: string;
  type: ClarificationQuestionType;
  options?: Array<{
    label: string;
    value: string;
  }>;
};

type IntentAnalysis = {
  confidence: number;
  reportIntent: string;
  reportFamily: string;
  reasoningSummary: string;
  missingContext: string[];
  coreFieldHints: string[];
  needsClarification: boolean;
  questions: ClarificationQuestion[];
};

const SUGGESTIVE_ANSWER_MARKERS = [
  "اقترح",
  "اقترح لي",
  "اختر",
  "اختر أنت",
  "اختر انت",
  "حدد",
  "حدد لي",
  "أعطني خيارات",
  "اعطني خيارات",
  "أعطني اقتراح",
  "اعطني اقتراح",
  "انت حدد",
  "أنت حدد",
  "ما أعرف",
  "ما اعرف",
  "غير متأكد",
  "غير متاكد",
  "لست متأكدًا",
  "لست متاكدا",
  "ما أدري",
  "ما ادري",
  "مدري",
];

const EVIDENCE_TEXT_MARKERS = [
  "الشواهد",
  "شواهد",
  "المرفقات",
  "مرفقات",
  "رفع ملف",
  "رفع ملفات",
  "رفع صورة",
  "رفع صور",
  "evidence",
  "attachment",
  "attachments",
  "file upload",
  "image upload",
];

const CLARIFICATION_QUESTION_OPTION_HINTS: Array<{
  matchers: string[];
  options: Array<{ label: string; value: string }>;
}> = [
  {
    matchers: ["نطاق التقرير", "نوع التقرير", "ما نطاق التقرير"],
    options: [
      { label: "درس", value: "lesson" },
      { label: "وحدة دراسية", value: "unit" },
      { label: "اجتماع أو جلسة", value: "meeting_session" },
      { label: "نتائج أو تحليل", value: "results_analysis" },
      { label: "خطة أو تنفيذ", value: "plan_execution" },
      { label: "نشاط أو مبادرة", value: "activity_initiative" },
    ],
  },
  {
    matchers: ["استراتيجية", "نوع الاستراتيجية", "استراتيجية التعليم النشط"],
    options: [
      { label: "التعلم التعاوني", value: "cooperative_learning" },
      { label: "التعلم بالمشروعات", value: "project_based_learning" },
      { label: "العصف الذهني", value: "brainstorming" },
      { label: "فكر زاوج شارك", value: "think_pair_share" },
      { label: "حل المشكلات", value: "problem_solving" },
      { label: "التعلم بالاكتشاف", value: "discovery_learning" },
    ],
  },
  {
    matchers: ["الفئة", "الفئة المستهدفة", "لمن", "عن من"],
    options: [
      { label: "الطلاب", value: "students" },
      { label: "المعلمون", value: "teachers" },
      { label: "أولياء الأمور", value: "guardians" },
      { label: "تنفيذ الدرس", value: "lesson_execution" },
      { label: "نتائج الطلاب", value: "student_results" },
      { label: "بيئة التعلم", value: "learning_environment" },
    ],
  },
];

function cleanText(value: unknown) {
  return typeof value === "string" ? sanitizeAiReportText(value) : "";
}

function normalizeClarificationAnswerValue(value: unknown) {
  const text = cleanText(value);
  return text || "اقترح لي";
}

function isSuggestiveAnswer(value: string): boolean {
  const normalized = normalizeAiReportArabicText(value);

  if (!normalized) {
    return false;
  }

  return SUGGESTIVE_ANSWER_MARKERS.some((marker) => {
    const normalizedMarker = normalizeAiReportArabicText(marker);
    return (
      normalized === normalizedMarker ||
      normalized.includes(normalizedMarker) ||
      normalizedMarker.includes(normalized)
    );
  });
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .map((item) => sanitizeAiReportText(item))
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }

      seen.add(item);
      return true;
    })
    .slice(0, 30);
}

function normalizeSnakeCase(value: string, fallback: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function clampConfidence(value: unknown, fallback = 0.58) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, numberValue));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .map((item) => sanitizeAiReportText(item))
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }

      seen.add(item);
      return true;
    })
    .slice(0, 8);
}

function normalizeClarificationAnswers(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, answer]) => [
        normalizeSnakeCase(key, "question"),
        normalizeClarificationAnswerValue(answer),
      ])
      .filter(([key]) => Boolean(key)),
  );
}

function buildClarificationQuestionOptions(label: string) {
  const normalizedLabel = normalizeAiReportArabicText(label);
  const match = CLARIFICATION_QUESTION_OPTION_HINTS.find((item) =>
    item.matchers.some((matcher) =>
      normalizedLabel.includes(normalizeAiReportArabicText(matcher)),
    ),
  );

  return match?.options ?? [];
}

function normalizeClarificationQuestion(
  value: unknown,
  index: number,
): ClarificationQuestion | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label = cleanText(record.label);

  if (!label) {
    return null;
  }

  const type = String(record.type || "text").trim().toLowerCase();
  const rawOptions = Array.isArray(record.options)
    ? (record.options
        .map((option, optionIndex) => {
          if (!option || typeof option !== "object") {
            return null;
          }

          const optionRecord = option as Record<string, unknown>;
          const optionLabel = cleanText(optionRecord.label);
          const optionValue = cleanText(optionRecord.value);

          if (!optionLabel || !optionValue) {
            return null;
          }

          return {
            label: optionLabel,
            value: optionValue || `option_${optionIndex + 1}`,
          };
        })
        .filter(Boolean) as ClarificationQuestion["options"])
    : undefined;
  const hintedOptions = buildClarificationQuestionOptions(label);
  const options =
    rawOptions && rawOptions.length >= 4
      ? rawOptions.slice(0, 8)
      : hintedOptions.length >= 4
        ? hintedOptions
        : rawOptions;
  const normalizedType: ClarificationQuestionType =
    options && options.length >= 4
      ? "select"
      : type === "textarea" || type === "select"
        ? type
        : "text";

  return {
    id: normalizeSnakeCase(
      cleanText(record.id),
      `clarification_question_${index + 1}`,
    ),
    label,
    placeholder: cleanText(record.placeholder),
    type: normalizedType,
    options,
  };
}

function inferReportFamily(prompt: string, knowledge: ReturnType<typeof findRelevantAiReportKnowledge>) {
  const topReport = knowledge.topReports[0];

  if (topReport?.reportCategory) {
    return sanitizeAiReportText(topReport.reportCategory);
  }

  const text = cleanText(prompt);

  if (text.includes("تحليل") || text.includes("نتائج")) {
    return "تقرير تحليل نتائج";
  }

  if (text.includes("اجتماع") || text.includes("جلسة") || text.includes("لقاء")) {
    return "تقرير اجتماع أو جلسة";
  }

  if (text.includes("خطة")) {
    return "تقرير خطة أو تنفيذ";
  }

  if (text.includes("درس") || text.includes("وحدة")) {
    return "تقرير درس أو وحدة";
  }

  return "تقرير تعليمي مخصص";
}

function buildKnowledgeSummary(knowledge: ReturnType<typeof findRelevantAiReportKnowledge>) {
  const topReports = knowledge.topReports.slice(0, 8);
  const fieldHints = Array.from(
    new Set(
      knowledge.items
        .map((item) => sanitizeAiReportText(item.fieldLabel))
        .filter(Boolean),
    ),
  ).slice(0, 18);
  const optionHints = Array.from(
    new Set(
      knowledge.items
        .map((item) => sanitizeAiReportText(item.optionLabel))
        .filter(Boolean),
    ),
  ).slice(0, 24);

  return {
    topReportsBlock:
      topReports
        .map((report, index) =>
          [
            `${index + 1}.`,
            `الاسم: ${sanitizeAiReportText(report.reportName)}`,
            `الفئة: ${sanitizeAiReportText(report.reportCategory) || "غير محددة"}`,
            `العنصر: ${sanitizeAiReportText(report.performanceElement) || "غير محدد"}`,
            `الدرجة: ${report.score}`,
          ].join(" | "),
        )
        .join("\n") || "لا توجد تقارير مرجعية كافية.",
    fieldHintsBlock:
      fieldHints.map((field, index) => `${index + 1}. ${field}`).join("\n") ||
      "لا توجد مؤشرات حقول كافية.",
    optionHintsBlock:
      optionHints.map((option, index) => `${index + 1}. ${option}`).join("\n") ||
      "لا توجد قيم مرشحة كافية.",
    fieldHints,
  };
}

function buildProfileContext(user: unknown) {
  const record = user && typeof user === "object" ? (user as Record<string, unknown>) : {};
  const stages = normalizeList(record.teachingStages);
  const specialties = normalizeList(record.teachingSpecialties);
  const subjects = normalizeList(record.teachingSubjects);

  const lines = [
    stages.length
      ? `- المراحل التعليمية في ملف المستخدم: ${stages.join("، ")}`
      : "",
    specialties.length
      ? `- التخصصات في ملف المستخدم: ${specialties.join("، ")}`
      : "",
    subjects.length
      ? `- المواد في ملف المستخدم: ${subjects.join("، ")}`
      : "",
  ].filter(Boolean);

  return {
    stages,
    specialties,
    subjects,
    block: lines.join("\n") || "لا توجد بيانات إضافية في ملف المستخدم.",
  };
}

function buildCombinedPrompt(prompt: string, clarificationAnswers: Record<string, string>) {
  const answers = Object.entries(clarificationAnswers)
    .map(([key, value]) =>
      !value.trim() || isSuggestiveAnswer(value)
        ? `- ${key}: المعلم طلب من النظام اقتراح القيمة المناسبة لهذا السؤال.`
        : `- ${key}: ${value}`,
    )
    .join("\n");

  if (!answers) {
    return prompt;
  }

  return `${prompt}\n\nإجابات التوضيح:\n${answers}`;
}

function isEvidenceLikeLabel(value: string) {
  const normalized = normalizeAiReportArabicText(value);
  return EVIDENCE_TEXT_MARKERS.some((marker) =>
    normalized.includes(normalizeAiReportArabicText(marker)),
  );
}

function buildFallbackClarificationQuestions(
  analysis: Pick<IntentAnalysis, "missingContext" | "reportFamily">,
  lowConfidence: boolean,
) {
  const questions: ClarificationQuestion[] = [];
  const missing = new Set(analysis.missingContext);

  const pushQuestion = (question: ClarificationQuestion) => {
    if (questions.some((item) => item.id === question.id)) {
      return;
    }

    questions.push(question);
  };

  if (missing.has("scope") || lowConfidence) {
    pushQuestion({
      id: "report_scope",
      label: "ما نطاق التقرير؟",
      placeholder: "مثال: درس، وحدة، اجتماع، نتائج، خطة...",
      type: "select",
      options: buildClarificationQuestionOptions("ما نطاق التقرير؟"),
    });
  }

  if (missing.has("focus") || lowConfidence) {
    pushQuestion({
      id: "report_focus",
      label: "ما أهم المحاور التي يجب أن يغطيها التقرير؟",
      placeholder: "مثال: التنفيذ، النتائج، الفجوات، التوصيات...",
      type: "textarea",
    });
  }

  if (missing.has("timeframe") || lowConfidence) {
    pushQuestion({
      id: "report_context",
      label: "ما المناسبة أو الفترة المرتبطة بالتقرير؟",
      placeholder: "مثال: نهاية وحدة، لقاء مهني، زيارة صفية...",
      type: "text",
    });
  }

  if (missing.has("audience") || questions.length < 2) {
    pushQuestion({
      id: "report_audience",
      label: "لمن أو عن من يدور التقرير؟",
      placeholder: "مثال: الطلاب، المعلمون، أولياء الأمور، تنفيذ نشاط...",
      type: "text",
    });
  }

  if (questions.length < 2) {
    pushQuestion({
      id: "report_goal",
      label: "ما النتيجة التي تريد إبرازها في التقرير؟",
      placeholder: `مثال: خلاصة ${analysis.reportFamily || "التقرير"} أو توصياته الرئيسة`,
      type: "text",
    });
  }

  return questions.slice(0, lowConfidence ? 3 : 4);
}

function buildFallbackIntentAnalysis({
  prompt,
  knowledge,
}: {
  prompt: string;
  knowledge: ReturnType<typeof findRelevantAiReportKnowledge>;
}): IntentAnalysis {
  const normalizedPrompt = cleanText(prompt);
  const tokens = normalizedPrompt.split(/\s+/).filter(Boolean);
  const hasScopeWord =
    /درس|وحدة|خطة|تقييم|تقويم|تحليل|نتائج|اجتماع|جلسة|لقاء|نشاط|مبادرة|أولياء|طلاب|تعلم|بيئة|تقنية|زيارة|متابعة|توصية/i.test(
      normalizedPrompt,
    );
  const hasFocusWord =
    /يتضمن|يشمل|محور|فجوات|توصيات|تنفيذ|أثر|مستوى|خلاصة|ملخص|تحسين|مستهدف|مؤشر/i.test(
      normalizedPrompt,
    );
  const hasTimeWord =
    /اليوم|الأسبوع|الفصل|الوحدة|الحصة|العام|الفترة|اللقاء|الاجتماع|البرنامج|النشاط|الدرس/i.test(
      normalizedPrompt,
    );
  const topScore = knowledge.topReports[0]?.score ?? 0;

  let confidence = 0.34;

  if (normalizedPrompt.length >= 24) confidence += 0.16;
  if (tokens.length >= 5) confidence += 0.12;
  if (hasScopeWord) confidence += 0.14;
  if (hasFocusWord) confidence += 0.12;
  if (knowledge.topReports.length > 0) confidence += 0.08;
  if (knowledge.items.length >= 15) confidence += 0.08;
  if (topScore >= 24) confidence += 0.06;
  if (normalizedPrompt.length < 14) confidence -= 0.14;
  if (!hasScopeWord) confidence -= 0.1;
  if (!hasFocusWord) confidence -= 0.08;

  const finalConfidence = Math.max(0.2, Math.min(0.9, confidence));
  const reportFamily = inferReportFamily(prompt, knowledge);
  const missingContext = [
    !hasScopeWord ? "scope" : "",
    !hasFocusWord ? "focus" : "",
    !hasTimeWord ? "timeframe" : "",
    !/طلاب|معلمين|أولياء|مجتمع|إدارة|صف|فصل|مادة|وحدة|نشاط/i.test(normalizedPrompt)
      ? "audience"
      : "",
  ].filter(Boolean);
  const needsClarification = finalConfidence < 0.75;

  const coreFieldHints = Array.from(
    new Set(
      knowledge.items
        .map((item) => sanitizeAiReportText(item.fieldLabel))
        .filter(Boolean),
    ),
  ).slice(0, 8);

  return {
    confidence: finalConfidence,
    reportIntent: normalizedPrompt || "إنشاء تقرير مخصص",
    reportFamily,
    reasoningSummary:
      finalConfidence >= 0.75
        ? "وصف التقرير واضح بدرجة كافية ويمكن توليد نموذج عملي مباشر."
        : "الوصف يحتاج بعض التحديد حتى تظهر الحقول الأقرب لطبيعة التقرير.",
    missingContext,
    coreFieldHints,
    needsClarification,
    questions: buildFallbackClarificationQuestions(
      { missingContext, reportFamily },
      finalConfidence < 0.45,
    ),
  };
}

function normalizeIntentAnalysis(
  value: unknown,
  fallback: IntentAnalysis,
): IntentAnalysis {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const confidence = clampConfidence(record.confidence, fallback.confidence);
  const reportIntent = cleanText(record.reportIntent) || fallback.reportIntent;
  const reportFamily = cleanText(record.reportFamily) || fallback.reportFamily;
  const reasoningSummary =
    cleanText(record.reasoningSummary) || fallback.reasoningSummary;
  const missingContext = normalizeStringArray(record.missingContext);
  const coreFieldHints = normalizeStringArray(record.coreFieldHints).slice(0, 10);
  const derivedNeedsClarification = confidence < 0.75;
  const needsClarification =
    confidence >= 0.75
      ? false
      : typeof record.needsClarification === "boolean"
        ? record.needsClarification || derivedNeedsClarification
        : derivedNeedsClarification;
  const normalizedQuestions = Array.isArray(record.questions)
    ? record.questions
        .map((question, index) => normalizeClarificationQuestion(question, index))
        .filter(Boolean) as ClarificationQuestion[]
    : [];

  const questions =
    needsClarification && normalizedQuestions.length
      ? normalizedQuestions.slice(0, confidence < 0.45 ? 3 : 4)
      : needsClarification
        ? buildFallbackClarificationQuestions(
            {
              missingContext: missingContext.length
                ? missingContext
                : fallback.missingContext,
              reportFamily,
            },
            confidence < 0.45,
          )
        : [];

  return {
    confidence,
    reportIntent,
    reportFamily,
    reasoningSummary,
    missingContext: missingContext.length ? missingContext : fallback.missingContext,
    coreFieldHints: coreFieldHints.length ? coreFieldHints : fallback.coreFieldHints,
    needsClarification,
    questions,
  };
}

function resolveAnalysisForGeneration({
  previousAnalysis,
  fallback,
}: {
  previousAnalysis: unknown;
  fallback: IntentAnalysis;
}) {
  if (!previousAnalysis || typeof previousAnalysis !== "object") {
    return {
      ...fallback,
      needsClarification: false,
      questions: [],
    };
  }

  const record = previousAnalysis as Record<string, unknown>;

  return {
    ...fallback,
    confidence: clampConfidence(record.confidence, fallback.confidence),
    reportIntent: cleanText(record.reportIntent) || fallback.reportIntent,
    reportFamily: cleanText(record.reportFamily) || fallback.reportFamily,
    reasoningSummary:
      cleanText(record.reasoningSummary) || fallback.reasoningSummary,
    missingContext: normalizeStringArray(record.missingContext).length
      ? normalizeStringArray(record.missingContext)
      : fallback.missingContext,
    coreFieldHints: normalizeStringArray(record.coreFieldHints).length
      ? normalizeStringArray(record.coreFieldHints)
      : fallback.coreFieldHints,
    needsClarification: false,
    questions: [],
  };
}

async function analyzeIntent({
  prompt,
  effectivePrompt,
  previousAnalysis,
  knowledge,
  profileContext,
}: {
  prompt: string;
  effectivePrompt: string;
  previousAnalysis: unknown;
  knowledge: ReturnType<typeof findRelevantAiReportKnowledge>;
  profileContext: ReturnType<typeof buildProfileContext>;
}) {
  const fallback = buildFallbackIntentAnalysis({
    prompt: effectivePrompt,
    knowledge,
  });
  const knowledgeSummary = buildKnowledgeSummary(knowledge);
  const previousAnalysisBlock =
    previousAnalysis && typeof previousAnalysis === "object"
      ? JSON.stringify(previousAnalysis, null, 2)
      : "لا يوجد تحليل سابق.";

  try {
    const content = await callDeepSeekChat({
      temperature: 0.1,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content: [
            "أنت محلل نية لإنشاء تقارير تعليمية داخل منصة مدرسية.",
            "اعتمد على وصف المستخدم وبنك المعرفة المرشح لفهم نوع التقرير وبنيته الطبيعية.",
            "الوصف إشارة نية، وليس قائمة حقول حرفية.",
            "استخدم بنك المعرفة كمرجع أساسي للمصطلحات والأنماط، لكن لا تنسخ كل ما فيه ولا تضف حقولًا غير مرتبطة بالنية.",
            "إذا كان الوصف واضحًا فلا تطلب توضيحًا.",
            "إذا احتاج التوضيح فاجعل الأسئلة قصيرة وعملية وصديقة للمعلم.",
            "فضّل أسئلة التوضيح من النوع select عندما تكون الخيارات الطبيعية معروفة ويمكن حصرها في 4 إلى 8 خيارات.",
            "استخدم text أو textarea فقط عندما تكون الإجابة المفتوحة أنسب فعلًا.",
            "أعد JSON فقط وبالمفاتيح المطلوبة دون أي شرح إضافي.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `
الوصف الأصلي:
${prompt}

الوصف بعد دمج أي توضيحات:
${effectivePrompt}

تحليل سابق - إن وجد:
${previousAnalysisBlock}

سياق ملف المستخدم:
${profileContext.block}

أقرب التقارير من بنك المعرفة:
${knowledgeSummary.topReportsBlock}

أبرز الحقول المرشحة:
${knowledgeSummary.fieldHintsBlock}

أبرز القيم المرشحة:
${knowledgeSummary.optionHintsBlock}

المطلوب:
1. استنتج نية التقرير العامة.
2. استنتج عائلة التقرير الأقرب.
3. حدد هل الوصف واضح بما يكفي لتوليد نموذج مباشرة.
4. إن احتاج توضيحًا، اسأل 2 إلى 4 أسئلة قصيرة فقط.
5. لا تطلب معلومات يمكن استنتاجها بوضوح من الوصف أو بنك المعرفة.

أعد JSON فقط بهذا الشكل:
{
  "confidence": 0.0,
  "reportIntent": "وصف مختصر للنية",
  "reportFamily": "العائلة الأقرب",
  "reasoningSummary": "سبب مختصر",
  "missingContext": ["scope", "focus"],
  "coreFieldHints": ["حقل 1", "حقل 2"],
  "needsClarification": false,
  "questions": [
    {
      "id": "report_scope",
      "label": "ما نطاق التقرير؟",
      "placeholder": "مثال: درس، وحدة، اجتماع، نتائج...",
      "type": "text"
    }
  ]
}

قواعد الثقة:
- إذا كانت الثقة 0.75 أو أكثر فالأصل ألا تطلب توضيحًا.
- إذا كانت الثقة بين 0.45 و0.75 فاسأل 2 إلى 4 أسئلة قصيرة.
- إذا كانت الثقة أقل من 0.45 فاطلب وصفًا أوضح بأسئلة إرشادية قصيرة.
          `.trim(),
        },
      ],
    });

    return normalizeIntentAnalysis(extractJsonObject(content), fallback);
  } catch {
    return fallback;
  }
}

function buildSchemaPrompt({
  prompt,
  clarificationAnswers,
  hasClarificationRound,
  analysis,
  knowledge,
  profileContext,
}: {
  prompt: string;
  clarificationAnswers: Record<string, string>;
  hasClarificationRound: boolean;
  analysis: IntentAnalysis;
  knowledge: ReturnType<typeof findRelevantAiReportKnowledge>;
  profileContext: ReturnType<typeof buildProfileContext>;
}) {
  const knowledgeSummary = buildKnowledgeSummary(knowledge);
  const clarificationBlock = Object.keys(clarificationAnswers).length
    ? Object.entries(clarificationAnswers)
        .map(([key, value]) =>
          !value.trim() || isSuggestiveAnswer(value)
            ? `- ${key}: المعلم طلب من النظام اقتراح القيمة المناسبة لهذا السؤال.`
            : `- ${key}: ${value}`,
        )
        .join("\n")
    : "لا توجد إجابات توضيح إضافية.";
  const topFieldHints =
    analysis.coreFieldHints.length > 0
      ? analysis.coreFieldHints.map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "لا توجد تلميحات حاسمة إضافية.";

  return `
الوصف الأساسي للمستخدم:
${prompt}

إجابات التوضيح - إن وجدت:
${clarificationBlock}

تحليل النية:
- نية التقرير: ${analysis.reportIntent}
- عائلة التقرير: ${analysis.reportFamily}
- ملخص الاستدلال: ${analysis.reasoningSummary}

تلميحات الحقول الأساسية:
${topFieldHints}

سياق ملف المستخدم:
${profileContext.block}

أقرب التقارير في بنك المعرفة:
${knowledgeSummary.topReportsBlock}

الحقول المرشحة من بنك المعرفة:
${knowledgeSummary.fieldHintsBlock}

القيم والخيارات المرشحة من بنك المعرفة:
${knowledgeSummary.optionHintsBlock}

تعليمات صارمة:
- أنشئ نموذج تقرير عمليًا ومناسبًا للمعلمين داخل المنصة.
- أنشئ قسمًا واحدًا فقط بعنوان "بيانات التقرير المخصص".
- اجعل النموذج في خطوة واحدة فقط.
- اجعل عدد الحقول بين 6 و14 بحسب تعقيد التقرير.
- جميع الحقول اختيارية بالكامل. required=false دائمًا.
- أي حقل من النوع select أو multi_select أو radio يجب أن يحتوي على 4 إلى 8 خيارات مفيدة ومرتبطة بالحقل نفسه.
- فضّل بناء الخيارات من قيم بنك المعرفة المرشحة أولًا.
- إذا لم تكفِ قيم بنك المعرفة، يمكنك إضافة خيارات تعليمية منطقية خاصة بالحقل نفسه، وليست عامة أو سطحية.
- لا تترك أي حقل select أو multi_select أو radio بدون خيارات.
- إذا لم تستطع توليد 4 خيارات ذات معنى على الأقل، فحوّل الحقل إلى textarea بدل select.
- لا تتجاوز 8 خيارات لأي حقل اختياري.
- لا تنشئ أي حقل شواهد أو مرفقات أو رفع ملفات أو صور.
- لا تنشئ الحقل "الشواهد المقترحة" ولا أي حقل بالمعنى نفسه.
- الشواهد مدعومة في المنصة بشكل منفصل، لذلك لا تمثلها داخل الـ schema.
- لا تنشئ حقولًا غير مرتبطة بعائلة التقرير أو بنيته الطبيعية.
- لا تفرض المادة أو الصف أو الحضور أو التوقيع إلا إذا كانت النية تستدعيها بوضوح.
- استخدم select أو multi_select أو radio فقط عندما تكون الخيارات مفيدة ومسنودة من المرشحات أو بالاستدلال التعليمي الواضح.
- إذا احتجت خيارًا مفتوحًا فأضف "أخرى" مرة واحدة فقط بقيمة other.
- استخدم text وtextarea وdate وnumber وselect وmulti_select فقط عند الحاجة الطبيعية.
- استخدم أسماء عربية واضحة للحقول، ومفاتيح english_snake_case.
- ${hasClarificationRound ? "بعد مرحلة التوضيح ممنوع طلب توضيح إضافي. يجب توليد نموذج عملي بأفضل استنتاج." : "إذا ظهرت حاجة حقيقية للتوضيح فهي تُعالج قبل هذه المرحلة."}
- اجعل المخرجات JSON فقط.
  `.trim();
}

function countSchemaFields(schema: CustomReportSchema) {
  return schema.sections.reduce(
    (total, section) => total + section.fields.length,
    0,
  );
}

function buildFallbackOptions(
  label: string,
  knowledge: ReturnType<typeof findRelevantAiReportKnowledge>,
) {
  const normalizedLabel = normalizeAiReportArabicText(label);
  const options = Array.from(
    new Set(
      knowledge.items
        .filter((item) => {
          const itemLabel = normalizeAiReportArabicText(item.fieldLabel);
          return (
            itemLabel === normalizedLabel ||
            itemLabel.includes(normalizedLabel) ||
            normalizedLabel.includes(itemLabel)
          );
        })
        .map((item) => sanitizeAiReportText(item.optionLabel))
        .filter(Boolean)
        .filter((option) => !isEvidenceLikeLabel(option)),
    ),
  ).slice(0, 5);

  return options.map((option, index) => ({
    label: option,
    value: normalizeSnakeCase(option, `option_${index + 1}`),
  }));
}

function pickFallbackFieldKey(label: string, index: number) {
  const normalizedLabel = normalizeAiReportArabicText(label);

  if (normalizedLabel.includes("تاريخ")) return "report_date";
  if (normalizedLabel.includes("عنوان") || normalizedLabel.includes("اسم")) {
    return "report_subject";
  }
  if (normalizedLabel.includes("هدف")) return "report_goal";
  if (normalizedLabel.includes("تنفيذ") || normalizedLabel.includes("اجراء")) {
    return "implemented_actions";
  }
  if (
    normalizedLabel.includes("نتائج") ||
    normalizedLabel.includes("مخرجات") ||
    normalizedLabel.includes("اثر")
  ) {
    return "results_summary";
  }
  if (
    normalizedLabel.includes("فجوات") ||
    normalizedLabel.includes("تحديات") ||
    normalizedLabel.includes("معوقات")
  ) {
    return "gaps_or_challenges";
  }
  if (normalizedLabel.includes("توصيات")) return "recommendations";
  if (normalizedLabel.includes("ملاحظات")) return "additional_notes";

  return `custom_field_${index + 1}`;
}

function pickFallbackFieldType(label: string, options: Array<{ label: string; value: string }>) {
  const normalizedLabel = normalizeAiReportArabicText(label);

  if (
    normalizedLabel.includes("تاريخ") ||
    normalizedLabel.includes("موعد") ||
    normalizedLabel.includes("يوم")
  ) {
    return "date" as const;
  }

  if (
    normalizedLabel.includes("نسبة") ||
    normalizedLabel.includes("عدد") ||
    normalizedLabel.includes("درجة") ||
    normalizedLabel.includes("متوسط")
  ) {
    return "number" as const;
  }

  if (
    options.length >= 4 &&
    /محاور|محور|مجالات|اجراءات|إجراءات|توصيات|اسباب|أسباب|أهداف|اهداف/.test(label)
  ) {
    return "multi_select" as const;
  }

  if (options.length >= 4) {
    return "select" as const;
  }

  if (
    /وصف|ملخص|خلاصة|نتائج|توصيات|ملاحظات|إجراءات|تنفيذ|فجوات|تحديات|مقترحات/.test(
      label,
    )
  ) {
    return "textarea" as const;
  }

  return "text" as const;
}

function buildHeuristicFallbackSchema({
  prompt,
  analysis,
  knowledge,
}: {
  prompt: string;
  analysis: IntentAnalysis;
  knowledge: ReturnType<typeof findRelevantAiReportKnowledge>;
}): CustomReportSchema {
  const candidateLabels = Array.from(
    new Set(
      knowledge.items
        .map((item) => sanitizeAiReportText(item.fieldLabel))
        .filter(Boolean)
        .filter((label) => !isEvidenceLikeLabel(label)),
    ),
  ).slice(0, 8);

  const genericLabels = [
    "موضوع التقرير",
    "الهدف من التقرير",
    "تاريخ التقرير",
    "وصف التنفيذ أو الحدث",
    "أبرز النتائج أو المخرجات",
    "التحديات أو الفجوات",
    "التوصيات",
    "ملاحظات إضافية",
  ];

  const mergedLabels = Array.from(
    new Set([...candidateLabels, ...genericLabels]),
  ).slice(0, 8);

  return {
    title:
      sanitizeAiReportText(analysis.reportIntent) ||
      `تقرير ${sanitizeAiReportText(analysis.reportFamily) || "مخصص"}`,
    description: prompt,
    version: 1,
    sections: [
      {
        id: "ai_report_section_1",
        title: "بيانات التقرير المخصص",
        description: analysis.reasoningSummary || "",
        order: 1,
        fields: (() => {
          const usedKeys = new Set<string>();

          return mergedLabels.map((label, index) => {
            const options = buildFallbackOptions(label, knowledge);
            const type = pickFallbackFieldType(label, options);
            const baseKey = pickFallbackFieldKey(label, index);
            let key = baseKey;

            while (usedKeys.has(key)) {
              key = `${baseKey}_${usedKeys.size + 1}`;
            }

            usedKeys.add(key);

            return {
              key,
              label,
              type,
              required: false,
              placeholder:
                type === "textarea"
                  ? `اكتب ${label} هنا`
                  : type === "date"
                    ? ""
                    : `أدخل ${label}`,
              helpText: "",
              reportLabel: label,
              showInReport: true,
              order: index + 1,
              options:
                type === "select" || type === "multi_select" ? options : [],
            };
          });
        })(),
      },
    ],
  };
}

function buildGenerationContext(
  prompt: string,
  profileContext: ReturnType<typeof buildProfileContext>,
): CustomReportGenerationContext {
  return {
    mode: "create",
    previousPrompt: prompt,
    stages: profileContext.stages,
    specialties: profileContext.specialties,
    subjects: profileContext.subjects,
  };
}

export async function POST(request: Request) {
  const authContext = await requireCustomReportContext();

  if (!authContext.ok) {
    return NextResponse.json(
      { success: false, error: authContext.message },
      { status: authContext.status },
    );
  }

  const body = await request.json().catch(() => null);
  const prompt = cleanText(body?.prompt);

  if (prompt.length < 3) {
    return NextResponse.json(
      {
        success: false,
        error: "اكتب وصفًا مختصرًا للتقرير حتى يتمكن النظام من مساعدتك.",
      },
      { status: 400 },
    );
  }

  const clarificationAnswers = normalizeClarificationAnswers(
    body?.clarificationAnswers,
  );
  const previousAnalysis = body?.previousAnalysis;
  const hasClarificationRound =
    Object.keys(clarificationAnswers).length > 0 || Boolean(previousAnalysis);
  const effectivePrompt = buildCombinedPrompt(prompt, clarificationAnswers);
  const knowledge = findRelevantAiReportKnowledge({
    prompt: effectivePrompt,
    limit: 150,
  });
  const profileContext = buildProfileContext(authContext.user);
  const analysis = hasClarificationRound
    ? resolveAnalysisForGeneration({
        previousAnalysis,
        fallback: buildFallbackIntentAnalysis({
          prompt: effectivePrompt,
          knowledge,
        }),
      })
    : await analyzeIntent({
        prompt,
        effectivePrompt,
        previousAnalysis,
        knowledge,
        profileContext,
      });

  if (!hasClarificationRound && analysis.needsClarification) {
    return NextResponse.json({
      success: true,
      needsClarification: true,
      confidence: analysis.confidence,
      reportIntent: analysis.reportIntent,
      reportFamily: analysis.reportFamily,
      reasoningSummary: analysis.reasoningSummary,
      missingContext: analysis.missingContext,
      coreFieldHints: analysis.coreFieldHints,
      questions: analysis.questions,
    });
  }

  const guidedPrompt = buildSchemaPrompt({
    prompt,
    clarificationAnswers,
    hasClarificationRound,
    analysis,
    knowledge,
    profileContext,
  });

  const result = await generateCustomReportSchema(
    guidedPrompt,
    buildGenerationContext(effectivePrompt, profileContext),
  );
  const nextSchema =
    result.source === "FALLBACK" || countSchemaFields(result.schema) < 4
      ? buildHeuristicFallbackSchema({
          prompt,
          analysis,
          knowledge,
        })
      : result.schema;
  const sanitizedSchema = normalizeAiReportSchema(
    sanitizeAiReportSchema(nextSchema),
  );

  return NextResponse.json({
    success: true,
    needsClarification: false,
    confidence: analysis.confidence,
    reportIntent: analysis.reportIntent,
    reportFamily: analysis.reportFamily,
    reasoningSummary: analysis.reasoningSummary,
    missingContext: analysis.missingContext,
    coreFieldHints: analysis.coreFieldHints,
    schema: sanitizedSchema,
  });
}
