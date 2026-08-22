import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { isServiceAllowedForSchool } from "@/lib/subscription/subscription-service";
import {
  getSchoolActivityTeam,
  saveSchoolActivityTeam,
} from "@/lib/activity-team/activity-team-service";

async function getActivityLeaderContext() {
  const current = await getCurrentSessionUser();
  if (!current?.user) {
    return NextResponse.json({ ok: false, error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }
  if (current.user.role !== "ACTIVITY_LEADER") {
    return NextResponse.json({ ok: false, error: "هذه الخدمة متاحة لرائد النشاط فقط." }, { status: 403 });
  }
  if (!current.user.schoolAccountId) {
    return NextResponse.json({ ok: false, error: "لا يوجد حساب مدرسة مرتبط بالحساب." }, { status: 400 });
  }

  const access = await isServiceAllowedForSchool({
    schoolAccountId: current.user.schoolAccountId,
    serviceSlug: "school-activity-team",
  });
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.reason === "SUBSCRIPTION_INACTIVE" ? "الاشتراك غير فعال." : "الخدمة غير متاحة ضمن الباقة الحالية." },
      { status: 403 },
    );
  }

  return current;
}

export async function GET() {
  try {
    const context = await getActivityLeaderContext();
    if (context instanceof NextResponse) return context;

    const data = await getSchoolActivityTeam(context.user.schoolAccountId!);
    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ ok: false, error: "تعذر تحميل بيانات فريق النشاط." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const context = await getActivityLeaderContext();
    if (context instanceof NextResponse) return context;

    let body: { assignments?: unknown };
    try {
      body = (await request.json()) as { assignments?: unknown };
    } catch {
      return NextResponse.json({ ok: false, error: "بيانات الحفظ غير صالحة." }, { status: 400 });
    }

    const data = await saveSchoolActivityTeam(context.user.schoolAccountId!, body.assignments);
    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ ok: false, error: "تعذر حفظ بيانات فريق النشاط." }, { status: 500 });
  }
}
