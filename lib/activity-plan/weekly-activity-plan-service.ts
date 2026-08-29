import "server-only";

import { prisma } from "@/lib/prisma";
import { getActivityPlanDates } from "@/lib/activity-plan/activity-plan-calendar";
import { ACTIVITY_PLAN_OTHER_PROGRAM_VALUE } from "@/lib/activity-plan/activity-plan-program-value";
import { findActivityPlanWorkflowProgram, getActivityPlanWorkflowPrograms } from "@/lib/activity-plan/activity-plan-workflow-programs";
import { getActivityProgramDomainByServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import { normalizeActivityPlanStage } from "@/lib/activity-plan/activity-plan-stages";

export type WeeklyActivityItem = {
  domainServiceSlug: string;
  domainTitle: string;
  programs: Array<{ value: string; name: string; isOther: boolean }>;
};

export type WeeklyActivityPlan = {
  id: string | null;
  stage: string;
  weekNumber: number;
  dateFrom: string;
  dateTo: string;
  periodCount: number | null;
  items: WeeklyActivityItem[];
};

function dateRange(weekNumber: number) {
  const dates = getActivityPlanDates(weekNumber);
  return { dateFrom: dates[0]?.date || null, dateTo: dates.at(-1)?.date || null };
}

function clean(value: unknown, max = 191) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function normalizeWeeklyItems(value: unknown): WeeklyActivityItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const serviceSlug = clean(item.domainServiceSlug, 120);
    const domain = getActivityProgramDomainByServiceSlug(serviceSlug);
    if (!domain || !Array.isArray(item.programs)) return [];
    const programs = item.programs.flatMap((rawProgram) => {
      if (!rawProgram || typeof rawProgram !== "object") return [];
      const program = rawProgram as Record<string, unknown>;
      const value = clean(program.value, 191);
      const name = clean(program.name, 120);
      if (!value || !name) return [];
      return [{ value, name, isOther: value === ACTIVITY_PLAN_OTHER_PROGRAM_VALUE }];
    });
    return programs.length ? [{ domainServiceSlug: serviceSlug, domainTitle: domain.title, programs }] : [];
  });
}

export async function validateWeeklyItems(value: unknown) {
  const items = normalizeWeeklyItems(value);
  const validated: WeeklyActivityItem[] = [];
  for (const item of items) {
    const options = await getActivityPlanWorkflowPrograms(item.domainServiceSlug);
    if (!options) throw new Error("المجال المحدد لا يملك Workflow منشورًا.");
    const programs = item.programs.map((program) => {
      const selected = findActivityPlanWorkflowProgram(options.options, program.value);
      if (!selected) throw new Error("يوجد برنامج غير منشور أو غير صالح.");
      if (selected.isOther && !program.name.trim()) throw new Error("يجب إدخال اسم البرنامج الآخر.");
      return {
        value: selected.value,
        name: selected.isOther ? program.name : selected.label,
        isOther: selected.isOther,
      };
    });
    validated.push({ ...item, domainTitle: options.domain.title, programs });
  }
  return validated;
}

export function weeklyPlanFromRecord(record: {
  id: string;
  stage: string;
  weekNumber: number;
  dateFrom: Date;
  dateTo: Date;
  periodCount: number | null;
  items: unknown;
}): WeeklyActivityPlan {
  return {
    id: record.id,
    stage: record.stage,
    weekNumber: record.weekNumber,
    dateFrom: record.dateFrom.toISOString().slice(0, 10),
    dateTo: record.dateTo.toISOString().slice(0, 10),
    periodCount: record.periodCount,
    items: normalizeWeeklyItems(record.items),
  };
}

export function getWeeklyDateRange(weekNumber: number) {
  return dateRange(weekNumber);
}

export async function getWeeklyActivityPlans(schoolAccountId: string, stage: string, ownerUserId?: string) {
  const selectedStage = normalizeActivityPlanStage(stage);
  if (!selectedStage) return [];
  const records = await prisma.weeklyActivityPlanEntry.findMany({
    where: { schoolAccountId, stage: selectedStage, ...(ownerUserId ? { createdById: ownerUserId } : {}) },
    orderBy: { weekNumber: "asc" },
  });
  const byWeek = new Map(records.map((record) => [record.weekNumber, weeklyPlanFromRecord(record)]));
  return Array.from({ length: 20 }, (_, index) => {
    const weekNumber = index + 1;
    const existing = byWeek.get(weekNumber);
    const range = dateRange(weekNumber);
    return existing || {
      id: null,
      stage: selectedStage,
      weekNumber,
      dateFrom: range.dateFrom || "",
      dateTo: range.dateTo || "",
      periodCount: null,
      items: [],
    };
  });
}

export async function saveWeeklyActivityPlan(input: {
  schoolAccountId: string;
  createdById: string;
  stage: string;
  weekNumber: number;
  periodCount: number | null;
  items: unknown;
}) {
  const stage = normalizeActivityPlanStage(input.stage);
  if (!stage || input.weekNumber < 1 || input.weekNumber > 20) throw new Error("بيانات المرحلة أو الأسبوع غير صالحة.");
  const range = dateRange(input.weekNumber);
  if (!range.dateFrom || !range.dateTo) throw new Error("تاريخ الأسبوع غير متاح في التقويم الدراسي.");
  const items = await validateWeeklyItems(input.items);
  const record = await prisma.weeklyActivityPlanEntry.upsert({
    where: { schoolAccountId_stage_weekNumber: { schoolAccountId: input.schoolAccountId, stage, weekNumber: input.weekNumber } },
    update: {
      dateFrom: new Date(`${range.dateFrom}T00:00:00.000Z`),
      dateTo: new Date(`${range.dateTo}T00:00:00.000Z`),
      periodCount: input.periodCount,
      items: items as unknown as object,
    },
    create: {
      schoolAccountId: input.schoolAccountId,
      createdById: input.createdById,
      stage,
      weekNumber: input.weekNumber,
      dateFrom: new Date(`${range.dateFrom}T00:00:00.000Z`),
      dateTo: new Date(`${range.dateTo}T00:00:00.000Z`),
      periodCount: input.periodCount,
      items: items as unknown as object,
    },
  });
  return weeklyPlanFromRecord(record);
}
