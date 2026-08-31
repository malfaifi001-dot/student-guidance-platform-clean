import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { REAL_ACTIVITY_PLAN_STAGES, normalizeActivityPlanStage } from "@/lib/activity-plan/activity-plan-stages";
import { deleteActivityPlanTenPercentRow, getActivityPlanTenPercentRows, getTenPercentDomainOptions, saveActivityPlanTenPercentRow } from "@/lib/activity-plan/ten-percent-activity-plan-service";
import { getTenPercentGradeOptions, TEN_PERCENT_MAX_WEEK } from "@/lib/activity-plan/ten-percent-activity-plan-types";

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

function stageFromRequest(request: Request) {
  return normalizeActivityPlanStage(new URL(request.url).searchParams.get("stage"));
}

export async function GET(request: Request) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  const stage = stageFromRequest(request);
  if (!stage || !REAL_ACTIVITY_PLAN_STAGES.includes(stage)) return NextResponse.json({ success: false, error: "اختر مرحلة صحيحة." }, { status: 400 });
  const [rows, domains] = await Promise.all([
    getActivityPlanTenPercentRows(auth.current.user.schoolAccountId as string, stage, auth.current.user.id),
    getTenPercentDomainOptions(),
  ]);
  return NextResponse.json({ success: true, stage, rows, domains, grades: getTenPercentGradeOptions(stage), maxWeek: TEN_PERCENT_MAX_WEEK });
}

export async function POST(request: Request) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const stage = normalizeActivityPlanStage(typeof body?.stage === "string" ? body.stage : "");
  if (!stage || !REAL_ACTIVITY_PLAN_STAGES.includes(stage)) return NextResponse.json({ success: false, error: "اختر مرحلة صحيحة." }, { status: 400 });
  try {
    const row = await saveActivityPlanTenPercentRow({
      id: body?.id,
      schoolAccountId: auth.current.user.schoolAccountId as string,
      createdById: auth.current.user.id,
      data: { ...body, stage },
    });
    return NextResponse.json({ success: true, row });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "تعذر حفظ خطة 10%." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ success: false, error: "الصف المطلوب غير صالح." }, { status: 400 });
  try {
    await deleteActivityPlanTenPercentRow({ id, schoolAccountId: auth.current.user.schoolAccountId as string, createdById: auth.current.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "تعذر حذف الصف." }, { status: 400 });
  }
}
