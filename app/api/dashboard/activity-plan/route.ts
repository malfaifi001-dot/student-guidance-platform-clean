import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import {
  ACTIVITY_PLAN_PROGRAM_OPTIONS,
  getActivityPlanProgramByKey,
} from "@/lib/activity-plan/activity-plan-programs";
import { getActivityPlanDates, isValidActivityPlanSlot } from "@/lib/activity-plan/activity-plan-calendar";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  getActivityPlanStageOptions,
  getActivityPlanStagesFromProfile,
  normalizeActivityPlanStage,
  REAL_ACTIVITY_PLAN_STAGES,
} from "@/lib/activity-plan/activity-plan-stages";

const SERVICE_SLUG = "student-activity-plan";

function cleanText(value: unknown, max = 191) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseSlot(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) ? number : NaN;
}

async function authorize() {
  const accessResponse = await requireServiceAccessApi(SERVICE_SLUG);
  if (accessResponse) return { response: accessResponse } as const;

  const current = await getCurrentSessionUser();
  if (!current?.user || current.user.role !== "ACTIVITY_LEADER" || !current.user.schoolAccountId) {
    return {
      response: NextResponse.json(
        { success: false, error: "هذه الخدمة متاحة لرائد النشاط فقط." },
        { status: 403 },
      ),
    } as const;
  }

  return { response: null, current } as const;
}

export async function GET(request: Request) {
  const auth = await authorize();
  if (auth.response) return auth.response;

  const week = parseSlot(new URL(request.url).searchParams.get("week") || 1);
  if (!Number.isInteger(week) || week < 1 || week > 20) {
    return NextResponse.json({ success: false, error: "رقم الأسبوع غير صالح." }, { status: 400 });
  }

  const schoolAccountId = auth.current.user.schoolAccountId as string;
  const requestedStage = cleanText(new URL(request.url).searchParams.get("stage"));
  const [students, stageEntries] = await Promise.all([
    prisma.student.findMany({ where: { schoolAccountId, isActive: true }, select: { stage: true, grade: true } }),
    prisma.activityPlanEntry.findMany({ where: { schoolAccountId }, select: { stage: true } }),
  ]);
  const stages = REAL_ACTIVITY_PLAN_STAGES.filter((stage) => getActivityPlanStageOptions([
    ...getActivityPlanStagesFromProfile(auth.current.user.schoolAccount?.profile?.stage),
    ...students.map((student) => student.stage),
    ...stageEntries.map((entry) => entry.stage),
  ]).includes(stage));
  const normalizedRequestedStage = normalizeActivityPlanStage(requestedStage);
  const selectedStage = normalizedRequestedStage && stages.includes(normalizedRequestedStage)
    ? normalizedRequestedStage
    : stages[0] || "";
  const entries = await prisma.activityPlanEntry.findMany({
    where: { schoolAccountId, weekNumber: week, stage: selectedStage },
    select: {
      id: true,
      dayOfWeek: true,
      periodNumber: true,
      date: true,
      gradeLabel: true,
      teacherName: true,
      stage: true,
      programKey: true,
      programCaseEntryId: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { periodNumber: "asc" }],
  });

  const legacyCaseEntryIds = Array.from(
    new Set(entries.map((entry) => entry.programCaseEntryId).filter((id): id is string => Boolean(id))),
  );
  const legacyPrograms = await prisma.caseEntry.findMany({
    where: { schoolAccountId, id: { in: legacyCaseEntryIds } },
    select: {
      id: true,
      title: true,
      values: { where: { fieldKey: "activity_domain" }, select: { value: true }, take: 1 },
    },
  });
  const legacyProgramsById = new Map(legacyPrograms.map((program) => [program.id, program]));

  const suggestions = await prisma.activityPlanEntry.findMany({
    where: { schoolAccountId, stage: selectedStage },
    distinct: ["gradeLabel", "teacherName"],
    select: { gradeLabel: true, teacherName: true },
    orderBy: { updatedAt: "desc" },
  });
  const gradesByStage = Object.fromEntries(stages.map((stage) => [
    stage,
    Array.from(new Set([
      ...students.filter((student) => normalizeActivityPlanStage(student.stage) === stage).map((student) => student.grade).filter((grade): grade is string => Boolean(grade)),
      ...(stage === selectedStage ? suggestions.map((item) => item.gradeLabel) : []),
    ])),
  ]));

  return NextResponse.json({
    success: true,
    week,
    stage: selectedStage,
    stages,
    dates: getActivityPlanDates(week),
    entries: entries.map((entry) => {
      const directProgram = entry.programKey ? getActivityPlanProgramByKey(entry.programKey) : null;
      const legacyProgram = entry.programCaseEntryId ? legacyProgramsById.get(entry.programCaseEntryId) : null;
      return {
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        periodNumber: entry.periodNumber,
        date: entry.date.toISOString().slice(0, 10),
        gradeLabel: entry.gradeLabel,
        teacherName: entry.teacherName,
        stage: entry.stage,
        program: {
          id: entry.programKey || entry.programCaseEntryId || "legacy-program",
          key: directProgram?.key || entry.programKey || "",
          title: directProgram?.title || legacyProgram?.values[0]?.value || legacyProgram?.title || "برنامج نشاط",
        },
      };
    }),
    programs: ACTIVITY_PLAN_PROGRAM_OPTIONS.map(({ key, title }) => ({ id: key, key, title })),
    suggestions: {
      grades: gradesByStage[selectedStage] || [],
      gradesByStage,
      teachers: Array.from(new Set(suggestions.map((item) => item.teacherName))),
    },
  });
}

