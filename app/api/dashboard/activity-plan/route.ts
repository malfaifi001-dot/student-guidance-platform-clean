import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import { getActivityPlanDates, isValidActivityPlanSlot } from "@/lib/activity-plan/activity-plan-calendar";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getActivityPlanLeaderAllowedStages } from "@/lib/activity-plan/activity-plan-stage-access";
import {
  getActivityPlanStageOptions,
  getActivityPlanStagesFromProfile,
  getActivityPlanStagesForActivityLeader,
  normalizeActivityPlanStage,
  REAL_ACTIVITY_PLAN_STAGES,
} from "@/lib/activity-plan/activity-plan-stages";
import { decodeActivityPlanProgramValue, encodeActivityPlanProgramValue } from "@/lib/activity-plan/activity-plan-program-value";
import { findActivityPlanWorkflowProgram, getActivityPlanWorkflowPrograms } from "@/lib/activity-plan/activity-plan-workflow-programs";
import { getActivityProgramDomainByServiceSlug, getActivityProgramDomainBySlug } from "@/lib/activity-programs/activity-program-catalog";
import { formatActivityPlanEntryLabel } from "@/lib/activity-plan/activity-plan-program-value";

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
  const [students, stageEntries, tenPercentStageEntries] = await Promise.all([
    prisma.student.findMany({ where: { schoolAccountId, isActive: true }, select: { stage: true, grade: true } }),
    prisma.activityPlanEntry.findMany({ where: { schoolAccountId }, select: { stage: true } }),
    prisma.activityPlanTenPercentEntry.findMany({ where: { schoolAccountId }, select: { stage: true } }),
  ]);
  const stageValues = auth.current.user.role === "ACTIVITY_LEADER"
    ? getActivityPlanStagesForActivityLeader(auth.current.user.teachingStages, [
      ...getActivityPlanStagesFromProfile(auth.current.user.schoolAccount?.profile?.stage),
      ...students.map((student) => student.stage),
      ...stageEntries.map((entry) => entry.stage),
      ...tenPercentStageEntries.map((entry) => entry.stage),
    ])
    : getActivityPlanStageOptions([
      ...getActivityPlanStagesFromProfile(auth.current.user.schoolAccount?.profile?.stage),
      ...students.map((student) => student.stage),
      ...stageEntries.map((entry) => entry.stage),
      ...tenPercentStageEntries.map((entry) => entry.stage),
    ]);
  const stages = REAL_ACTIVITY_PLAN_STAGES.filter((stage) => stageValues.includes(stage));
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
      const storedProgram = entry.programKey ? decodeActivityPlanProgramValue(entry.programKey) : null;
      const directProgram = storedProgram ? { key: entry.programKey || "", title: storedProgram.programName } : (entry.programKey ? getActivityPlanProgramByKey(entry.programKey) : null);
      const legacyProgram = entry.programCaseEntryId ? legacyProgramsById.get(entry.programCaseEntryId) : null;
      const domain = storedProgram ? getActivityProgramDomainByServiceSlug(storedProgram.serviceSlug) : getActivityProgramDomainBySlug(entry.programKey || "");
      const domainTitle = domain?.title || legacyProgram?.values[0]?.value || legacyProgram?.title || directProgram?.title || "";
      const programName = storedProgram?.programName || "";
      return {
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        periodNumber: entry.periodNumber,
        date: entry.date.toISOString().slice(0, 10),
        gradeLabel: entry.gradeLabel,
        section: storedProgram?.section || "",
        subject: storedProgram?.subject || "",
        materialType: storedProgram?.materialType || "أساسية",
        teacherName: entry.teacherName,
        stage: entry.stage,
        domainServiceSlug: storedProgram?.serviceSlug || domain?.serviceSlug || "",
        domainKey: domain?.slug || "",
        domainTitle,
        displayTitle: formatActivityPlanEntryLabel(domainTitle, programName),
        program: {
          id: entry.programKey || entry.programCaseEntryId || "legacy-program",
          key: storedProgram?.programValue || directProgram?.key || entry.programKey || "",
          title: programName || domainTitle || "برنامج نشاط",
        },
      };
    }),
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
  const section = cleanText(body?.section, 4);
  const subject = cleanText(body?.subject);
  const materialType = body?.materialType === "10%" ? "10%" : "أساسية";
  const domainServiceSlug = cleanText(body?.domainServiceSlug);
  const programValue = cleanText(body?.programValue || body?.programId);
  const manualProgramName = cleanText(body?.programName, 120);
  const requestedPrograms = Array.isArray(body?.programs)
    ? body.programs.flatMap((rawProgram) => {
      if (!rawProgram || typeof rawProgram !== "object") return [];
      const program = rawProgram as Record<string, unknown>;
      const requestedDomain = cleanText(program.domainServiceSlug);
      const requestedValue = cleanText(program.programValue || program.value);
      if (!requestedDomain || !requestedValue) return [];
      return [{ domainServiceSlug: requestedDomain, programValue: requestedValue, programName: cleanText(program.programName, 120) }];
    })
    : domainServiceSlug && programValue
      ? [{ domainServiceSlug, programValue, programName: manualProgramName }]
      : [];

  if (!isValidActivityPlanSlot(week, dayOfWeek, periodNumber) || !stage || !teacherName || !requestedPrograms.length) {
    return NextResponse.json({ success: false, error: "أكمل بيانات الخلية المطلوبة." }, { status: 400 });
  }

  const schoolAccountId = auth.current.user.schoolAccountId as string;
  if (!REAL_ACTIVITY_PLAN_STAGES.includes(stage)) {
    return NextResponse.json({ success: false, error: "اختر المرحلة المطلوبة." }, { status: 400 });
  }
  const allowedStages = await getActivityPlanLeaderAllowedStages(auth.current);
  if (!allowedStages.includes(stage)) {
    return NextResponse.json({ success: false, error: "لا يمكن الحفظ في مرحلة غير مسموحة للمستخدم الحالي." }, { status: 403 });
  }
  if (entryId && requestedPrograms.length !== 1) {
    return NextResponse.json({ success: false, error: "يمكن تعديل نشاط واحد فقط في كل مرة." }, { status: 400 });
  }
  const validatedPrograms: Array<{ domainServiceSlug: string; programValue: string; programName: string; domainTitle: string }> = [];
  for (const requestedProgram of requestedPrograms) {
    const workflowPrograms = await getActivityPlanWorkflowPrograms(requestedProgram.domainServiceSlug);
    const selectedProgram = workflowPrograms ? findActivityPlanWorkflowProgram(workflowPrograms.options, requestedProgram.programValue) : null;
    if (!selectedProgram || (selectedProgram.isOther && !requestedProgram.programName)) {
      return NextResponse.json({ success: false, error: "البرنامج غير صالح أو يلزم إدخال الاسم." }, { status: 400 });
    }
    validatedPrograms.push({
      domainServiceSlug: requestedProgram.domainServiceSlug,
      programValue: selectedProgram.value,
      programName: selectedProgram.isOther ? requestedProgram.programName : selectedProgram.label,
      domainTitle: getActivityProgramDomainByServiceSlug(requestedProgram.domainServiceSlug)?.title || "",
    });
  }
  const dates = getActivityPlanDates(week);
  const date = dates[dayOfWeek]?.date;
  if (!date) {
    return NextResponse.json({ success: false, error: "تاريخ الخلية غير متاح." }, { status: 400 });
  }

  const sharedEntryData = { stage, weekNumber: week, dayOfWeek, periodNumber, date: new Date(`${date}T00:00:00.000Z`), gradeLabel, teacherName };
  const entryData = validatedPrograms.map((program) => ({
    ...sharedEntryData,
    programKey: encodeActivityPlanProgramValue(program.domainServiceSlug, program.programName, { section, subject, materialType }),
  }));
  if (entryId) {
    const ownedEntry = await prisma.activityPlanEntry.findFirst({ where: { id: entryId, schoolAccountId }, select: { id: true } });
    if (!ownedEntry) return NextResponse.json({ success: false, error: "الإدخال غير موجود." }, { status: 404 });
  }
  let entries: Awaited<ReturnType<typeof prisma.activityPlanEntry.update>>[];
  try {
    entries = entryId
      ? [await prisma.activityPlanEntry.update({ where: { id: entryId }, data: entryData[0] })]
      : await prisma.$transaction(entryData.map((data) => prisma.activityPlanEntry.create({ data: { schoolAccountId, createdById: auth.current.user.id, ...data } })));
  } catch {
    return NextResponse.json({ success: false, error: "تعذر حفظ النشاط في قاعدة البيانات." }, { status: 500 });
  }

  const responseEntries = entries.map((entry, index) => {
    const program = validatedPrograms[index];
    return {
      id: entry.id,
      stage: entry.stage,
      dayOfWeek: entry.dayOfWeek,
      periodNumber: entry.periodNumber,
      date,
      gradeLabel: entry.gradeLabel,
      section,
      subject,
      materialType,
      teacherName: entry.teacherName,
      domainServiceSlug: program.domainServiceSlug,
      domainKey: getActivityProgramDomainByServiceSlug(program.domainServiceSlug)?.slug || "",
      domainTitle: program.domainTitle,
      displayTitle: formatActivityPlanEntryLabel(program.domainTitle, program.programName),
      program: { id: program.programValue, key: program.programValue, title: program.programName },
    };
  });

  return NextResponse.json({
    success: true,
    entry: responseEntries[0],
    entries: responseEntries,
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
