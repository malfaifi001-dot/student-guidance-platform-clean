import { NextResponse } from "next/server";

import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import { sanitizeAiReportText } from "@/lib/ai-report/ai-report-text-sanitizer";
import { analyzeTeacherIntent } from "@/lib/ai-report2/teacher-intent-engine";
import {
  normalizeTeacherPerformanceElementScope,
  type TeacherPerformanceElementScope,
} from "@/lib/ai-report2/teacher-performance-elements";
import { normalizeTeacherClarificationQuestions } from "@/lib/ai-report2/teacher-clarification";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";
import { extractJsonObject } from "@/lib/custom-report/custom-report-normalizer";

function cleanText(value: unknown) {
  return sanitizeAiReportText(String(value ?? "").trim());
}

function questionsCountForConfidence(confidence: number) {
  if (confidence >= 0.86) return 2;
  if (confidence >= 0.72) return 3;
  return 4;
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
  const performanceElementScope = normalizeTeacherPerformanceElementScope(
    body?.performanceElementScope as TeacherPerformanceElementScope,
  );

  if (prompt.length < 3) {
    return NextResponse.json(
      {
        success: false,
        error: "اكتب وصفًا مختصرًا للتقرير المطلوب.",
      },
      { status: 400 },
    );
  }

  const analysis = analyzeTeacherIntent({
    prompt,
    performanceElementScope,
  });

  const maxQuestions = questionsCountForConfidence(analysis.confidence);
  let modelQuestions: unknown = [];

  try {
    const content = await callDeepSeekChat({
      temperature: 0.16,
      maxTokens: 1800,
      messages: [
        {
          role: "system",
          content: [
            "أنت طبقة تضييق نية المعلم قبل توليد تقرير AI Report 2.",
            "لا تولّد نموذج التقرير الآن.",
            "مهمتك فقط اقتراح أسئلة قصيرة تساعد على فهم قصد المعلم وتقليل توسع القيم.",
            "",
            "القواعد:",
            `- أعد من 2 إلى ${maxQuestions} أسئلة فقط.`,
            "- اجعل أغلب الأسئلة اختيارية من نوع single_select أو multi_select.",
            "- استخدم text فقط عندما يكون السؤال يحتاج اسم مهارة أو طالب أو موضوع محدد.",
            "- لا تسأل سؤالًا لا يغير الحقول أو القيم.",
            "- لا تسأل عن تحديات أو توصيات أو فرص تحسين.",
            "- لا تسأل عن مكان التنفيذ إلا إذا كان ضروريًا جدًا من النص.",
            "- الأسئلة يجب أن تكون سهلة وسريعة للمعلم.",
            "",
            "أعد JSON فقط بدون Markdown بهذا الشكل:",
            `{
  "questions": [
    {
      "id": "purpose",
      "label": "السؤال بالعربية",
      "type": "single_select | multi_select | text",
      "helpText": "سبب قصير اختياري",
      "options": [
        { "label": "خيار", "value": "value" }
      ]
    }
  ]
}`,
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "وصف المعلم:",
            prompt,
            "",
            "تحليل النية الأولي:",
            JSON.stringify(
              {
                primaryIntent: analysis.primaryIntent.label,
                intentCode: analysis.primaryIntent.code,
                family: analysis.primaryIntent.family,
                performanceElement: analysis.resolvedPerformanceElementLabel,
                action: analysis.teacherAction,
                audience: analysis.teacherAudience,
                purpose: analysis.teacherPurpose,
                confidence: analysis.confidence,
                candidateIntents: analysis.candidateIntents,
              },
              null,
              2,
            ),
          ].join("\n"),
        },
      ],
    });

    const json = extractJsonObject(content) as { questions?: unknown };
    modelQuestions = json.questions;
  } catch {
    modelQuestions = [];
  }

  const questions = normalizeTeacherClarificationQuestions({
    value: modelQuestions,
    analysis,
    maxQuestions,
  });

  return NextResponse.json({
    success: true,
    needsClarification: true,
    confidence: analysis.confidence,
    teacherIntent: analysis.primaryIntent.label,
    performanceElement: analysis.resolvedPerformanceElementLabel,
    questions,
  });
}