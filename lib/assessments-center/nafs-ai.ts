import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import type { NafsAiAnalysis, NafsSnapshot } from "./nafs-types";
import type { MultiPeriodSnapshot } from "./assessment-types";
import { resolveAnalysisMeasurements, resolveAnalysisPresentation } from "./analysis-presentation";

const empty: NafsAiAnalysis = {
  executiveSummary: "",
  strengths: [],
  weaknesses: [],
  notablePatterns: [],
  possibleCauses: [],
  improvementPriorities: [],
  recommendations: [],
  remedialActions: [],
  enrichmentActions: [],
  developmentPlan: [],
  followUpIndicators: [],
};

function list(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 24)
    : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 4000) : "";
}

function optionalText(value: unknown) {
  const result = text(value);
  return result || undefined;
}

export function validateNafsAiOutput(value: unknown): NafsAiAnalysis {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const plans = Array.isArray(source.developmentPlan) ? source.developmentPlan : [];

  return {
    executiveSummary: text(source.executiveSummary),
    strengths: list(source.strengths),
    weaknesses: list(source.weaknesses),
    notablePatterns: list(source.notablePatterns),
    possibleCauses: list(source.possibleCauses),
    improvementPriorities: list(source.improvementPriorities),
    recommendations: list(source.recommendations),
    remedialActions: list(source.remedialActions),
    enrichmentActions: list(source.enrichmentActions),
    developmentPlan: plans.slice(0, 24).flatMap((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const area = text(row.area || row.domain);
      if (!area && !text(row.action)) return [];
      return [{
        area,
        need: text(row.need),
        action: text(row.action),
        method: text(row.method),
        duration: text(row.duration),
        responsible: text(row.responsible),
        indicator: text(row.indicator),
        target: text(row.target),
        component: optionalText(row.component || row.element),
        cause: optionalText(row.cause),
        objective: optionalText(row.objective || row.goal),
        steps: list(row.steps),
        resources: optionalText(row.resources),
        participants: optionalText(row.participants),
        followUpMethod: optionalText(row.followUpMethod),
        followUpTiming: optionalText(row.followUpTiming),
        evidence: optionalText(row.evidence),
      }];
    }),
    followUpIndicators: list(source.followUpIndicators),
  };
}

const sharedSystemPrompt = `
أنت خبير متمرس في التقويم التربوي وتحسين المدرسة وتحليل نتائج التعلم.
أعد JSON صالحًا فقط باللغة العربية، دون Markdown أو مقدمات خارج JSON.
الأرقام الرسمية الواردة في السياق محسوبة حتميًا من Teachix وهي المصدر الوحيد للحقيقة؛ لا تعِد حسابها ولا تخترع أرقامًا أو طلابًا أو مهارات غير موجودة.
فسّر النتائج تربويًا بعمق، واربط كل استنتاج بالبيانات المتاحة. عند تفسير الأسباب استخدم صياغة احتمالية مثل «قد يشير» و«يحتمل».
لا تذكر أسماء الطلاب ولا ترسلها في النص الناتج. اجعل الخطط قابلة للتنفيذ والقياس، ومحددة بالفئة أو المهارة دون كشف هوية فردية.
استخدم قوائم متعددة العناصر عند وجود بيانات كافية، ولا تختصر الخطة في عبارات عامة.
`;

const outputContract = `
المفاتيح المطلوبة: executiveSummary, strengths, weaknesses, notablePatterns, possibleCauses,
improvementPriorities, recommendations, remedialActions, enrichmentActions, developmentPlan,
followUpIndicators.
developmentPlan مصفوفة تفصيلية، وكل عنصر يتضمن:
area, component, need, cause, objective, action, steps, method, resources, duration,
responsible, participants, indicator, target, followUpMethod, followUpTiming, evidence.
اجعل remedialActions وenrichmentActions وrecommendations عملية ومتدرجة، واجعل followUpIndicators قابلة للملاحظة والقياس.
`;

function parse(content: string) {
  try {
    return JSON.parse(content.replace(/^```json\s*/i, "").replace(/\s*```$/i, ""));
  } catch {
    return empty;
  }
}

