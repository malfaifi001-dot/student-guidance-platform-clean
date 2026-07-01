import { NextResponse } from "next/server";

import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import { findRelevantAiReportKnowledge } from "@/lib/ai-report/ai-report-knowledge-retriever";
import { normalizeAiReportSchema } from "@/lib/ai-report/ai-report-runtime-adapter";
import {
  sanitizeAiReportSchema,
  sanitizeAiReportText,
} from "@/lib/ai-report/ai-report-text-sanitizer";
import type { AiReportKnowledgeSearchResult } from "@/lib/ai-report/ai-report-knowledge-types";
import {
  analyzeTeacherIntent,
  buildTeacherRetrievalPrompt,
  type TeacherIntentAnalysis,
} from "@/lib/ai-report2/teacher-intent-engine";
import {
  buildFallbackSchemaFromTeacherIntent,
  buildTeacherRepairInstruction,
  enforceTeacherIntentSchema,
  evaluateTeacherSchemaFit,
} from "@/lib/ai-report2/teacher-schema-guard";
import { judgeTeacherSchemaValues } from "@/lib/ai-report2/teacher-value-judge";
import {
  classifyTeacherFieldType,
  normalizeTeacherOptions,
} from "@/lib/ai-report2/teacher-field-rules";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";
import { extractJsonObject } from "@/lib/custom-report/custom-report-normalizer";
import type {
  CustomReportField,
  CustomReportOption,
  CustomReportSchema,
} from "@/lib/custom-report/custom-report-types";

const MAX_FIELDS = 7;
const MAX_OPTIONS_PER_FIELD = 8;
const MAX_KNOWLEDGE_ITEMS_FOR_MODEL = 260;

type AiReport2SelectedReport = {
  reportSlug: string;
  reportName: string;
  reason?: string;
  confidence?: number;
};

type AiReport2FieldSuggestion = {
  key?: unknown;
  label?: unknown;
  type?: unknown;
  options?: unknown;
  placeholder?: unknown;
  helpText?: unknown;
  source?: unknown;
  sourceReportSlug?: unknown;
  sourceFieldKey?: unknown;
};

type AiReport2ModelResult = {
  confidence?: unknown;
  intentFamily?: unknown;
  teacherIntent?: unknown;
  performanceElement?: unknown;
  reportIntent?: unknown;
  reasoningSummary?: unknown;
  selectedReports?: unknown;
  fields?: unknown;
  schema?: unknown;
};

function cleanText(value: unknown) {
  return sanitizeAiReportText(String(value ?? "").trim());
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toConfidence(value: unknown, fallback = 0.68) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return clamp(value, 0, 1);
}

