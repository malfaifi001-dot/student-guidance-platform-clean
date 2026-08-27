import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { REAL_ACTIVITY_PLAN_STAGES, normalizeActivityPlanStage } from "@/lib/activity-plan/activity-plan-stages";
import { getWeeklyActivityPlans, saveWeeklyActivityPlan } from "@/lib/activity-plan/weekly-activity-plan-service";

const SERVICE_SLUG = "student-activity-plan";

async function authorize() {
  const accessResponse = await requireServiceAccessApi(SERVICE_SLUG);
  if (accessResponse) return { response: accessResponse } as const;
  const current = await getCurrentSessionUser();
  if (!current?.user || current.user.role !== "ACTIVITY_LEADER" || !current.user.schoolAccountId) {
    return { response: NextResponse.json({ success: false, error: "هذه الخدمة متاحة لرائد النشاط فقط." }, { status: 403 }) } as const;
  }
  return { response: null, current } as const;
}

export async function GET(request: Request) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  const stage = normalizeActivityPlanStage(new URL(request.url).searchParams.get("stage"));
  if (!stage || !REAL_ACTIVITY_PLAN_STAGES.includes(stage)) return NextResponse.json({ success: false, error: "اختر مرحلة صحيحة." }, { status: 400 });
  const plans = await getWeeklyActivityPlans(auth.current.user.schoolAccountId as string, stage);
  return NextResponse.json({ success: true, stage, weeks: plans });
}

export async function POST(request: Request) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const stage = normalizeActivityPlanStage(typeof body?.stage === "string" ? body.stage : "");
  const weekNumber = Number(body?.weekNumber);
  const rawPeriodCount = body?.periodCount;
  const periodCount = rawPeriodCount === "" || rawPeriodCount === null || rawPeriodCount === undefined ? null : Number(rawPeriodCount);
  if (!stage || !REAL_ACTIVITY_PLAN_STAGES.includes(stage) || !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 20 || (periodCount !== null && (!Number.isInteger(periodCount) || periodCount < 0))) {
    return NextResponse.json({ success: false, error: "بيانات الأسبوع غير صالحة." }, { status: 400 });
  }
  try {
    const plan = await saveWeeklyActivityPlan({ schoolAccountId: auth.current.user.schoolAccountId as string, createdById: auth.current.user.id, stage, weekNumber, periodCount, items: body?.items });
    return NextResponse.json({ success: true, plan });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "تعذر حفظ الخطة الأسبوعية." }, { status: 400 });
  }
}
