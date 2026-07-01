import { normalizeAiReportArabicText } from "@/lib/ai-report/ai-report-knowledge-retriever";
import type { AiReportKnowledgeSearchResult } from "@/lib/ai-report/ai-report-knowledge-types";
import type {
  CustomReportField,
  CustomReportSchema,
} from "@/lib/custom-report/custom-report-types";

import type { TeacherIntentAnalysis } from "./teacher-intent-engine";
import {
  buildContextualTeacherOptions,
  classifyTeacherFieldType,
  normalizeTeacherOptions,
} from "./teacher-field-rules";

const MAX_FIELDS = 7;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function makeFieldKey(label: string, index: number, usedKeys: Set<string>) {
  const fallback = `teacher_intent_field_${index + 1}`;
  const ascii = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const base = ascii || fallback;
  let key = base;
  let suffix = 2;

  while (usedKeys.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }

  usedKeys.add(key);
  return key;
}

function isExcludedLowPriorityTeacherField(label: string) {
  const normalized = normalizeAiReportArabicText(label);

  return (
    normalized.includes("تحديات") ||
    normalized.includes("تحدي") ||
    normalized.includes("صعوبات") ||
    normalized.includes("معوقات") ||
    normalized.includes("توصيات") ||
    normalized.includes("توصية") ||
    normalized.includes("مقترحات") ||
    normalized.includes("مقترح") ||
    normalized.includes("فرص التحسين") ||
    normalized.includes("فرص تحسين")
  );
}