function normalizeKeyCandidate(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueFieldKey(label: string, index: number, usedKeys: Set<string>) {
  const candidate = normalizeKeyCandidate(label);
  const base = candidate || `ai_report2_field_${index + 1}`;

  let nextKey = base;
  let suffix = 2;

  while (usedKeys.has(nextKey)) {
    nextKey = `${base}_${suffix}`;
    suffix += 1;
  }

  usedKeys.add(nextKey);
  return nextKey;
}

function countSchemaFields(schema: CustomReportSchema) {
  return schema.sections.reduce(
    (total, section) => total + section.fields.length,
    0,
  );
}

function normalizeSelectedReports(value: unknown): AiReport2SelectedReport[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map<AiReport2SelectedReport | null>((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const reportSlug = cleanText(record.reportSlug);
      const reportName = cleanText(record.reportName);

      if (!reportSlug && !reportName) {
        return null;
      }

      return {
        reportSlug,
        reportName,
        reason: cleanText(record.reason),
        confidence: toConfidence(record.confidence, 0.65),
      };
    })
    .filter((item): item is AiReport2SelectedReport => item !== null)
    .slice(0, 5);
}

function normalizeFieldsToSchema({
  prompt,
  result,
}: {
  prompt: string;
  result: AiReport2ModelResult;
}): CustomReportSchema | null {
  const rawSchema =
    result.schema && typeof result.schema === "object"
      ? (result.schema as Record<string, unknown>)
      : null;

  const rawFields = Array.isArray(result.fields)
    ? result.fields
    : rawSchema && Array.isArray(rawSchema.fields)
      ? rawSchema.fields
      : rawSchema &&
          Array.isArray(rawSchema.sections) &&
          rawSchema.sections[0] &&
          typeof rawSchema.sections[0] === "object" &&
          Array.isArray((rawSchema.sections[0] as Record<string, unknown>).fields)
        ? ((rawSchema.sections[0] as Record<string, unknown>).fields as unknown[])
        : [];

  if (!rawFields.length) {
    return null;
  }

  const usedKeys = new Set<string>();
  const fields = rawFields
    .map<CustomReportField | null>((field, index) => {
      if (!field || typeof field !== "object") {
        return null;
      }

      const record = field as AiReport2FieldSuggestion;
      const label = cleanText(record.label);

      if (!label) {
        return null;
      }

      const options = normalizeTeacherOptions(record.options, MAX_OPTIONS_PER_FIELD);
      const type = classifyTeacherFieldType(label, options.length);
      const finalOptions: CustomReportOption[] =
        type === "multi_select" ? options : [];

      return {
        key: uniqueFieldKey(cleanText(record.key) || label, index, usedKeys),
        label,
        type,
        required: false,
        placeholder:
          type === "date"
            ? ""
            : type === ("number" as CustomReportField["type"])
              ? "أدخل الرقم فقط"
              : type === "textarea"
                ? cleanText(record.placeholder) || `اكتب ${label}`
                : "",
        helpText:
          type === "multi_select"
            ? "يمكن اختيار أكثر من قيمة، وجميع الحقول اختيارية."
            : cleanText(record.helpText) || "حقل اختياري يعبئه المعلم حسب سياق التقرير.",
        reportLabel: label,
        showInReport: true,
        order: index + 1,
        options: finalOptions,
      };
    })
    .filter((field): field is CustomReportField => field !== null)
    .slice(0, MAX_FIELDS);

  if (fields.length < 2) {
    return null;
  }

  const title =
    rawSchema && cleanText(rawSchema.title)
      ? cleanText(rawSchema.title)
      : `تقرير ذكي تجريبي - ${prompt.slice(0, 45)}`;

  const description =
    rawSchema && cleanText(rawSchema.description)
      ? cleanText(rawSchema.description)
      : "نموذج تجريبي مبني بواسطة محرك فهم نية المعلم.";

  return {
    title,
    description,
    version: 1,
    sections: [
      {
        id: "ai_report2_section_1",
        title: "بيانات التقرير الذكي التجريبي",
        description,
        order: 1,
        fields,
      },
    ],
  };
}

function groupKnowledgeForModel(knowledge: AiReportKnowledgeSearchResult) {
  const map = new Map<
    string,
    {
      reportSlug: string;
      reportName: string;
      performanceElement: string;
      reportCategory: string;
      category: string;
      fieldKey: string;
      fieldLabel: string;
      inputType: string;
      options: string[];
    }
  >();

  for (const item of knowledge.items.slice(0, MAX_KNOWLEDGE_ITEMS_FOR_MODEL)) {
    const fieldLabel = cleanText(item.fieldLabel || item.category || "حقل");
    const fieldKey = cleanText(item.fieldKey || fieldLabel);
    const key = `${item.reportSlug}::${fieldKey}::${fieldLabel}`;

    const existing =
      map.get(key) ||
      {
        reportSlug: item.reportSlug,
        reportName: item.reportName,
        performanceElement: item.performanceElement,
        reportCategory: item.reportCategory,
        category: item.category,
        fieldKey,
        fieldLabel,
        inputType: item.inputType,
        options: [],
      };

    const option = cleanText(item.optionLabel);

    if (
      item.sourceType === "value_bank" &&
      option &&
      !existing.options.includes(option)
    ) {
      existing.options.push(option);
    }

    map.set(key, existing);
  }

  return Array.from(map.values()).slice(0, 120);
}

function buildKnowledgeForModel({
  knowledge,
  analysis,
}: {
  knowledge: AiReportKnowledgeSearchResult;
  analysis: TeacherIntentAnalysis;
}) {
  return {
    teacherIntentAnalysis: {
      prompt: analysis.prompt,
      selectedPerformanceElementLabel: analysis.selectedPerformanceElementLabel,
      resolvedPerformanceElementLabel: analysis.resolvedPerformanceElementLabel,
      primaryIntent: {
        code: analysis.primaryIntent.code,
        label: analysis.primaryIntent.label,
        family: analysis.primaryIntent.family,
        description: analysis.primaryIntent.description,
        recommendedFields: analysis.primaryIntent.recommendedFields,
        avoidUnlessExplicit: analysis.primaryIntent.avoidUnlessExplicit,
      },
      teacherAction: analysis.teacherAction,
      teacherAudience: analysis.teacherAudience,
      teacherPurpose: analysis.teacherPurpose,
      strictGuidance: analysis.strictGuidance,
      candidateIntents: analysis.candidateIntents,
    },
    topReports: knowledge.topReports.slice(0, 18).map((report) => ({
      reportSlug: report.reportSlug,
      reportName: report.reportName,
      performanceElement: report.performanceElement,
      reportCategory: report.reportCategory,
      templatePattern: report.templatePattern,
      score: Math.round(report.score),
      matchedItemsCount: report.matchedItemsCount,
    })),
    candidateFields: groupKnowledgeForModel(knowledge).map((field) => ({
      reportSlug: field.reportSlug,
      reportName: field.reportName,
      performanceElement: field.performanceElement,
      reportCategory: field.reportCategory,
      category: field.category,
      fieldKey: field.fieldKey,
      fieldLabel: field.fieldLabel,
      inputType: field.inputType,
      options: field.options.slice(0, MAX_OPTIONS_PER_FIELD),
    })),
  };
}

async function buildDeepSeekLedSchema({
  prompt,
  knowledge,
  analysis,
  repairInstruction,
}: {
  prompt: string;
  knowledge: AiReportKnowledgeSearchResult;
  analysis: TeacherIntentAnalysis;
  repairInstruction?: string;
}) {
  const knowledgeForModel = buildKnowledgeForModel({
    knowledge,
    analysis,
  });

  const content = await callDeepSeekChat({
    temperature: repairInstruction ? 0.18 : 0.22,
    maxTokens: 4200,
    messages: [
      {
        role: "system",
        content: [
          "أنت محرك فهم نية المعلم داخل منصة عربية لتقارير أداء المعلم.",
          "مهمتك ليست توليد حقول فقط، بل ترجمة ما يقصده المعلم إلى نموذج عملي يخدمه.",
          "",
          "قاعدة التفكير:",
          "1. افهم ماذا فعل المعلم.",
          "2. افهم لمن كان العمل.",
          "3. افهم لماذا تم العمل.",
          "4. التزم بعنصر الأداء المحدد أو المستنتج.",
          "5. استخدم البنك كمساعد لا كقائد.",
          "6. احذف أي حقل لا يشعر المعلم أنه يخدم طلبه.",
          "",
          "القواعد الصارمة:",
          `- الحد الأقصى ${MAX_FIELDS} حقول فقط.`,
          "- كل الحقول required=false.",
          "- لا تستخدم upload.",
          "- لا تستخدم radio أو select.",
          "- إذا الحقل عدة قيم: multi_select مع خيارات جاهزة.",
          "- إذا الحقل عدد أو نسبة أو مدة: number.",
          "- إذا الحقل تاريخ أو موعد: date.",
          "- إذا الحقل اسم أو عنوان أو موضوع أو مكان: textarea.",
          "- لا تخلط تقرير فعالية مع تحليل نتائج إلا إذا ذكر المعلم نتائج أو اختبار صراحة.",
          "- لا تخلط تقرير تكريم مع درس إلا إذا ذكر المعلم درسًا صراحة.",
          "- لا تكرر نفس المعنى بحقول متقاربة.",
"- لا تنشئ حقول التحديات أو التوصيات أو المقترحات أو فرص التحسين.",
"- ركز على أهم 7 خانات فقط تخدم نية المعلم مباشرة.",
          "- النموذج النهائي يجب أن يشعر المعلم أنه يطابق قصده بنسبة عالية.",
"- رتّب الحقول مهنيًا: الحقل التعريفي الرئيسي أولًا، ثم السياق المهم مثل المادة والصف أو الأطراف، ثم التاريخ، ثم الفئة أو الغرض، ثم التنفيذ، ثم الأثر أو الشواهد.",
"- الحقل التعريفي الرئيسي يجب أن يتغير حسب وصف المعلم: اسم المنصة، اسم الأداة، موضوع الدرس، اسم الاستراتيجية، اسم الاختبار، عنوان التكريم، اسم الفعالية، عنوان المبادرة، موضوع التواصل، عنوان الورشة، نوع المهمة، عنوان المنجز، اسم البرنامج، عنوان النشاط، أو عنوان التقرير.",
"- لا تجعل مكان التنفيذ حقلًا أساسيًا إلا إذا كان الوصف يحتاجه بوضوح.",
"- لا تنشئ حقول التحديات أو التوصيات أو المقترحات أو فرص التحسين.",
"- ركز على أهم 7 خانات فقط تخدم نية المعلم مباشرة.",
          "",
          "توجيه نية المعلم:",
          ...analysis.strictGuidance,
          repairInstruction ? "" : "",
          repairInstruction ? "تعليمات إصلاح من مراجعة الجودة:" : "",
          repairInstruction || "",
          "",
          "أعد JSON فقط بدون Markdown بهذا الشكل:",
          `{
  "confidence": 0.9,
  "intentFamily": "عائلة التقرير",
  "teacherIntent": "نية المعلم",
  "performanceElement": "عنصر الأداء",
  "reportIntent": "وصف قصير لنية التقرير",
  "reasoningSummary": "لماذا اخترت هذه الحقول",
  "selectedReports": [
    {
      "reportSlug": "slug من البنك إن وجد",
      "reportName": "اسم التقرير الأقرب",
      "reason": "سبب الاختيار",
      "confidence": 0.8
    }
  ],
  "fields": [
    {
      "key": "english_snake_key",
      "label": "اسم الحقل بالعربي",
      "type": "textarea | multi_select | date | number",
      "placeholder": "نص مساعد",
      "helpText": "معلومة قصيرة",
      "source": "bank | custom",
      "sourceReportSlug": "slug عند وجوده",
      "sourceFieldKey": "field_key عند وجوده",
      "options": [
        { "label": "خيار مناسب" }
      ]
    }
  ],
  "schema": {
    "title": "عنوان التقرير",
    "description": "وصف مختصر"
  }
}`,
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "وصف المعلم:",
          prompt,
          "",
          "تحليل نية المعلم والسياق الضيق:",
          JSON.stringify(knowledgeForModel.teacherIntentAnalysis, null, 2),
          "",
          "مواد البنك الأقرب فقط:",
          JSON.stringify(
            {
              topReports: knowledgeForModel.topReports,
              candidateFields: knowledgeForModel.candidateFields,
            },
            null,
            2,
          ),
        ].join("\n"),
      },
    ],
  });

  return extractJsonObject(content) as AiReport2ModelResult;
}

function countBankAndCustomUsage(schema: CustomReportSchema) {
  let bankValuesUsed = 0;
  let customValuesUsed = 0;

  for (const field of schema.sections.flatMap((section) => section.fields)) {
    if (field.options?.length) {
      bankValuesUsed += field.options.length;
    } else {
      customValuesUsed += 1;
    }
  }

  return {
    bankValuesUsed,
    customValuesUsed,
  };
}

async function buildBestSchema({
  prompt,
  knowledge,
  analysis,
}: {
  prompt: string;
  knowledge: AiReportKnowledgeSearchResult;
  analysis: TeacherIntentAnalysis;
}) {
  let modelResult: AiReport2ModelResult | null = null;
  let schema: CustomReportSchema | null = null;

  try {
    modelResult = await buildDeepSeekLedSchema({
      prompt,
      knowledge,
      analysis,
    });

    schema = normalizeFieldsToSchema({
      prompt,
      result: modelResult,
    });
  } catch {
    modelResult = null;
    schema = null;
  }

  let nextSchema =
    schema && countSchemaFields(schema) >= 2
      ? schema
      : buildFallbackSchemaFromTeacherIntent({
          prompt,
          knowledge,
          analysis,
        });

  nextSchema = enforceTeacherIntentSchema({
    schema: nextSchema,
    prompt,
    knowledge,
    analysis,
  });

  let quality = evaluateTeacherSchemaFit({
    schema: nextSchema,
    analysis,
  });

  if (!quality.passed) {
    try {
      const retryResult = await buildDeepSeekLedSchema({
        prompt,
        knowledge,
        analysis,
        repairInstruction: buildTeacherRepairInstruction({
          score: quality.score,
          issues: quality.issues,
          analysis,
        }),
      });

      const retrySchema = normalizeFieldsToSchema({
        prompt,
        result: retryResult,
      });

      if (retrySchema) {
        const guardedRetrySchema = enforceTeacherIntentSchema({
          schema: retrySchema,
          prompt,
          knowledge,
          analysis,
        });

        const retryQuality = evaluateTeacherSchemaFit({
          schema: guardedRetrySchema,
          analysis,
        });

        if (retryQuality.score >= quality.score) {
          modelResult = retryResult;
          nextSchema = guardedRetrySchema;
          quality = retryQuality;
        }
      }
    } catch {
      // يبقى النموذج الأول بعد الحراسة.
    }
  }

  return {
    modelResult,
    schema: nextSchema,
    quality,
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
  const performanceElementScope = cleanText(body?.performanceElementScope);

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

  const retrievalPrompt = buildTeacherRetrievalPrompt(analysis);

  const knowledge = findRelevantAiReportKnowledge({
    prompt: retrievalPrompt,
    limit: 520,
  });

  const { modelResult, schema, quality } = await buildBestSchema({
    prompt,
    knowledge,
    analysis,
  });

  const selectedReports =
    normalizeSelectedReports(modelResult?.selectedReports).length > 0
      ? normalizeSelectedReports(modelResult?.selectedReports)
      : knowledge.topReports.slice(0, 3).map((report) => ({
          reportSlug: report.reportSlug,
          reportName: report.reportName,
          reason: "أقرب تقرير حسب نية المعلم وعنصر الأداء.",
          confidence: 0.66,
        }));

  const valueJudgment = await judgeTeacherSchemaValues({
    schema,
    analysis,
  });

  const sanitizedSchema = normalizeAiReportSchema(
    sanitizeAiReportSchema(valueJudgment.schema),
  );

  const usage = countBankAndCustomUsage(sanitizedSchema);

  return NextResponse.json({
    success: true,
    confidence: Math.max(
      toConfidence(modelResult?.confidence, selectedReports[0]?.confidence || 0.66),
      analysis.confidence,
    ),
    intentFamily: cleanText(modelResult?.intentFamily) || analysis.primaryIntent.family,
    teacherIntent:
      cleanText(modelResult?.teacherIntent) || analysis.primaryIntent.label,
    performanceElementScope: analysis.performanceElementScope,
    performanceElement:
      cleanText(modelResult?.performanceElement) ||
      analysis.resolvedPerformanceElementLabel,
    reportIntent:
      cleanText(modelResult?.reportIntent) ||
      `تقرير ${analysis.primaryIntent.label}`,
    reasoningSummary:
      cleanText(modelResult?.reasoningSummary) ||
      "تم بناء النموذج بناءً على فهم نية المعلم، وعنصر الأداء، والقيم الأقرب من البنك.",
    teacherIntentAnalysis: {
      action: analysis.teacherAction,
      audience: analysis.teacherAudience,
      purpose: analysis.teacherPurpose,
      selectedPerformanceElementLabel: analysis.selectedPerformanceElementLabel,
      resolvedPerformanceElementLabel: analysis.resolvedPerformanceElementLabel,
      candidateIntents: analysis.candidateIntents,
    },
    satisfactionScore: Math.round(quality.score * 100),
    satisfactionIssues: quality.issues,
    valueJudgeApplied: valueJudgment.applied,
    valueJudgeSummary: valueJudgment.summary,
    rejectedValues: valueJudgment.rejectedValues,
    selectedReports,
    bankValuesUsed: usage.bankValuesUsed,
    customValuesUsed: usage.customValuesUsed,
    schema: sanitizedSchema,
  });
}
