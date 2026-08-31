import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_PROGRAM_DOMAINS, getActivityProgramDomainByServiceSlug, getActivityProgramDomainBySlug } from "@/lib/activity-programs/activity-program-catalog";
import { ACTIVITY_PLAN_OTHER_PROGRAM_VALUE } from "@/lib/activity-plan/activity-plan-program-value";
import { findActivityPlanWorkflowProgram, getActivityPlanWorkflowPrograms } from "@/lib/activity-plan/activity-plan-workflow-programs";
import { normalizeActivityPlanStage, REAL_ACTIVITY_PLAN_STAGES } from "@/lib/activity-plan/activity-plan-stages";
import {
  ActivityPlanTenPercentRow,
  getTenPercentGradeOptions,
  normalizeTenPercentTextList,
  normalizeTenPercentWeeks,
  TenPercentDomainValue,
  TenPercentProgramValue,
} from "@/lib/activity-plan/ten-percent-activity-plan-types";

type RawTenPercentInput = {
  id?: unknown;
  stage?: unknown;
  domains?: unknown;
  programs?: unknown;
  periodCount?: unknown;
  executionWeeks?: unknown;
  subject?: unknown;
  grades?: unknown;
  teacherNames?: unknown;
};

function cleanText(value: unknown, max = 191) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function normalizeDomains(value: unknown): TenPercentDomainValue[] {
  const source = Array.isArray(value) ? value : [];
  const domains: TenPercentDomainValue[] = [];
  for (const item of source) {
    const raw = typeof item === "string" ? item : item && typeof item === "object" ? (item as Record<string, unknown>).serviceSlug || (item as Record<string, unknown>).slug : "";
    const text = typeof raw === "string" ? raw.trim() : "";
    const domain = getActivityProgramDomainByServiceSlug(text) || getActivityProgramDomainBySlug(text);
    if (!domain || domains.some((current) => current.serviceSlug === domain.serviceSlug)) continue;
    domains.push({ slug: domain.slug, serviceSlug: domain.serviceSlug, title: domain.title });
  }
  return domains;
}

async function normalizePrograms(value: unknown, domains: TenPercentDomainValue[]) {
  const source = Array.isArray(value) ? value : [];
  const optionsByDomain = new Map<string, Awaited<ReturnType<typeof getActivityPlanWorkflowPrograms>>>();
  for (const domain of domains) {
    optionsByDomain.set(domain.serviceSlug, await getActivityPlanWorkflowPrograms(domain.serviceSlug));
  }

  const programs: TenPercentProgramValue[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const rawDomain = cleanText(record.domainServiceSlug || record.domainSlug);
    const domain = domains.find((current) => current.serviceSlug === rawDomain || current.slug === rawDomain);
    if (!domain) continue;
    const workflow = optionsByDomain.get(domain.serviceSlug);
    if (!workflow) throw new Error(`تعذر تحميل برامج مجال ${domain.title} من سير العمل المنشور.`);
    const valueText = cleanText(record.value);
    const option = findActivityPlanWorkflowProgram(workflow.options, valueText);
    if (!option) continue;
    const manualName = cleanText(record.name);
    if (option.isOther && !manualName) throw new Error("اكتب اسم البرنامج الآخر قبل الحفظ.");
    const key = `${domain.serviceSlug}:${option.value}`;
    if (programs.some((program) => `${program.domainServiceSlug}:${program.value}` === key)) continue;
    programs.push({
      domainSlug: domain.slug,
      domainServiceSlug: domain.serviceSlug,
      domainTitle: domain.title,
      value: option.value,
      name: option.isOther ? manualName : option.label,
      isOther: option.isOther,
    });
  }
  return programs;
}

export async function validateTenPercentRow(input: RawTenPercentInput) {
  const stage = normalizeActivityPlanStage(cleanText(input.stage));
  if (!stage || !REAL_ACTIVITY_PLAN_STAGES.includes(stage)) throw new Error("اختر مرحلة صحيحة للخطة الفصلية (10%).");
  const domains = normalizeDomains(input.domains);
  if (!domains.length) throw new Error("اختر مجالًا واحدًا على الأقل.");
  const programs = await normalizePrograms(input.programs, domains);
  if (!programs.length) throw new Error("اختر برنامجًا واحدًا على الأقل من البرامج المنشورة.");
  const executionWeeks = normalizeTenPercentWeeks(input.executionWeeks);
  if (!executionWeeks.length) throw new Error("اختر أسبوع تنفيذ واحدًا على الأقل من 1 إلى 18.");
  const grades = normalizeTenPercentTextList(input.grades);
  const allowedGrades = new Set(getTenPercentGradeOptions(stage));
  if (grades.some((grade) => !allowedGrades.has(grade))) throw new Error("يوجد صف غير متوافق مع المرحلة المحددة.");
  const teacherNames = normalizeTenPercentTextList(input.teacherNames);
  return {
    stage,
    domains,
    programs,
    periodCount: cleanText(input.periodCount),
    executionWeeks,
    subject: cleanText(input.subject),
    grades,
    teacherNames,
  };
}