function similarLabel(a: string, b: string) {
  const left = normalizeAiReportArabicText(a);
  const right = normalizeAiReportArabicText(b);

  if (!left || !right) {
    return false;
  }

  if (left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftTokens = left.split(/\s+/).filter((token) => token.length >= 3);
  const rightTokens = new Set(
    right.split(/\s+/).filter((token) => token.length >= 3),
  );

  return leftTokens.some((token) => rightTokens.has(token));
}

function primaryIdentityLabel(analysis: TeacherIntentAnalysis) {
  const prompt = normalizeAiReportArabicText(analysis.prompt);
  const intentCode = analysis.primaryIntent.code;

  if (prompt.includes("منصة")) {
    return "اسم المنصة";
  }

  if (prompt.includes("اداة") || prompt.includes("أداة") || prompt.includes("تطبيق")) {
    return "اسم الأداة التقنية";
  }

  if (prompt.includes("برنامج")) {
    return "اسم البرنامج";
  }

  if (prompt.includes("مبادرة")) {
    return "عنوان المبادرة";
  }

  if (prompt.includes("ورشة")) {
    return "عنوان الورشة";
  }

  if (prompt.includes("اذاعة") || prompt.includes("إذاعة")) {
    return "عنوان الإذاعة المدرسية";
  }

  if (prompt.includes("مسابقة")) {
    return "عنوان المسابقة";
  }

  if (prompt.includes("زيارة")) {
    return "عنوان الزيارة";
  }

  if (prompt.includes("حملة")) {
    return "عنوان الحملة";
  }

  if (prompt.includes("تكريم")) {
    return "عنوان التكريم";
  }

  if (intentCode === "STUDENT_RECOGNITION") {
    return "عنوان التكريم";
  }

  if (intentCode === "NATIONAL_EVENT") {
    return "اسم الفعالية أو المناسبة";
  }

  if (intentCode === "LESSON_IMPLEMENTATION") {
    return "موضوع الدرس";
  }

  if (intentCode === "TEACHING_STRATEGY") {
    return "اسم الاستراتيجية";
  }

  if (intentCode === "RESULTS_ANALYSIS") {
    return "اسم الاختبار أو الوحدة";
  }

  if (intentCode === "REMEDIAL_PLAN") {
    return "اسم الخطة العلاجية";
  }

  if (intentCode === "PARENT_COMMUNICATION") {
    return "موضوع التواصل";
  }

  if (intentCode === "TECHNOLOGY_USE") {
    return "اسم الأداة أو المنصة";
  }

  if (intentCode === "PROFESSIONAL_COMMUNITY") {
    return "عنوان المشاركة المهنية";
  }

  if (intentCode === "DUTY_FOLLOWUP") {
    return "نوع المهمة أو التكليف";
  }

  if (intentCode === "PORTFOLIO_EVIDENCE") {
    return "عنوان المنجز";
  }

  return "عنوان التقرير";
}

function primaryDateLabel(analysis: TeacherIntentAnalysis) {
  const intentCode = analysis.primaryIntent.code;

  if (intentCode === "RESULTS_ANALYSIS") {
    return "تاريخ الاختبار";
  }

  if (intentCode === "PARENT_COMMUNICATION") {
    return "تاريخ التواصل";
  }

  if (intentCode === "PORTFOLIO_EVIDENCE") {
    return "تاريخ التوثيق";
  }

  return "تاريخ التنفيذ";
}

function contextCoreLabels(analysis: TeacherIntentAnalysis) {
  const intentCode = analysis.primaryIntent.code;
  const labels: string[] = [];

  if (
    intentCode === "LESSON_IMPLEMENTATION" ||
    intentCode === "TEACHING_STRATEGY" ||
    intentCode === "RESULTS_ANALYSIS" ||
    intentCode === "REMEDIAL_PLAN" ||
    intentCode === "TECHNOLOGY_USE"
  ) {
    labels.push("المادة والصف");
  }

  if (
    intentCode === "STUDENT_RECOGNITION" ||
    intentCode === "NATIONAL_EVENT" ||
    intentCode === "REMEDIAL_PLAN" ||
    intentCode === "DUTY_FOLLOWUP"
  ) {
    labels.push("الفئة المستهدفة");
  }

  if (
    intentCode === "PARENT_COMMUNICATION" ||
    intentCode === "PROFESSIONAL_COMMUNITY"
  ) {
    labels.push("الأطراف المشاركة");
  }

  return labels;
}

function teacherFieldPriority(label: string, analysis: TeacherIntentAnalysis) {
  const normalized = normalizeAiReportArabicText(label);
  const primaryIdentity = normalizeAiReportArabicText(primaryIdentityLabel(analysis));

  if (
    normalized.includes(primaryIdentity) ||
    primaryIdentity.includes(normalized)
  ) {
    return 10;
  }

  if (
    normalized.includes("اسم") ||
    normalized.includes("عنوان") ||
    normalized.includes("موضوع") ||
    normalized.includes("نوع المهمة")
  ) {
    return 15;
  }

  if (
    normalized.includes("المادة") ||
    normalized.includes("الصف") ||
    normalized.includes("الاطراف") ||
    normalized.includes("الأطراف") ||
    normalized.includes("الجهة")
  ) {
    return 20;
  }

  if (
    normalized.includes("تاريخ") ||
    normalized.includes("موعد")
  ) {
    return 30;
  }

  if (
    normalized.includes("الفئة") ||
    normalized.includes("المستهدفة") ||
    normalized.includes("المستفيد")
  ) {
    return 40;
  }

  if (
    normalized.includes("عدد") ||
    normalized.includes("نسبة") ||
    normalized.includes("مدة")
  ) {
    return 50;
  }

  if (
    normalized.includes("هدف") ||
    normalized.includes("اهداف") ||
    normalized.includes("أهداف") ||
    normalized.includes("الغرض") ||
    normalized.includes("مبررات") ||
    normalized.includes("سبب")
  ) {
    return 60;
  }

  if (
    normalized.includes("الية") ||
    normalized.includes("آلية") ||
    normalized.includes("خطوات") ||
    normalized.includes("اجراءات") ||
    normalized.includes("إجراءات") ||
    normalized.includes("توظيف") ||
    normalized.includes("تنفيذ") ||
    normalized.includes("استخدام")
  ) {
    return 70;
  }

  if (
    normalized.includes("تفاعل") ||
    normalized.includes("اثر") ||
    normalized.includes("أثر") ||
    normalized.includes("نتائج") ||
    normalized.includes("مخرجات")
  ) {
    return 80;
  }

  if (
    normalized.includes("شواهد") ||
    normalized.includes("توثيق") ||
    normalized.includes("أدلة")
  ) {
    return 90;
  }

  if (normalized.includes("مكان")) {
    return 180;
  }

  return 200;
}

function extractKnowledgeOptions({
  label,
  knowledge,
  analysis,
}: {
  label: string;
  knowledge: AiReportKnowledgeSearchResult;
  analysis: TeacherIntentAnalysis;
}) {
  const scored: Array<{ label: string; score: number }> = [];

  for (const item of knowledge.items.slice(0, 500)) {
    const option = clean(item.optionLabel);

    if (!option || item.sourceType !== "value_bank") {
      continue;
    }

    const fieldText = [
      item.reportName,
      item.performanceElement,
      item.reportCategory,
      item.category,
      item.fieldKey,
      item.fieldLabel,
    ].join(" ");

    let score = 0;

    if (similarLabel(label, clean(item.fieldLabel || item.category))) {
      score += 5;
    }

    if (
      normalizeAiReportArabicText(item.performanceElement).includes(
        normalizeAiReportArabicText(analysis.resolvedPerformanceElementLabel),
      ) ||
      normalizeAiReportArabicText(analysis.resolvedPerformanceElementLabel).includes(
        normalizeAiReportArabicText(item.performanceElement),
      )
    ) {
      score += 3;
    }

    if (
      normalizeAiReportArabicText(fieldText).includes(
        normalizeAiReportArabicText(analysis.primaryIntent.label),
      )
    ) {
      score += 2;
    }

    if (score > 0) {
      scored.push({
        label: option,
        score,
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map((item) => item.label);
}

function mergeOptions({
  label,
  existingOptions,
  knowledge,
  analysis,
}: {
  label: string;
  existingOptions: unknown;
  knowledge: AiReportKnowledgeSearchResult;
  analysis: TeacherIntentAnalysis;
}) {
  const bankOptions = extractKnowledgeOptions({
    label,
    knowledge,
    analysis,
  });

  const contextualOptions = buildContextualTeacherOptions({
    label,
    intentCode: analysis.primaryIntent.code,
  });

  return normalizeTeacherOptions([
    ...normalizeTeacherOptions(existingOptions),
    ...bankOptions,
    ...contextualOptions,
  ]);
}

function fieldFromLabel({
  label,
  index,
  usedKeys,
  knowledge,
  analysis,
}: {
  label: string;
  index: number;
  usedKeys: Set<string>;
  knowledge: AiReportKnowledgeSearchResult;
  analysis: TeacherIntentAnalysis;
}): CustomReportField {
  const type = classifyTeacherFieldType(label, 0);
  const options =
    type === "multi_select"
      ? mergeOptions({
          label,
          existingOptions: [],
          knowledge,
          analysis,
        })
      : [];

  return {
    key: makeFieldKey(label, index, usedKeys),
    label,
    type,
    required: false,
    placeholder:
      type === "date"
        ? ""
        : type === ("number" as CustomReportField["type"])
          ? "أدخل الرقم فقط"
          : type === "textarea"
            ? `اكتب ${label}`
            : "",
    helpText:
      type === "multi_select"
        ? "اختر قيمة أو أكثر، ويمكن اختيار أخرى عند الحاجة."
        : "حقل اختياري يعبئه المعلم حسب سياق التقرير.",
    reportLabel: label,
    showInReport: true,
    order: index + 1,
    options,
  };
}

function preferredTeacherFields(fields: string[]) {
  return fields
    .filter((label) => !isExcludedLowPriorityTeacherField(label))
    .slice(0, MAX_FIELDS);
}

function orderAndEnsureTeacherFields({
  fields,
  fallbackFields,
  knowledge,
  analysis,
}: {
  fields: CustomReportField[];
  fallbackFields: CustomReportField[];
  knowledge: AiReportKnowledgeSearchResult;
  analysis: TeacherIntentAnalysis;
}) {
  const usedKeys = new Set(fields.map((field) => field.key));
  const nextFields = [...fields];

  const essentialLabels = [
    primaryIdentityLabel(analysis),
    ...contextCoreLabels(analysis),
    primaryDateLabel(analysis),
  ];

  for (const label of essentialLabels) {
    if (!label || isExcludedLowPriorityTeacherField(label)) {
      continue;
    }

    if (nextFields.some((field) => similarLabel(field.label, label))) {
      continue;
    }

    nextFields.push(
      fieldFromLabel({
        label,
        index: nextFields.length,
        usedKeys,
        knowledge,
        analysis,
      }),
    );
  }

  for (const field of fallbackFields) {
    if (nextFields.length >= MAX_FIELDS + 4) {
      break;
    }

    if (
      !field.label ||
      isExcludedLowPriorityTeacherField(field.label) ||
      nextFields.some((item) => similarLabel(item.label, field.label))
    ) {
      continue;
    }

    nextFields.push(field);
  }

  const uniqueFields: CustomReportField[] = [];

  for (const field of nextFields) {
    if (
      !field.label ||
      isExcludedLowPriorityTeacherField(field.label) ||
      uniqueFields.some((item) => similarLabel(item.label, field.label))
    ) {
      continue;
    }

    uniqueFields.push(field);
  }

  return uniqueFields
    .map((field, index) => ({
      field,
      index,
      priority: teacherFieldPriority(field.label, analysis),
    }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .slice(0, MAX_FIELDS)
    .map((item, index) => ({
      ...item.field,
      order: index + 1,
    }));
}

export function buildFallbackSchemaFromTeacherIntent({
  prompt,
  knowledge,
  analysis,
}: {
  prompt: string;
  knowledge: AiReportKnowledgeSearchResult;
  analysis: TeacherIntentAnalysis;
}): CustomReportSchema {
  const usedKeys = new Set<string>();

  const fields = preferredTeacherFields(analysis.primaryIntent.recommendedFields)
    .map((label, index) =>
      fieldFromLabel({
        label,
        index,
        usedKeys,
        knowledge,
        analysis,
      }),
    );

  const orderedFields = orderAndEnsureTeacherFields({
    fields,
    fallbackFields: fields,
    knowledge,
    analysis,
  });

  return {
    version: 1,
    title: `تقرير ذكي تجريبي - ${prompt.slice(0, 45)}`,
    description: `نموذج مبني على نية المعلم: ${analysis.primaryIntent.label}، وعنصر الأداء: ${analysis.resolvedPerformanceElementLabel}.`,
    sections: [
      {
        id: "ai_report2_teacher_intent_section",
        title: "بيانات التقرير الذكي التجريبي",
        description: "جميع الحقول اختيارية ومبنية من منظور المعلم.",
        order: 1,
        fields: orderedFields,
      },
    ],
  };
}

export function enforceTeacherIntentSchema({
  schema,
  prompt,
  knowledge,
  analysis,
}: {
  schema: CustomReportSchema;
  prompt: string;
  knowledge: AiReportKnowledgeSearchResult;
  analysis: TeacherIntentAnalysis;
}): CustomReportSchema {
  const usedKeys = new Set<string>();
  const seenLabels = new Set<string>();
  const rawFields = schema.sections.flatMap((section) => section.fields);
  const guardedFields: CustomReportField[] = [];

  for (const rawField of rawFields) {
    const label = clean(rawField.label || rawField.reportLabel);

    if (!label || isExcludedLowPriorityTeacherField(label)) {
      continue;
    }

    const labelKey = normalizeAiReportArabicText(label);

    if (seenLabels.has(labelKey)) {
      continue;
    }

    seenLabels.add(labelKey);

    const existingOptions = rawField.options || [];
    const type = classifyTeacherFieldType(label, existingOptions.length);
    const options =
      type === "multi_select"
        ? mergeOptions({
            label,
            existingOptions,
            knowledge,
            analysis,
          })
        : [];

    guardedFields.push({
      ...rawField,
      key: makeFieldKey(clean(rawField.key) || label, guardedFields.length, usedKeys),
      label,
      type,
      required: false,
      placeholder:
        type === "date"
          ? ""
          : type === ("number" as CustomReportField["type"])
            ? "أدخل الرقم فقط"
            : type === "textarea"
              ? clean(rawField.placeholder) || `اكتب ${label}`
              : "",
      helpText:
        type === "multi_select"
          ? "اختر قيمة أو أكثر، ويمكن اختيار أخرى عند الحاجة."
          : "حقل اختياري يعبئه المعلم حسب سياق التقرير.",
      reportLabel: rawField.reportLabel || label,
      showInReport: true,
      order: guardedFields.length + 1,
      options,
    });
  }

  const fallback = buildFallbackSchemaFromTeacherIntent({
    prompt,
    knowledge,
    analysis,
  });

  return {
    ...schema,
    version: 1,
    title: schema.title || fallback.title,
    description: schema.description || fallback.description,
    sections: [
      {
        id: schema.sections[0]?.id || "ai_report2_teacher_intent_section",
        title: schema.sections[0]?.title || "بيانات التقرير الذكي التجريبي",
        description:
          schema.sections[0]?.description ||
          "جميع الحقول اختيارية ومبنية من منظور المعلم.",
        order: 1,
        fields: orderAndEnsureTeacherFields({
          fields:
            guardedFields.length >= 3
              ? guardedFields
              : fallback.sections[0].fields,
          fallbackFields: fallback.sections[0].fields,
          knowledge,
          analysis,
        }),
      },
    ],
  };
}

export function evaluateTeacherSchemaFit({
  schema,
  analysis,
}: {
  schema: CustomReportSchema;
  analysis: TeacherIntentAnalysis;
}) {
  const fields = schema.sections.flatMap((section) => section.fields);
  const issues: string[] = [];
  let score = 0.35;

  if (fields.length >= 5 && fields.length <= MAX_FIELDS) {
    score += 0.15;
  } else {
    issues.push("عدد الحقول غير مثالي.");
  }

  const hasPrimaryIdentity = fields.some((field) =>
    similarLabel(field.label, primaryIdentityLabel(analysis)),
  );

  if (hasPrimaryIdentity) {
    score += 0.15;
  } else {
    issues.push("لا يوجد حقل تعريفي رئيسي مناسب.");
  }

  const hasDate = fields.some((field) =>
    normalizeAiReportArabicText(field.label).includes("تاريخ"),
  );

  if (hasDate) {
    score += 0.1;
  } else {
    issues.push("لا يوجد تاريخ مناسب للتقرير.");
  }

  const forbidden = analysis.primaryIntent.avoidUnlessExplicit.filter((label) =>
    fields.some((field) => similarLabel(field.label, label)),
  );

  if (forbidden.length === 0) {
    score += 0.1;
  } else {
    issues.push(`توجد حقول بعيدة عن نية المعلم: ${forbidden.join("، ")}`);
  }

  const emptyMultiSelectFields = fields.filter(
    (field) => field.type === "multi_select" && (!field.options || field.options.length < 2),
  );

  if (emptyMultiSelectFields.length === 0) {
    score += 0.15;
  } else {
    issues.push("بعض حقول الاختيار المتعدد بلا خيارات كافية.");
  }

  const excludedFields = fields.filter((field) =>
    isExcludedLowPriorityTeacherField(field.label),
  );

  if (excludedFields.length === 0) {
    score += 0.1;
  } else {
    issues.push("توجد حقول تحديات أو توصيات غير مطلوبة.");
  }

  const weakLabels = fields.filter((field) => field.label.length < 3);

  if (weakLabels.length === 0) {
    score += 0.05;
  } else {
    issues.push("بعض أسماء الحقول غير واضحة.");
  }

  return {
    score: Math.min(0.98, score),
    issues,
    passed: score >= 0.9,
  };
}

export function buildTeacherRepairInstruction({
  score,
  issues,
  analysis,
}: {
  score: number;
  issues: string[];
  analysis: TeacherIntentAnalysis;
}) {
  return [
    `درجة ملاءمة النموذج السابق من منظور المعلم: ${Math.round(score * 100)}%.`,
    "أعد بناء النموذج ليكون أقرب إلى نية المعلم.",
    `نية المعلم: ${analysis.primaryIntent.label}.`,
    `عنصر الأداء: ${analysis.resolvedPerformanceElementLabel}.`,
    `الحقل التعريفي الرئيسي المناسب: ${primaryIdentityLabel(analysis)}.`,
    `حقل التاريخ المناسب: ${primaryDateLabel(analysis)}.`,
    "لا تجعل مكان التنفيذ حقلًا أساسيًا إلا إذا كان ضروريًا جدًا من وصف المعلم.",
    "لا تضف التحديات أو التوصيات أو المقترحات.",
    `لا تتجاوز ${MAX_FIELDS} خانات.`,
    ...issues.map((issue) => `مشكلة يجب علاجها: ${issue}`),
    "اجعل النموذج عمليًا وسريعًا للمعلم.",
  ].join("\n");
}