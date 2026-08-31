import { SAUDI_SCHOOL_GRADES } from "@/lib/timetable/catalog/saudi-school-grades";

export const TEN_PERCENT_MAX_WEEK = 18;

export type TenPercentDomainValue = {
  slug: string;
  serviceSlug: string;
  title: string;
};

export type TenPercentProgramValue = {
  domainSlug: string;
  domainServiceSlug: string;
  domainTitle: string;
  value: string;
  name: string;
  isOther: boolean;
};

export type ActivityPlanTenPercentRow = {
  id: string;
  stage: string;
  domains: TenPercentDomainValue[];
  programs: TenPercentProgramValue[];
  periodCount: string;
  executionWeeks: number[];
  subject: string;
  grades: string[];
  teacherNames: string[];
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TenPercentWorkflowProgramOption = {
  value: string;
  label: string;
  isOther: boolean;
};

export type TenPercentDomainOption = TenPercentDomainValue & {
  options: TenPercentWorkflowProgramOption[];
};

export function getTenPercentGradeOptions(stage: string) {
  const normalized = String(stage || "").trim();
  const stageKey = normalized.includes("ابتدائي")
    ? "primary"
    : normalized.includes("متوسط")
      ? "intermediate"
      : normalized.includes("ثانوي")
        ? "secondary"
        : null;
  return stageKey
    ? SAUDI_SCHOOL_GRADES.filter((grade) => grade.stageKey === stageKey).map((grade) => grade.label)
    : [];
}

export function normalizeTenPercentWeeks(values: unknown) {
  const source = Array.isArray(values) ? values : [];
  return Array.from(new Set(source
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= TEN_PERCENT_MAX_WEEK)))
    .sort((left, right) => left - right);
}

export function formatTenPercentWeeks(values: number[]) {
  const weeks = normalizeTenPercentWeeks(values);
  return weeks.length ? weeks.join("-") : "—";
}

export function normalizeTenPercentTextList(values: unknown) {
  const source = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values.split(/\r?\n/)
      : [];
  return Array.from(new Set(source
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)));
}
