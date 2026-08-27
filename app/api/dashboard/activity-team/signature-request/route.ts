import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { isServiceAllowedForSchool } from "@/lib/subscription/subscription-service";
import { prisma } from "@/lib/prisma";
import { getSchoolActivityTeam } from "@/lib/activity-team/activity-team-service";
import { createActivityTeamSignatureRequest } from "@/lib/activity-team/activity-team-signature-service";

export async function POST(request: Request) {
  try {
    const current = await getCurrentSessionUser();
    if (!current?.user) {
      return NextResponse.json({ ok: false, error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
    }
    if (current.user.role !== "ACTIVITY_LEADER") {
      return NextResponse.json({ ok: false, error: "هذه الخدمة متاحة لرائد النشاط فقط." }, { status: 403 });
    }
    const schoolAccountId = current.user.schoolAccountId;
    if (!schoolAccountId) {
      return NextResponse.json({ ok: false, error: "لا يوجد حساب مدرسة مرتبط بالحساب." }, { status: 400 });
    }
    const access = await isServiceAllowedForSchool({ schoolAccountId, userId: current.user.id, serviceSlug: "school-activity-team" });
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.reason === "SUBSCRIPTION_INACTIVE" ? "الاشتراك غير فعال." : "الخدمة غير متاحة ضمن الباقة الحالية." }, { status: 403 });
    }

    const team = await getSchoolActivityTeam(schoolAccountId);
    if (!team.id) {
      return NextResponse.json({ ok: false, error: "احفظ بيانات فريق النشاط أولًا." }, { status: 400 });
    }
    if (!Object.values(team.assignments).some((name) => String(name || "").trim())) {
      return NextResponse.json({ ok: false, error: "أدخل اسم مشرف واحد على الأقل قبل الإرسال للتوقيع." }, { status: 400 });
    }

    const school = await prisma.schoolAccount.findUnique({
      where: { id: schoolAccountId },
      select: { profile: { select: { principalName: true } } },
    });
    const publicUrl = await createActivityTeamSignatureRequest({
      requestUrl: request.url,
      teamId: team.id,
      schoolAccountId,
      requestedById: current.user.id,
      requesterDisplayName: current.user.officialName || current.user.name || "رائد النشاط",
      principalName: school?.profile?.principalName || "مدير المدرسة",
      gender: current.user.gender,
    });

    return NextResponse.json({ ok: true, publicUrl });
  } catch {
    return NextResponse.json({ ok: false, error: "تعذر إنشاء رابط التوقيع." }, { status: 500 });
  }
}
