import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getActivityPlanLeaderAllowedStages } from "@/lib/activity-plan/activity-plan-stage-access";
import { normalizeActivityPlanStage } from "@/lib/activity-plan/activity-plan-stages";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { copyActivityPlan, copySemesterActivityPlan, type SemesterCopyDestination, type SemesterCopyStrategy } from "@/lib/activity-plan/activity-plan-copy-service";

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

export async function POST(request: Request) {
  const auth = await authorize();
  if (auth.response) return auth.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.mode === "ten-percent") {
    const source = body.source && typeof body.source === "object" ? body.source as Record<string, unknown> : null;
    const destinations = Array.isArray(body.destinations)
      ? body.destinations.filter((value): value is SemesterCopyDestination => Boolean(value && typeof value === "object" && typeof (value as Record<string, unknown>).stage === "string" && typeof (value as Record<string, unknown>).grade === "string" && typeof (value as Record<string, unknown>).section === "string"))
      : [];
    const sourceDestination = source && typeof source.stage === "string" && typeof source.grade === "string" && typeof source.section === "string"
      ? { stage: source.stage, grade: source.grade, section: source.section }
      : null;
    const strategy = body.strategy === "replace" || body.strategy === "skip" || body.strategy === "empty-only" || body.strategy === "check" ? body.strategy as SemesterCopyStrategy : "check";
    if (!sourceDestination || !destinations.length) return NextResponse.json({ success: false, error: "أكمل بيانات مصدر ووجهات النسخ." }, { status: 400 });
    const allowedStages = await getActivityPlanLeaderAllowedStages(auth.current);
    const requestedStages = [sourceDestination.stage, ...destinations.map((destination) => destination.stage)].map((stage) => normalizeActivityPlanStage(stage));
    if (requestedStages.some((stage) => !stage || !allowedStages.includes(stage))) return NextResponse.json({ success: false, error: "لا يمكن النسخ إلى مرحلة غير مسموحة للمستخدم الحالي." }, { status: 403 });
    try {
      const result = await copySemesterActivityPlan({ schoolAccountId: auth.current.user.schoolAccountId as string, createdById: auth.current.user.id, source: sourceDestination, destinations, strategy });
      if (result.requiresConfirmation) return NextResponse.json({ success: false, requiresConfirmation: true, existingDestinations: result.existingDestinations, error: `يوجد محتوى محفوظ في ${result.existingDestinations.length} وجهات.` }, { status: 409 });
      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "تعذر نسخ الخطة الفصلية." }, { status: 400 });
    }
  }
  const mode = body?.mode === "weekly" ? "weekly" : body?.mode === "detailed" ? "detailed" : null;
  const sourceStage = typeof body?.sourceStage === "string" ? body.sourceStage : "";
  const targetStages = Array.isArray(body?.targetStages) ? body.targetStages.filter((value): value is string => typeof value === "string") : [];
  const replaceExisting = body?.replaceExisting === true;
  if (!mode || !sourceStage || !targetStages.length) return NextResponse.json({ success: false, error: "أكمل بيانات النسخ المطلوبة." }, { status: 400 });

  try {
    const result = await copyActivityPlan({
      schoolAccountId: auth.current.user.schoolAccountId as string,
      createdById: auth.current.user.id,
      sourceStage,
      targetStages,
      mode,
      replaceExisting,
    });
    if (result.requiresConfirmation) return NextResponse.json({ success: false, requiresConfirmation: true, existingStages: result.existingStages, error: "توجد بيانات حالية في المرحلة المستهدفة. هل تريد استبدالها بالخطة المنسوخة؟" }, { status: 409 });
    return NextResponse.json({ success: true, copiedStages: result.copiedStages, sourceCount: result.sourceCount || 0 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "تعذر نسخ الخطة." }, { status: 400 });
  }
}
