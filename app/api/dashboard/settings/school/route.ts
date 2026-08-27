import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireActiveSubscriptionForCurrentUser } from "@/bin/require-auth";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  createPrincipalSchoolSlug,
  normalizeStatisticalNumber,
} from "@/lib/principal/principal-school-service";
import { resolvePrincipalSignatureForReport } from "@/lib/report-signatures/principal-signature-resolver";
import { tracePrincipalSignature } from "@/lib/report-signatures/principal-signature-trace";
import { schoolSettingsPatchSchema } from "@/lib/settings/school-settings-api-schema";

const LINKABLE_SCHOOL_MEMBER_ROLES = [
  "TEACHER",
  "COUNSELOR",
  "ACTIVITY_LEADER",
] as const;

function schoolProfileCompleteness(profile: {
  schoolName: string;
  principalName: string | null;
  educationDepartment: string | null;
  city: string | null;
  stage: string | null;
}) {
  return [
    profile.schoolName,
    profile.principalName,
    profile.educationDepartment,
    profile.city,
    profile.stage,
  ].filter((value) => value?.trim()).length;
}

function safelyNormalizeStatisticalNumber(value: string | null | undefined) {
  if (!value?.trim()) return "";
  try {
    return normalizeStatisticalNumber(value);
  } catch {
    return "";
  }
}

