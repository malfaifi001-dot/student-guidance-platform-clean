import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { logPlatformActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";
import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import {
  createPrincipalSchoolSlug,
  findSchoolByStatisticalNumber,
  normalizeStatisticalNumber,
} from "@/lib/principal/principal-school-service";
import { principalSchoolProfileSchema } from "@/lib/principal/principal-school-schema";

export async function GET() {
  const guard = await requirePrincipalApi({ requireSchool: false });
  if (!guard.ok) return guard.response;

  const school = guard.schoolAccountId
    ? await prisma.schoolAccount.findUnique({ where: { id: guard.schoolAccountId }, include: { profile: true } })
    : null;

  return NextResponse.json({
    success: true,
    linked: Boolean(school),
    profile: {
      schoolName: school?.profile?.schoolName || school?.name || "",
      principalName: school?.profile?.principalName || guard.user.officialName || guard.user.name || "",
      schoolStatisticalNumber: school?.profile?.schoolStatisticalNumber || "",
      educationDepartment: school?.profile?.educationDepartment || "",
      city: school?.profile?.city || "",
      stage: school?.profile?.stage || "",
    },
  });
}

export async function PATCH(request: Request) {
  const guard = await requirePrincipalApi({ requireSchool: false });
  if (!guard.ok) return guard.response;

  const parsed = principalSchoolProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || "بيانات المدرسة غير صالحة." },
      { status: 400 },
    );
  }

  const data = {
    ...parsed.data,
    schoolStatisticalNumber: normalizeStatisticalNumber(parsed.data.schoolStatisticalNumber),
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUniqueOrThrow({
        where: { id: guard.user.id },
        select: { schoolAccountId: true },
      });

      if (!currentUser.schoolAccountId) {
        const existingSchool = await findSchoolByStatisticalNumber(data.schoolStatisticalNumber, tx);
        if (existingSchool) throw new Error("STATISTICAL_NUMBER_REQUIRES_APPROVAL");

        const school = await tx.schoolAccount.create({
          data: {
            name: data.schoolName,
            slug: createPrincipalSchoolSlug(data.schoolName),
            profile: { create: data },
          },
          select: { id: true },
        });
        await tx.user.update({
          where: { id: guard.user.id },
          data: {
            schoolAccountId: school.id,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date(),
            onboardingSkippedAt: null,
          },
        });
        return { schoolAccountId: school.id, created: true };
      }

      const duplicate = await tx.schoolProfile.findFirst({
        where: {
          schoolStatisticalNumber: data.schoolStatisticalNumber,
          schoolAccountId: { not: currentUser.schoolAccountId },
        },
        select: { id: true },
      });
      if (duplicate) throw new Error("STATISTICAL_NUMBER_REQUIRES_APPROVAL");

      await tx.schoolAccount.update({ where: { id: currentUser.schoolAccountId }, data: { name: data.schoolName } });
      await tx.schoolProfile.upsert({
        where: { schoolAccountId: currentUser.schoolAccountId },
        update: data,
        create: { schoolAccountId: currentUser.schoolAccountId, ...data },
      });
      return { schoolAccountId: currentUser.schoolAccountId, created: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await logPlatformActivity({
      actorUserId: guard.user.id,
      targetUserId: guard.user.id,
      schoolAccountId: result.schoolAccountId,
      category: "USER",
      action: result.created ? "principal-school-profile-created" : "principal-school-profile-updated",
      severity: "SUCCESS",
      title: result.created
        ? `تم إنشاء ملف المدرسة بواسطة المدير ${guard.user.email}`
        : `تم تحديث ملف المدرسة بواسطة المدير ${guard.user.email}`,
      details: { schoolStatisticalNumber: data.schoolStatisticalNumber },
    });

    return NextResponse.json({
      success: true,
      created: result.created,
      message: result.created ? "تم إنشاء بيانات المدرسة وربط الحساب بنجاح." : "تم حفظ بيانات المدرسة بنجاح.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STATISTICAL_NUMBER_REQUIRES_APPROVAL") {
      return NextResponse.json(
        { success: false, error: "هذا الرقم الإحصائي مرتبط بمدرسة مسجلة مسبقًا، ويتطلب الربط مراجعة واعتمادًا." },
        { status: 409 },
      );
    }
    console.error("PRINCIPAL_SCHOOL_PROFILE_SAVE_ERROR", error);
    return NextResponse.json({ success: false, error: "تعذر حفظ بيانات المدرسة." }, { status: 500 });
  }
}
