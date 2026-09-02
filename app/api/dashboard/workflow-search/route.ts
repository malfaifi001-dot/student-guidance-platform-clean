import { NextResponse } from "next/server";
import { getDashboardContext } from "@/lib/auth/dashboard-context";
import { getUserSubscriptionOverview } from "@/lib/subscription/subscription-service";
import { searchWorkflows } from "@/lib/workflow-search/workflow-search-service";

export async function GET(request: Request) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ success: false, error: "يجب تسجيل الدخول." }, { status: 401 });
  if (!context.isAdmin && !context.schoolAccountId) return NextResponse.json({ success: false, error: "لا يوجد حساب مدرسة مرتبط." }, { status: 403 });

  const query = new URL(request.url).searchParams.get("q") || "";
  if (query.trim().length < 2) return NextResponse.json({ success: true, results: [] });

  if (!context.isAdmin) {
    const subscription = await getUserSubscriptionOverview(context.user.id);
    if (!subscription.usable) return NextResponse.json({ success: false, error: "الخدمة غير متاحة حاليًا." }, { status: 403 });
  }

  const results = await searchWorkflows({
    query,
    userId: context.user.id,
    role: context.user.role,
    schoolAccountId: context.schoolAccountId || "__NO_SCHOOL__",
  });
  return NextResponse.json({ success: true, results });
}
