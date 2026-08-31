import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import { resolveAnalysisMeasurements, resolveAnalysisPresentation } from "./analysis-presentation";
import { buildAssessmentPerformanceLevels } from "./assessment-report-payload";
import { normalizeSubjectPeriodicAi, type SubjectPeriodicAiAnalysis } from "./subject-periodic-types";

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : {};
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parse(content: string): SubjectPeriodicAiAnalysis {
  try {
    return normalizeSubjectPeriodicAi(JSON.parse(content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "")));
  } catch {
    return normalizeSubjectPeriodicAi(null);
  }
}

export async function generateSubjectPeriodicAiAnalysis(snapshotValue: unknown) {
  const snapshot = record(snapshotValue);
  const presentation = resolveAnalysisPresentation(snapshot);
  const latest = presentation.availableMeasurements.at(-1);
  const maximumScore = number(snapshot.maximumScore ?? snapshot.totalScore) ?? 0;
  const scores = latest?.scores.map((item) => item.score) ?? [];
  const averageScore = latest?.averageScore ?? 0;
  const performanceLevels = buildAssessmentPerformanceLevels(scores, maximumScore);
  const context = {
    analysisType: "SUBJECT_PERIODIC",
    presentationMode: presentation.mode,
    measurementMode: presentation.measurementMode,
    subject: typeof snapshot.subject === "string" ? snapshot.subject : "",
    grade: typeof snapshot.grade === "string" ? snapshot.grade : "",
    classroom: typeof snapshot.classroom === "string" ? snapshot.classroom : "",
    semester: typeof snapshot.semester === "string" ? snapshot.semester : "",
    academicYear: typeof snapshot.academicYear === "string" ? snapshot.academicYear : "",
    maximumScore,
    studentCount: latest?.studentCount ?? 0,
    averageScore,
    achievementPercentage: latest?.achievementPercentage ?? 0,
    minScore: latest?.minScore ?? 0,
    maxScore: latest?.maxScore ?? 0,
    scoreRange: latest?.scoreRange ?? 0,
    totalScore: scores.reduce((sum, score) => sum + score, 0),
    performanceLevels,
    masteryCount: latest?.masteryCount ?? 0,
    masteryPercentage: latest?.masteryPercentage ?? 0,
    belowMasteryCount: latest?.belowMasteryCount ?? 0,
  };
  const systemPrompt = `أنت خبير في التقويم التربوي وتحسين تعلم الطلاب داخل المدرسة.
أعد JSON صالحًا فقط باللغة العربية، دون Markdown أو أي نص خارج JSON.
الأرقام الموجودة في السياق محسوبة حتميًا من Teachix وهي المصدر الوحيد للأرقام؛ لا تعِد حسابها ولا تخترع أرقامًا أو أسماء طلاب أو مهارات غير موجودة.
فسّر البيانات المجمعة فقط، ولا تذكر أسماء الطلاب أو تستنتج حقائق فردية.
اكتب محتوى تربويًا عمليًا ومفصلًا يصلح للتنفيذ المدرسي، مع التفريق بين العلاج والإثراء والتعزيز.
يجب أن يحتوي JSON على المفاتيح التالية حرفيًا:
analyticalReading, strengths, improvementAreas, recommendations, remedialPlan, enrichmentPlan, reinforcementPlan, followUpIndicators, finalConclusion.
strengths: 3 إلى 5 عناصر، وكل عنصر يحوي title,evidence,educationalMeaning,howToReinforce.
improvementAreas: 3 إلى 5 عناصر، وكل عنصر يحوي title,evidence,educationalImpact,priority.
recommendations: 4 إلى 6 عناصر، وكل عنصر يحوي recommendation,implementation,responsibleRole,timing,measurementMethod.
remedialPlan: 3 إلى 5 عناصر، وكل عنصر يحوي targetNeed,objective,actions,strategy,duration,responsible,measurementIndicator,successCriteria.
enrichmentPlan: 3 إلى 5 عناصر، وكل عنصر يحوي targetStrength,objective,activity,implementation,followUp,measurementIndicator.
reinforcementPlan: 3 إلى 5 عناصر، وكل عنصر يحوي targetSkillOrBehavior,objective,reinforcementAction,implementationSteps,frequency,responsible,measurementIndicator,expectedOutcome.
followUpIndicators: 4 إلى 6 عناصر، وكل عنصر يحوي indicator,target,reviewTiming,successCriteria.
إذا لم تكف البيانات لإسناد استنتاج محدد، استخدم صياغة احتمالية تربوية ولا تضف معلومة غير مدعومة.`;
  const userPrompt = `حلل نتائج الاختبار الفصلي للمادة وفق الحالة الحالية فقط. قدّم قراءة تفسيرية وخططًا قابلة للتنفيذ والمتابعة.
السياق الرقمي الحتمي:
${JSON.stringify(context)}`;
  const content = await callDeepSeekChat({
    temperature: 0.25,
    maxTokens: 6000,
    responseFormat: "json_object",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return parse(content);
}
