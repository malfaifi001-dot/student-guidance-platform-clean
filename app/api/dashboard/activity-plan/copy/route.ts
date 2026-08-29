import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { copyActivityPlan } from "@/lib/activity-plan/activity-plan-copy-service";

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