export async function generateNafsAiAnalysis(snapshot: NafsSnapshot) {
  const presentation = resolveAnalysisPresentation(snapshot);
  const measurements = resolveAnalysisMeasurements(snapshot);
  const context = {
    analysisType: "NAFS",
    presentationMode: presentation.mode,
    measurementCount: measurements.length,
    measurementLabels: measurements.map((measurement) => measurement.label),
    studentCount: presentation.studentCount,
    measurementMode: presentation.measurementMode,
    availableMeasurements: measurements.map((measurement) => ({ id: measurement.id, label: measurement.label, studentCount: measurement.studentCount, averageScore: measurement.averageScore, achievementPercentage: measurement.achievementPercentage })),
    matchedStudentCount: presentation.series.matchedStudentCount,
    title: snapshot.title,
    subject: snapshot.subject,
    grade: snapshot.grade,
    classroom: snapshot.classroom,
    maximumScore: snapshot.totalScore,
    deterministicStatistics: snapshot.statistics,
    anonymousResults: snapshot.students.map((student, index) => ({
      row: index + 1,
      pre: student.prePercentage,
      post: student.postPercentage,
      change: student.percentagePointDifference,
      direction: student.direction,
      category: student.category,
    })),
  };

  const content = await callDeepSeekChat({
    temperature: 0.25,
    maxTokens: 4200,
    responseFormat: "json_object",
    messages: [
      { role: "system", content: `${sharedSystemPrompt}\n${outputContract}` },
      {
        role: "user",
        content: `${presentation.periodCount === 1 ? "حلل القياس المتاح بوصفه أداءً مطلقًا. لا تذكر التحسن أو الثبات أو التراجع أو المقارنة الزمنية." : presentation.periodCount === 2 ? "قارن القياسين الفعليين باستخدام تسمياتهما المحفوظة، دون افتراض قبلي/بعدي إذا لم تدل التسميات على ذلك." : "حلل الاتجاه عبر جميع القياسات، وحدد أفضل وأضعف قياس والتذبذب إن كان مدعومًا."} اشرح ما الذي ينبغي تنفيذه وكيف ومتى وبأي مؤشر نجاح.\n${JSON.stringify(context)}`,
      },
    ],
  });

  return validateNafsAiOutput(parse(content));
}

export async function generateMultiPeriodAiAnalysis(snapshot: MultiPeriodSnapshot) {
  const presentation = resolveAnalysisPresentation(snapshot);
  const measurements = resolveAnalysisMeasurements(snapshot);
  const context = {
    analysisType: snapshot.type,
    presentationMode: presentation.mode,
    measurementCount: measurements.length,
    measurementLabels: measurements.map((measurement) => measurement.label),
    studentCount: presentation.studentCount,
    measurementMode: presentation.measurementMode,
    title: snapshot.title,
    subject: snapshot.subject,
    grade: snapshot.grade,
    classroom: snapshot.classroom,
    maximumScore: snapshot.maximumScore,
    availableMeasurements: measurements.map((measurement) => ({ id: measurement.id, label: measurement.label, studentCount: measurement.studentCount, averageScore: measurement.averageScore, achievementPercentage: measurement.achievementPercentage })),
    firstToLastChange: presentation.series.firstToLastChange,
    matchedStudentCount: presentation.series.matchedStudentCount,
    anonymousStudents: snapshot.students.map((student, index) => ({
      row: index + 1,
      scores: student.scores,
      direction: student.direction,
    })),
  };

  const focus = presentation.periodCount === 1
    ? "حلل القياس الحالي فقط، وركز على الأداء المطلق والفجوات والتدخلات دون مقارنة أو اتجاه زمني."
    : presentation.periodCount === 2
      ? "قارن القياسين المحفوظين باستخدام تسمياتهما الفعلية، ولا تستخدم قبلي/بعدي إلا إذا كانت التسميات كذلك."
      : "حلل المسار الزمني عبر جميع القياسات، وأبرز أفضل وأضعف قياس والتغير والتذبذب وخطة المتابعة.";

  const content = await callDeepSeekChat({
    temperature: 0.25,
    maxTokens: 4200,
    responseFormat: "json_object",
    messages: [
      { role: "system", content: `${sharedSystemPrompt}\n${outputContract}` },
      { role: "user", content: `${focus}\nلا تفترض وجود مقارنة قبلي/بعدي إن لم تكن الفترات تدعمها.\n${JSON.stringify(context)}` },
    ],
  });

  return validateNafsAiOutput(parse(content));
}