export async function GET() {
  const current = await getCurrentSessionUser();

  if (!current) {
    return NextResponse.json(
      { success: false, error: "يلزم تسجيل الدخول." },
      { status: 401 },
    );
  }

  const profile = current.user.schoolAccount?.profile;
  const isPrincipal = current.user.role === "PRINCIPAL";
  const isEligibleSignatureStaff = LINKABLE_SCHOOL_MEMBER_ROLES.includes(
    current.user.role as (typeof LINKABLE_SCHOOL_MEMBER_ROLES)[number],
  );
  const [eligibleSignatureStaff, selectedSignatureStaff, currentStaffAuthorization] = current.user.role === "PRINCIPAL" && current.user.schoolAccountId
    ? await Promise.all([
        prisma.user.findMany({
          where: { schoolAccountId: current.user.schoolAccountId, role: { in: [...LINKABLE_SCHOOL_MEMBER_ROLES] }, isActive: true },
          orderBy: [{ officialName: "asc" }, { name: "asc" }],
          select: { id: true, name: true, officialName: true, role: true },
        }),
        prisma.principalSignatureReuseAuthorization.findMany({
          where: { schoolAccountId: current.user.schoolAccountId },
          select: { userId: true },
        }),
      ])
    : await Promise.all([
        Promise.resolve([]),
        Promise.resolve([]),
        isEligibleSignatureStaff && current.user.schoolAccountId
          ? prisma.principalSignatureReuseAuthorization.findUnique({
              where: {
                schoolAccountId_userId: {
                  schoolAccountId: current.user.schoolAccountId,
                  userId: current.user.id,
                },
              },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);
  const effectiveStaffSignature = isEligibleSignatureStaff
    ? resolvePrincipalSignatureForReport({
        schoolIdentity: {
          schoolAccountId: current.user.schoolAccountId,
          principalSignatureUrl: profile?.principalSignatureUrl || null,
          principalSignatureSignedAt: profile?.principalSignatureSignedAt || null,
        },
        reusePolicy: profile?.principalSignatureReusePolicy,
        reportOwner: {
          id: current.user.id,
          schoolAccountId: current.user.schoolAccountId,
          role: current.user.role,
        },
        selectedStaffAuthorized: Boolean(currentStaffAuthorization),
      })
    : null;
  tracePrincipalSignature({
    stage: "SCHOOL_SETTINGS_EFFECTIVE_SIGNATURE",
    location: "GET /api/dashboard/settings/school",
    details: {
      viewerId: current.user.id,
      viewerRole: current.user.role,
      schoolAccountId: current.user.schoolAccountId,
      policy: profile?.principalSignatureReusePolicy || "MANUAL_ONLY",
      selectedStaffAuthorized: Boolean(currentStaffAuthorization),
      isPrincipal,
    },
    signature: isPrincipal
      ? profile?.principalSignatureUrl
      : effectiveStaffSignature?.signatureUrl,
  });
  const signatureKind =
    current.user.role === "PRINCIPAL"
      ? "principal"
      : current.user.role === "COUNSELOR"
      ? "counselor"
      : current.user.role === "ACTIVITY_LEADER"
        ? "activityLeader"
        : current.user.role === "TEACHER"
          ? "teacher"
        : "";

  return NextResponse.json({
    success: true,
    data: {
      officialName: current.user.officialName || current.user.name || "",
      currentUserName: current.user.officialName || current.user.name || "صاحب الحساب",
      currentUserRole: current.user.role,
      currentUserGender: current.user.gender,
      currentUserSignatureKind: signatureKind,
      currentUserSignatureUrl:
        signatureKind === "principal"
          ? profile?.principalSignatureUrl || ""
          : signatureKind === "teacher"
          ? current.user.signatureUrl || ""
          : signatureKind === "counselor"
          ? profile?.counselorSignatureUrl || ""
          : signatureKind === "activityLeader"
            ? profile?.activityLeaderSignatureUrl || ""
            : "",
      currentUserSignedAt:
        signatureKind === "principal"
          ? profile?.principalSignatureSignedAt?.toISOString() || ""
          : signatureKind === "teacher"
          ? current.user.signatureSignedAt?.toISOString() || ""
          : signatureKind === "counselor"
          ? profile?.counselorSignedAt?.toISOString() || ""
          : signatureKind === "activityLeader"
            ? profile?.activityLeaderSignedAt?.toISOString() || ""
            : "",
      jobTitle: current.user.jobTitle || "",
      phone: current.user.phone || "",
      schoolName: profile?.schoolName || "",
      schoolStatisticalNumber: profile?.schoolStatisticalNumber || "",
      principalName: profile?.principalName || "",
      principalPhone: profile?.principalPhone || "",
      principalSignatureUrl: isPrincipal
        ? profile?.principalSignatureUrl || ""
        : effectiveStaffSignature?.signatureUrl || "",
      principalSignatureRequestedAt:
        profile?.principalSignatureRequestedAt?.toISOString() || "",
      principalSignatureSignedAt:
        profile?.principalSignatureSignedAt?.toISOString() || "",
      principalSignatureReusePolicy: profile?.principalSignatureReusePolicy || "MANUAL_ONLY",
      principalSignatureReuseUserIds: selectedSignatureStaff.map((item) => item.userId),
      principalSignatureReuseStaff: eligibleSignatureStaff.map((item) => ({
        id: item.id,
        name: item.officialName || item.name,
        role: item.role,
      })),
      activityLeaderName: profile?.activityLeaderName || "",
      activityLeaderSignatureUrl: profile?.activityLeaderSignatureUrl || "",
      activityLeaderSignedAt:
        profile?.activityLeaderSignedAt?.toISOString() || "",
      counselorSignatureUrl: profile?.counselorSignatureUrl || "",
      counselorSignedAt: profile?.counselorSignedAt?.toISOString() || "",
      educationDepartment: profile?.educationDepartment || "",
      educationOffice: profile?.educationOffice || "",
      city: profile?.city || "",
      district: profile?.district || "",
      stage: profile?.stage || "",
      logoUrl: profile?.logoUrl || "",
      onboardingCompleted: current.user.onboardingCompleted,
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const current = await getCurrentSessionUser();

    if (!current) {
      return NextResponse.json(
        { success: false, error: "يلزم تسجيل الدخول." },
        { status: 401 },
      );
    }

    if (!current.user.schoolAccountId) {
      return NextResponse.json(
        { success: false, error: "لا يوجد حساب مدرسي مرتبط بالمستخدم." },
        { status: 403 },
      );
    }

    if (current.user.role !== "PRINCIPAL") {
      const subscriptionGuard = await requireActiveSubscriptionForCurrentUser();

      if (subscriptionGuard instanceof Response) {
        return subscriptionGuard;
      }
    }

    const rawBody = await request.json().catch(() => null);
    let body = rawBody;

    if (
      rawBody &&
      typeof rawBody === "object" &&
      "schoolStatisticalNumber" in rawBody &&
      String(rawBody.schoolStatisticalNumber ?? "").trim()
    ) {
      try {
        body = {
          ...rawBody,
          schoolStatisticalNumber: normalizeStatisticalNumber(
            rawBody.schoolStatisticalNumber,
          ),
        };
      } catch {
        return NextResponse.json(
          { success: false, error: "الرقم الإحصائي للمدرسة غير صالح." },
          { status: 400 },
        );
      }
    }

    const payloadResult = schoolSettingsPatchSchema.safeParse(body);

    if (!payloadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            payloadResult.error.issues[0]?.message ||
            "بيانات المدرسة غير صالحة.",
        },
        { status: 400 },
      );
    }

    const {
      officialName,
      jobTitle,
      phone,
      schoolName,
      schoolStatisticalNumber,
      principalName,
      principalPhone,
      activityLeaderName,
      educationDepartment,
      educationOffice,
      city,
      district,
      stage,
      logoUrl,
      principalSignatureReusePolicy,
      principalSignatureReuseUserIds,
    } = payloadResult.data;

    await prisma.$transaction(async (tx) => {
      const authenticatedUser = await tx.user.findUniqueOrThrow({
        where: { id: current.user.id },
        select: {
          role: true,
          schoolAccountId: true,
          schoolAccount: {
            select: {
              name: true,
              profile: true,
              users: {
                where: { role: "PRINCIPAL", isActive: true },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!authenticatedUser.schoolAccountId) {
        throw new Error("SCHOOL_ACCOUNT_REQUIRED");
      }

      const schoolCandidates = schoolStatisticalNumber
        ? await tx.schoolProfile.findMany({
            where: {
              schoolStatisticalNumber: { not: null },
              schoolAccountId: { not: authenticatedUser.schoolAccountId },
            },
            select: {
              schoolAccountId: true,
              schoolStatisticalNumber: true,
              schoolName: true,
              principalName: true,
              educationDepartment: true,
              city: true,
              stage: true,
              schoolAccount: {
                select: {
                  users: {
                    where: { role: "PRINCIPAL", isActive: true },
                    select: { id: true },
                  },
                },
              },
            },
          })
        : [];
      const matchingSchools = schoolCandidates.filter((candidate) => {
        try {
          return (
            normalizeStatisticalNumber(candidate.schoolStatisticalNumber ?? "") ===
            schoolStatisticalNumber
          );
        } catch {
          return false;
        }
      });
      const matchingSchool = matchingSchools.sort((left, right) => {
        const principalDifference =
          right.schoolAccount.users.length - left.schoolAccount.users.length;
        if (principalDifference) return principalDifference;
        return schoolProfileCompleteness(right) - schoolProfileCompleteness(left);
      })[0] ?? null;
      const isLinkableSchoolMember = LINKABLE_SCHOOL_MEMBER_ROLES.some(
        (role) => role === authenticatedUser.role,
      );
      const currentSchoolIsPrincipalManaged = Boolean(
        authenticatedUser.schoolAccount?.users.length,
      );
      const currentStatisticalNumber = safelyNormalizeStatisticalNumber(
        authenticatedUser.schoolAccount?.profile?.schoolStatisticalNumber,
      );
      const staysWithCurrentPrincipalSchool =
        isLinkableSchoolMember &&
        currentSchoolIsPrincipalManaged &&
        schoolStatisticalNumber === currentStatisticalNumber;

      await tx.user.update({
        where: { id: current.user.id },
        data: {
          officialName,
          jobTitle,
          phone,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
          ...(matchingSchool && isLinkableSchoolMember && !staysWithCurrentPrincipalSchool
            ? { schoolAccountId: matchingSchool.schoolAccountId }
            : {}),
        },
      });

      if (staysWithCurrentPrincipalSchool) {
        return;
      }

      if (matchingSchool && isLinkableSchoolMember) {
        return;
      }

      if (isLinkableSchoolMember && currentSchoolIsPrincipalManaged) {
        const separateSchool = await tx.schoolAccount.create({
          data: {
            name: schoolName,
            slug: createPrincipalSchoolSlug(schoolName),
            profile: {
              create: {
                schoolName,
                schoolStatisticalNumber: schoolStatisticalNumber || null,
                principalName,
                principalPhone,
                activityLeaderName,
                educationDepartment,
                educationOffice,
                city,
                district,
                stage,
                logoUrl,
              },
            },
          },
          select: { id: true },
        });

        await tx.user.update({
          where: { id: current.user.id },
          data: { schoolAccountId: separateSchool.id },
        });
        return;
      }

      if (authenticatedUser.role === "PRINCIPAL") {
        const principalChangedStatisticalNumber =
          currentStatisticalNumber !== schoolStatisticalNumber;
        const linkedSchoolMembers = principalChangedStatisticalNumber
          ? await tx.user.findMany({
              where: {
                schoolAccountId: authenticatedUser.schoolAccountId,
                role: { in: [...LINKABLE_SCHOOL_MEMBER_ROLES] },
              },
              select: { id: true },
            })
          : [];

        if (linkedSchoolMembers.length > 0) {
          const previousProfile = authenticatedUser.schoolAccount?.profile;
          const previousSchool = await tx.schoolAccount.create({
            data: {
              name: previousProfile?.schoolName || authenticatedUser.schoolAccount?.name || schoolName,
              slug: createPrincipalSchoolSlug(
                previousProfile?.schoolName || authenticatedUser.schoolAccount?.name || schoolName,
              ),
              profile: previousProfile
                ? {
                    create: {
                      schoolName: previousProfile.schoolName,
                      principalName: previousProfile.principalName,
                      principalPhone: previousProfile.principalPhone,
                      activityLeaderName: previousProfile.activityLeaderName,
                      educationDepartment: previousProfile.educationDepartment,
                      educationOffice: previousProfile.educationOffice,
                      schoolStatisticalNumber: previousProfile.schoolStatisticalNumber,
                      city: previousProfile.city,
                      district: previousProfile.district,
                      stage: previousProfile.stage,
                      academicYear: previousProfile.academicYear,
                      currentSemester: previousProfile.currentSemester,
                      logoUrl: previousProfile.logoUrl,
                      principalSignatureUrl: previousProfile.principalSignatureUrl,
                      principalSignatureSignedAt: previousProfile.principalSignatureSignedAt,
                      principalSignatureReusePolicy: previousProfile.principalSignatureReusePolicy,
                    },
                  }
                : undefined,
            },
            select: { id: true },
          });

          await tx.user.updateMany({
            where: { id: { in: linkedSchoolMembers.map((member) => member.id) } },
            data: { schoolAccountId: previousSchool.id },
          });
        }
      }

      await tx.schoolAccount.update({
        where: { id: authenticatedUser.schoolAccountId },
        data: { name: schoolName },
      });
      await tx.schoolProfile.upsert({
        where: { schoolAccountId: authenticatedUser.schoolAccountId },
        update: {
          schoolName,
          schoolStatisticalNumber,
          principalName,
          principalPhone,
          activityLeaderName,
          educationDepartment,
          educationOffice,
          city,
          district,
          stage,
          logoUrl,
          ...(authenticatedUser.role === "PRINCIPAL"
            ? { principalSignatureReusePolicy }
            : {}),
        },
        create: {
          schoolAccountId: authenticatedUser.schoolAccountId,
          schoolName,
          schoolStatisticalNumber,
          principalName,
          principalPhone,
          activityLeaderName,
          educationDepartment,
          educationOffice,
          city,
          district,
          stage,
          logoUrl,
          ...(authenticatedUser.role === "PRINCIPAL"
            ? { principalSignatureReusePolicy }
            : {}),
        },
      });

      if (authenticatedUser.role === "PRINCIPAL") {
        const requestedIds = principalSignatureReusePolicy === "SELECTED_STAFF"
          ? Array.from(new Set(principalSignatureReuseUserIds))
          : [];
        const eligibleUsers = requestedIds.length
          ? await tx.user.findMany({
              where: {
                id: { in: requestedIds },
                schoolAccountId: authenticatedUser.schoolAccountId,
                role: { in: [...LINKABLE_SCHOOL_MEMBER_ROLES] },
              },
              select: { id: true },
            })
          : [];
        if (eligibleUsers.length !== requestedIds.length) {
          throw new Error("INVALID_PRINCIPAL_SIGNATURE_STAFF_SELECTION");
        }
        await tx.principalSignatureReuseAuthorization.deleteMany({
          where: { schoolAccountId: authenticatedUser.schoolAccountId },
        });
        if (requestedIds.length) {
          await tx.principalSignatureReuseAuthorization.createMany({
            data: requestedIds.map((userId) => ({
              schoolAccountId: authenticatedUser.schoolAccountId as string,
              userId,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (authenticatedUser.role === "PRINCIPAL" && matchingSchools.length > 0) {
        await tx.user.updateMany({
          where: {
            role: { in: [...LINKABLE_SCHOOL_MEMBER_ROLES] },
            schoolAccountId: {
              in: matchingSchools.map((school) => school.schoolAccountId),
            },
          },
          data: { schoolAccountId: authenticatedUser.schoolAccountId },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      success: true,
      message: "تم حفظ بيانات المدرسة والحساب.",
    });
  } catch (error) {
    console.error("SCHOOL_SETTINGS_SAVE_ERROR", error);

    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء حفظ إعدادات المدرسة." },
      { status: 500 },
    );
  }
}
