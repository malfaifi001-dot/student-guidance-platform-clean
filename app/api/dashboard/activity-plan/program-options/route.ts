import { NextResponse } from "next/server";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getActivityPlanWorkflowPrograms } from "@/lib/activity-plan/activity-plan-workflow-programs";

export async function GET(request: Request) {
  const accessResponse = await requireServiceAccessApi("student-activity-plan");
  if (accessResponse) return accessResponse;

  const current = await getCurrentSessionUser();
  if (!current?.user || current.user.role !== "ACTIVITY_LEADER" || !current.user.schoolAccountId) {
    return NextResponse.json({ success: false, error: "هذه الخدمة متاحة لرائد النشاط فقط." }, { status: 403 });
  }

  const serviceSlug = new URL(request.url).searchParams.get("serviceSlug")?.trim() || "";
  const programs = await getActivityPlanWorkflowPrograms(serviceSlug);
  if (!programs) return NextResponse.json({ success: false, error: "لا يوجد Workflow منشور لهذا المجال." }, { status: 404 });

  return NextResponse.json({ success: true, fieldKey: programs.fieldKey, options: programs.options });
}