export async function POST(request: Request) {
  const auth = await authorize();
  if (auth.response) return auth.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const week = parseSlot(body?.weekNumber);
  const dayOfWeek = parseSlot(body?.dayOfWeek);
  const periodNumber = parseSlot(body?.periodNumber);
  const entryId = cleanText(body?.id);
  const stage = normalizeActivityPlanStage(cleanText(body?.stage));
  const gradeLabel = cleanText(body?.gradeLabel);
  const teacherName = cleanText(body?.teacherName);
  const programKey = cleanText(body?.programId);

  if (!isValidActivityPlanSlot(week, dayOfWeek, periodNumber) || !stage || !gradeLabel || !teacherName || !programKey) {
    return NextResponse.json({ success: false, error: "أكمل بيانات الخلية المطلوبة." }, { status: 400 });
  }

  const selectedProgram = getActivityPlanProgramByKey(programKey);
  if (!selectedProgram) {
    return NextResponse.json({ success: false, error: "البرنامج غير صالح." }, { status: 400 });
  }

  const schoolAccountId = auth.current.user.schoolAccountId as string;
  if (!REAL_ACTIVITY_PLAN_STAGES.includes(stage)) {
    return NextResponse.json({ success: false, error: "اختر المرحلة المطلوبة." }, { status: 400 });
  }
  const dates = getActivityPlanDates(week);
  const date = dates[dayOfWeek]?.date;
  if (!date) {
    return NextResponse.json({ success: false, error: "تاريخ الخلية غير متاح." }, { status: 400 });
  }

  const entryData = { programKey: selectedProgram.key, stage, weekNumber: week, dayOfWeek, periodNumber, date: new Date(`${date}T00:00:00.000Z`), gradeLabel, teacherName };
  if (entryId) {
    const ownedEntry = await prisma.activityPlanEntry.findFirst({ where: { id: entryId, schoolAccountId }, select: { id: true } });
    if (!ownedEntry) return NextResponse.json({ success: false, error: "الإدخال غير موجود." }, { status: 404 });
  }
  const entry = entryId
    ? await prisma.activityPlanEntry.update({ where: { id: entryId }, data: entryData })
    : await prisma.activityPlanEntry.upsert({
      where: { schoolAccountId_stage_weekNumber_dayOfWeek_periodNumber: { schoolAccountId, stage, weekNumber: week, dayOfWeek, periodNumber } },
      update: entryData,
      create: { schoolAccountId, createdById: auth.current.user.id, ...entryData },
    });

  return NextResponse.json({
    success: true,
    entry: {
      id: entry.id,
      stage: entry.stage,
      dayOfWeek: entry.dayOfWeek,
      periodNumber: entry.periodNumber,
      date,
      gradeLabel: entry.gradeLabel,
      teacherName: entry.teacherName,
      program: { id: selectedProgram.key, key: selectedProgram.key, title: selectedProgram.title },
    },
  });
}

export async function DELETE(request: Request) {
  const auth = await authorize();
  if (auth.response) return auth.response;

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = cleanText(body?.id);
  if (!id) return NextResponse.json({ success: false, error: "الإدخال غير صالح." }, { status: 400 });

  const schoolAccountId = auth.current.user.schoolAccountId as string;
  const deleted = await prisma.activityPlanEntry.deleteMany({ where: { id, schoolAccountId } });
  if (!deleted.count) return NextResponse.json({ success: false, error: "الإدخال غير موجود." }, { status: 404 });
  return NextResponse.json({ success: true });
}
