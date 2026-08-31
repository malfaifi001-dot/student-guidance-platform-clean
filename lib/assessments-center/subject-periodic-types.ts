export type SubjectPeriodicStrength = {
  title: string;
  evidence: string;
  educationalMeaning: string;
  howToReinforce: string;
};

export type SubjectPeriodicImprovementArea = {
  title: string;
  evidence: string;
  educationalImpact: string;
  priority: string;
};

export type SubjectPeriodicRecommendation = {
  recommendation: string;
  implementation: string;
  responsibleRole: string;
  timing: string;
  measurementMethod: string;
};

export type SubjectPeriodicRemedialItem = {
  targetNeed: string;
  objective: string;
  actions: string[];
  strategy: string;
  duration: string;
  responsible: string;
  measurementIndicator: string;
  successCriteria: string;
};

export type SubjectPeriodicEnrichmentItem = {
  targetStrength: string;
  objective: string;
  activity: string;
  implementation: string;
  followUp: string;
  measurementIndicator: string;
};

export type SubjectPeriodicReinforcementItem = {
  targetSkillOrBehavior: string;
  objective: string;
  reinforcementAction: string;
  implementationSteps: string[];
  frequency: string;
  responsible: string;
  measurementIndicator: string;
  expectedOutcome: string;
};

export type SubjectPeriodicFollowUpIndicator = {
  indicator: string;
  target: string;
  reviewTiming: string;
  successCriteria: string;
};

export type SubjectPeriodicAiAnalysis = {
  analyticalReading: string;
  strengths: SubjectPeriodicStrength[];
  improvementAreas: SubjectPeriodicImprovementArea[];
  recommendations: SubjectPeriodicRecommendation[];
  remedialPlan: SubjectPeriodicRemedialItem[];
  enrichmentPlan: SubjectPeriodicEnrichmentItem[];
  reinforcementPlan: SubjectPeriodicReinforcementItem[];
  followUpIndicators: SubjectPeriodicFollowUpIndicator[];
  finalConclusion: string;
};

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : {};
}

function text(value: unknown, limit = 2400): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function stringList(value: unknown, limit = 8): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function objectList(value: unknown, limit = 8): RecordValue[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is RecordValue => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .slice(0, limit)
        .map(record)
    : [];
}

function sourceList(source: RecordValue, ...keys: string[]) {
  for (const key of keys) {
    if (source[key] !== undefined) return source[key];
  }
  return undefined;
}

export const emptySubjectPeriodicAi: SubjectPeriodicAiAnalysis = {
  analyticalReading: "",
  strengths: [],
  improvementAreas: [],
  recommendations: [],
  remedialPlan: [],
  enrichmentPlan: [],
  reinforcementPlan: [],
  followUpIndicators: [],
  finalConclusion: "",
};

export function normalizeSubjectPeriodicAi(value: unknown): SubjectPeriodicAiAnalysis {
  const source = record(value);
  const strengthsSource = sourceList(source, "strengths");
  const improvementsSource = sourceList(source, "improvementAreas", "weaknesses", "improvementPriorities");
  const recommendationsSource = sourceList(source, "recommendations");
  const remedialSource = sourceList(source, "remedialPlan", "remedialActions");
  const enrichmentSource = sourceList(source, "enrichmentPlan", "enrichmentActions");
  const reinforcementSource = sourceList(source, "reinforcementPlan");
  const followUpSource = sourceList(source, "followUpIndicators");

  return {
    analyticalReading: text(source.analyticalReading || source.executiveSummary),
    strengths: objectList(strengthsSource).map((item) => ({
      title: text(item.title || item.area),
      evidence: text(item.evidence),
      educationalMeaning: text(item.educationalMeaning || item.meaning),
      howToReinforce: text(item.howToReinforce || item.reinforcement),
    })).concat(stringList(strengthsSource).map((item) => ({ title: item, evidence: "", educationalMeaning: "", howToReinforce: "" }))).slice(0, 8),
    improvementAreas: objectList(improvementsSource).map((item) => ({
      title: text(item.title || item.area),
      evidence: text(item.evidence),
      educationalImpact: text(item.educationalImpact || item.impact),
      priority: text(item.priority),
    })).concat(stringList(improvementsSource).map((item) => ({ title: item, evidence: "", educationalImpact: "", priority: "" }))).slice(0, 8),
    recommendations: objectList(recommendationsSource).map((item) => ({
      recommendation: text(item.recommendation || item.title || item.action),
      implementation: text(item.implementation || item.method),
      responsibleRole: text(item.responsibleRole || item.responsible),
      timing: text(item.timing || item.duration),
      measurementMethod: text(item.measurementMethod || item.indicator),
    })).concat(stringList(recommendationsSource).map((item) => ({ recommendation: item, implementation: "", responsibleRole: "", timing: "", measurementMethod: "" }))).slice(0, 8),
    remedialPlan: objectList(remedialSource).map((item) => ({
      targetNeed: text(item.targetNeed || item.need || item.area),
      objective: text(item.objective || item.goal),
      actions: stringList(item.actions || item.steps, 6),
      strategy: text(item.strategy || item.method),
      duration: text(item.duration),
      responsible: text(item.responsible),
      measurementIndicator: text(item.measurementIndicator || item.indicator),
      successCriteria: text(item.successCriteria || item.successCriterion || item.target),
    })).concat(stringList(remedialSource).map((item) => ({ targetNeed: item, objective: "", actions: [], strategy: "", duration: "", responsible: "", measurementIndicator: "", successCriteria: "" }))).slice(0, 8),
    enrichmentPlan: objectList(enrichmentSource).map((item) => ({
      targetStrength: text(item.targetStrength || item.strength || item.area),
      objective: text(item.objective || item.goal),
      activity: text(item.activity || item.action),
      implementation: text(item.implementation || item.method),
      followUp: text(item.followUp || item.followUpMethod),
      measurementIndicator: text(item.measurementIndicator || item.indicator),
    })).concat(stringList(enrichmentSource).map((item) => ({ targetStrength: item, objective: "", activity: "", implementation: "", followUp: "", measurementIndicator: "" }))).slice(0, 8),
    reinforcementPlan: objectList(reinforcementSource).map((item) => ({
      targetSkillOrBehavior: text(item.targetSkillOrBehavior || item.skill || item.area),
      objective: text(item.objective || item.goal),
      reinforcementAction: text(item.reinforcementAction || item.action),
      implementationSteps: stringList(item.implementationSteps || item.steps, 6),
      frequency: text(item.frequency),
      responsible: text(item.responsible),
      measurementIndicator: text(item.measurementIndicator || item.indicator),
      expectedOutcome: text(item.expectedOutcome || item.outcome),
    })).concat(stringList(reinforcementSource).map((item) => ({ targetSkillOrBehavior: item, objective: "", reinforcementAction: "", implementationSteps: [], frequency: "", responsible: "", measurementIndicator: "", expectedOutcome: "" }))).slice(0, 8),
    followUpIndicators: objectList(followUpSource).map((item) => ({
      indicator: text(item.indicator || item.title),
      target: text(item.target),
      reviewTiming: text(item.reviewTiming || item.timing),
      successCriteria: text(item.successCriteria || item.successCriterion),
    })).concat(stringList(followUpSource).map((item) => ({ indicator: item, target: "", reviewTiming: "", successCriteria: "" }))).slice(0, 8),
    finalConclusion: text(source.finalConclusion || source.conclusion),
  };
}