function normalizeStoredJson<T>(value: unknown, fallback: T): T {
  return value === null || value === undefined ? fallback : value as T;
}

function mapRow(row: {
  id: string;
  stage: string;
  domains: unknown;
  programs: unknown;
  periodCount: string | null;
  executionWeeks: unknown;
  subject: string | null;
  grades: unknown;
  teacherNames: unknown;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): ActivityPlanTenPercentRow {
  return {
    id: row.id,
    stage: row.stage,
    domains: normalizeStoredJson(row.domains, []) as TenPercentDomainValue[],
    programs: normalizeStoredJson(row.programs, []) as TenPercentProgramValue[],
    periodCount: row.periodCount || "",
    executionWeeks: normalizeTenPercentWeeks(row.executionWeeks),
    subject: row.subject || "",
    grades: normalizeStoredJson(row.grades, []) as string[],
    teacherNames: normalizeStoredJson(row.teacherNames, []) as string[],
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getActivityPlanTenPercentRows(schoolAccountId: string, stage: string | null | undefined, createdById: string) {
  const selectedStage = normalizeActivityPlanStage(stage);
  const rows = await prisma.activityPlanTenPercentEntry.findMany({
    where: {
      schoolAccountId,
      createdById,
      ...(selectedStage ? { stage: selectedStage } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapRow);
}

export async function saveActivityPlanTenPercentRow(input: {
  id?: unknown;
  schoolAccountId: string;
  createdById: string;
  data: RawTenPercentInput;
}) {
  const normalized = await validateTenPercentRow(input.data);
  const id = cleanText(input.id);
  const jsonData = {
    domains: asJson(normalized.domains),
    programs: asJson(normalized.programs),
    executionWeeks: asJson(normalized.executionWeeks),
    grades: asJson(normalized.grades),
    teacherNames: asJson(normalized.teacherNames),
  };
  if (id) {
    const existing = await prisma.activityPlanTenPercentEntry.findFirst({
      where: { id, schoolAccountId: input.schoolAccountId, createdById: input.createdById },
      select: { id: true },
    });
    if (!existing) throw new Error("لا يمكن تعديل هذا الصف.");
    const row = await prisma.activityPlanTenPercentEntry.update({
      where: { id: existing.id },
      data: { stage: normalized.stage, ...jsonData, periodCount: normalized.periodCount || null, subject: normalized.subject || null },
    });
    return mapRow(row);
  }
  const last = await prisma.activityPlanTenPercentEntry.aggregate({
    where: { schoolAccountId: input.schoolAccountId, createdById: input.createdById, stage: normalized.stage },
    _max: { sortOrder: true },
  });
  const row = await prisma.activityPlanTenPercentEntry.create({
    data: {
      schoolAccountId: input.schoolAccountId,
      createdById: input.createdById,
      stage: normalized.stage,
      ...jsonData,
      periodCount: normalized.periodCount || null,
      subject: normalized.subject || null,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
  });
  return mapRow(row);
}

export async function deleteActivityPlanTenPercentRow(input: { id: string; schoolAccountId: string; createdById: string }) {
  const existing = await prisma.activityPlanTenPercentEntry.findFirst({ where: input, select: { id: true } });
  if (!existing) throw new Error("لا يمكن حذف هذا الصف.");
  await prisma.activityPlanTenPercentEntry.delete({ where: { id: existing.id } });
}

export function isMeaningfulTenPercentRow(row: Pick<ActivityPlanTenPercentRow, "domains" | "programs" | "executionWeeks">) {
  return row.domains.length > 0 && row.programs.length > 0 && row.executionWeeks.length > 0;
}

export async function getTenPercentDomainOptions() {
  return Promise.all(ACTIVITY_PROGRAM_DOMAINS.map(async (domain) => {
    const workflow = await getActivityPlanWorkflowPrograms(domain.serviceSlug);
    return {
      slug: domain.slug,
      serviceSlug: domain.serviceSlug,
      title: domain.title,
      options: workflow?.options || [],
    };
  }));
}
