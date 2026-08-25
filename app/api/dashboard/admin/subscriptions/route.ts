import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { ensureDefaultPlatformServices } from "@/lib/services/default-platform-services";
import {
  getDefaultFreePlanConfig,
  saveDefaultFreePlanConfig,
} from "@/lib/subscription/default-free-plan";
import {
  assignPlanToSchool,
  getPlanFeatureValue,
  getPlanServiceSlugs,
  syncPlanEntitlementsForSubscribers,
} from "@/lib/subscription/subscription-service";
import {
  getDefaultVisibleRolesForAudience,
  normalizePlanVisibleRoles,
  type PlanAudience,
} from "@/lib/subscription/plan-audience";
import { getActivityProgramsBillingServiceSlugs } from "@/lib/activity-programs/activity-program-catalog";
import { ensureDashboardWorkflowService } from "@/lib/admin/workflows/ensure-dashboard-workflow-services";
import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG } from "@/lib/activity-competitions/activity-competitions-service";
import { dispatchAutomaticPushEvent } from "@/lib/notifications/push-center-service";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
    .slice(0, 60);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function GET() {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  await ensureDefaultPlatformServices();
  await ensureDashboardWorkflowService(
    STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG,
  );

  const [
    defaultFreePlan,
    plans,
    automaticPromotions,
    services,
    schools,
    subscriptions,
    serviceAccess,
  ] = await Promise.all([
    getDefaultFreePlanConfig(),

    prisma.plan.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        features: true,
        promotions: {
          where: { promotion: { is: { isAutomatic: true } } },
          select: {
            promotion: {
              select: {
                id: true,
                name: true,
                isAutomatic: true,
                isActive: true,
                discountType: true,
                discountValue: true,
                startsAt: true,
                endsAt: true,
              },
            },
          },
        },
      },
    }),

    prisma.promotion.findMany({
      where: { isAutomatic: true, isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isAutomatic: true,
        isActive: true,
        discountType: true,
        discountValue: true,
        startsAt: true,
        endsAt: true,
      },
    }),

    prisma.service.findMany({
      where: { status: "ACTIVE" },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.schoolAccount.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        profile: {
          select: {
            schoolName: true,
            educationDepartment: true,
          },
        },
      },
    }),

    prisma.subscription.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        schoolAccount: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            profile: {
              select: {
                schoolName: true,
                educationDepartment: true,
              },
            },
            users: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                officialName: true,
                email: true,
                role: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        plan: true,
      },
    }),

    prisma.serviceAccess.findMany({
      include: {
        service: true,
        schoolAccount: {
          select: {
            id: true,
            name: true,
            profile: { select: { schoolName: true } },
            users: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                officialName: true,
                email: true,
                role: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const serviceAccessForAdmin = serviceAccess.map((row) => {
    const users = row.schoolAccount.users;
    const primaryUser =
      [
        "SCHOOL_OWNER",
        "PRINCIPAL",
        "COUNSELOR",
        "ACTIVITY_LEADER",
        "TEACHER",
        "STAFF",
        "ADMIN",
      ]
        .map((role) => users.find((user) => user.role === role))
        .find(Boolean) ||
      users[0] ||
      null;

    return {
      ...row,
      schoolAccount: {
        id: row.schoolAccount.id,
        name: primaryUser
          ? `${primaryUser.officialName || primaryUser.name || primaryUser.email} — ${ACCOUNT_ROLE_LABELS[primaryUser.role] || primaryUser.role}`
          : "مستخدم غير محدد",
        accountName: row.schoolAccount.name,
        schoolName:
          row.schoolAccount.profile?.schoolName || row.schoolAccount.name,
        primaryUser: primaryUser
          ? {
              id: primaryUser.id,
              name: primaryUser.name,
              officialName: primaryUser.officialName,
              email: primaryUser.email,
              role: primaryUser.role,
            }
          : null,
        additionalUserCount: Math.max(users.length - (primaryUser ? 1 : 0), 0),
      },
    };
  });

  const subscriptionsForAdmin = subscriptions.map((row) => {
    const users = row.schoolAccount.users;
    const primaryUser = pickPrimaryAccountUser(users);

    return {
      ...row,
      schoolAccount: {
        id: row.schoolAccount.id,
        name: primaryUser
          ? `${primaryUser.officialName || primaryUser.name || primaryUser.email} — ${ACCOUNT_ROLE_LABELS[primaryUser.role] || primaryUser.role}`
          : "مستخدم غير محدد",
        accountName: row.schoolAccount.name,
        schoolName:
          row.schoolAccount.profile?.schoolName || row.schoolAccount.name,
        primaryUser: primaryUser
          ? {
              id: primaryUser.id,
              name: primaryUser.name,
              officialName: primaryUser.officialName,
              email: primaryUser.email,
              role: primaryUser.role,
            }
          : null,
        additionalUserCount: Math.max(users.length - (primaryUser ? 1 : 0), 0),
      },
    };
  });

  return NextResponse.json({
    defaultFreePlan,
    plans,
    automaticPromotions,
    services,
    schools,
    subscriptions: subscriptionsForAdmin,
    serviceAccess: serviceAccessForAdmin,
  });
}

const ACCOUNT_USER_ROLE_PRIORITY = [
  "SCHOOL_OWNER",
  "PRINCIPAL",
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
  "STAFF",
  "ADMIN",
] as const;
const ACCOUNT_ROLE_LABELS: Record<string, string> = {
  SCHOOL_OWNER: "مالك المدرسة",
  PRINCIPAL: "مدير المدرسة",
  COUNSELOR: "الموجه الطلابي",
  ACTIVITY_LEADER: "رائد النشاط",
  TEACHER: "المعلم",
  STAFF: "الموظف",
  ADMIN: "المشرف",
};

function pickPrimaryAccountUser<T extends { role: string }>(users: T[]) {
  return (
    ACCOUNT_USER_ROLE_PRIORITY.map((role) =>
      users.find((user) => user.role === role),
    ).find(Boolean) ||
    users[0] ||
    null
  );
}

export async function POST(request: Request) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  await ensureDashboardWorkflowService(
    STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG,
  );

  const current = await getCurrentSessionUser();

  if (!current) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const action = String(payload?.action || "").trim();

  if (action === "save-default-free-plan") {
    const planName = String(payload?.planName || "").trim();
    const enabled = Boolean(payload?.enabled);
    const durationDays = Number(payload?.durationDays || 0);
    const accessMode =
      String(payload?.accessMode || "ALL_SERVICES").trim() === "CUSTOM_SERVICES"
        ? "CUSTOM_SERVICES"
        : "ALL_SERVICES";
    const enabledServiceSlugs = getActivityProgramsBillingServiceSlugs(
      Array.isArray(payload?.enabledServiceSlugs)
        ? payload.enabledServiceSlugs.map(String)
        : [],
    );
    if (durationDays <= 0) {
      return NextResponse.json(
        { error: "اكتب مدة صحيحة للباقة بالأيام." },
        { status: 400 },
      );
    }

    const config = await saveDefaultFreePlanConfig({
      planName,
      enabled,
      durationDays,
      accessMode,
      enabledServiceSlugs,
    });

    return NextResponse.json({
      message: "تم حفظ إعدادات الباقة التلقائية.",
      defaultFreePlan: config,
    });
  }

  if (action === "create-plan") {
    const name = String(payload?.name || "").trim();
    const rawSlug = String(payload?.slug || "").trim();
    const slug = slugify(rawSlug || name);
    const priceMonthly = Number(payload?.priceMonthly || 0);
    const priceYearly = Number(payload?.priceYearly || 0);
    const commercialType =
      String(payload?.commercialType || "TERM").trim() === "YEAR"
        ? "YEAR"
        : "TERM";
    const durationMode =
      String(payload?.durationMode || "DAYS").trim() === "FIXED_END_DATE"
        ? "FIXED_END_DATE"
        : "DAYS";
    const fixedEndDate = String(payload?.fixedEndDate || "").trim();
    const termLabel = String(payload?.termLabel || "").trim();
    const durationDays = Number(payload?.durationDays || 30);
    const maxStudents = Number(payload?.maxStudents || 0);
    const maxUsers = Number(payload?.maxUsers || 0);
    const maxReports = Number(payload?.maxReports || 0);
    const enabledServiceSlugs = getActivityProgramsBillingServiceSlugs(
      Array.isArray(payload?.enabledServiceSlugs)
        ? payload.enabledServiceSlugs.map(String)
        : [],
    );
    const serviceAccessMode =
      String(payload?.serviceAccessMode || "CUSTOM_SERVICES").trim() ===
      "ALL_SERVICES"
        ? "ALL_SERVICES"
        : "CUSTOM_SERVICES";

    const targetAudienceRaw = String(payload?.targetAudience || "ALL").trim();
    const targetAudience: PlanAudience =
      targetAudienceRaw === "GUIDANCE" || targetAudienceRaw === "ACTIVITY"
        ? targetAudienceRaw
        : "ALL";
    const visibleRoles =
      normalizePlanVisibleRoles(payload?.visibleRoles) ??
      getDefaultVisibleRolesForAudience(targetAudience);
    const isPublic =
      typeof payload?.isPublic === "boolean" ? payload.isPublic : true;
    const isArchived = Boolean(payload?.isArchived);
    const offerEnabled = Boolean(payload?.offerEnabled);
    const offerName = String(payload?.offerName || "").trim();
    const offerPrice = Number(payload?.offerPrice);
    if (commercialType === "TERM" && priceMonthly <= 0)
      return NextResponse.json(
        { error: "سعر باقة الفصل مطلوب." },
        { status: 400 },
      );
    if (commercialType === "YEAR" && priceYearly <= 0)
      return NextResponse.json(
        { error: "سعر الباقة السنوية مطلوب." },
        { status: 400 },
      );
    const basePrice = commercialType === "YEAR" ? priceYearly : priceMonthly;
    if (offerEnabled) {
      if (!offerName) {
        return NextResponse.json(
          { error: "اسم العرض مطلوب عند تفعيل العرض على الباقة." },
          { status: 400 },
        );
      }
      if (!Number.isFinite(offerPrice) || offerPrice < 0) {
        return NextResponse.json(
          { error: "سعر العرض يجب أن يكون رقمًا صحيحًا غير سالب." },
          { status: 400 },
        );
      }
      if (offerPrice >= basePrice) {
        return NextResponse.json(
          { error: "سعر العرض يجب أن يكون أقل من السعر الأساسي." },
          { status: 400 },
        );
      }
    }
    if (
      durationMode === "DAYS" &&
      (!Number.isInteger(durationDays) || durationDays <= 0)
    )
      return NextResponse.json(
        { error: "أدخل مدة صحيحة بالأيام." },
        { status: 400 },
      );
    if (
      durationMode === "FIXED_END_DATE" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(fixedEndDate) ||
        new Date(`${fixedEndDate}T23:59:59.999Z`).getTime() <= Date.now())
    )
      return NextResponse.json(
        {
          error: "تاريخ الانتهاء الثابت يجب أن يكون تاريخًا مستقبليًا صحيحًا.",
        },
        { status: 400 },
      );

    if (
      !Number.isFinite(priceMonthly) ||
      !Number.isFinite(priceYearly) ||
      priceMonthly < 0 ||
      priceYearly < 0
    ) {
      return NextResponse.json(
        { error: "يجب أن تكون أسعار الباقة أرقامًا صحيحة غير سالبة." },
        { status: 400 },
      );
    }

    const knownServices = await prisma.service.findMany({
      select: { slug: true },
    });
    const knownServiceSlugs = new Set(
      knownServices.map((service) => service.slug),
    );
    if (
      enabledServiceSlugs.some(
        (serviceSlug) => !knownServiceSlugs.has(serviceSlug),
      )
    ) {
      return NextResponse.json(
        { error: "تتضمن الباقة خدمة غير معروفة." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json({ error: "اكتب اسم الباقة." }, { status: 400 });
    }

    if (!slug) {
      return NextResponse.json(
        { error: "تعذر إنشاء معرف الباقة." },
        { status: 400 },
      );
    }

    const existing = await prisma.plan.findUnique({
      where: {
        slug,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "يوجد باقة بنفس المعرف." },
        { status: 400 },
      );
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        slug,
        priceMonthly,
        priceYearly,
        isActive:
          typeof payload?.isActive === "boolean" ? payload.isActive : true,
        isPublic,
        isArchived,
        visibleRoles,
        features: {
          create: [
            {
              key: "serviceAccessMode",
              label: "Service access mode",
              value: serviceAccessMode,
            },
            {
              key: "manualOfferEnabled",
              label: "يوجد عرض على الباقة",
              value: String(offerEnabled),
            },
            ...(offerEnabled
              ? [
                  {
                    key: "manualOfferName",
                    label: "اسم العرض",
                    value: offerName,
                  },
                  {
                    key: "manualOfferPrice",
                    label: "السعر بعد العرض",
                    value: String(Math.trunc(offerPrice)),
                  },
                ]
              : []),
            {
              key: "targetAudience",
              label: "الجمهور المستهدف",
              value: targetAudience,
            },
            {
              key: "durationDays",
              label: "مدة الاشتراك بالأيام",
              value: String(durationDays > 0 ? durationDays : 30),
            },
            {
              key: "commercialType",
              label: "نوع العرض التجاري",
              value: commercialType,
            },
            { key: "durationMode", label: "نمط المدة", value: durationMode },
            ...(durationMode === "FIXED_END_DATE"
              ? [
                  {
                    key: "fixedEndDate",
                    label: "تاريخ الانتهاء الثابت",
                    value: fixedEndDate,
                  },
                ]
              : []),
            ...(termLabel
              ? [{ key: "termLabel", label: "وسم الفصل", value: termLabel }]
              : []),
            {
              key: "maxStudents",
              label: "حد الطلاب",
              value: String(maxStudents > 0 ? maxStudents : 0),
            },
            {
              key: "maxUsers",
              label: "حد المستخدمين",
              value: String(maxUsers > 0 ? maxUsers : 0),
            },
            {
              key: "maxReports",
              label: "حد التقارير",
              value: String(maxReports > 0 ? maxReports : 0),
            },
            ...enabledServiceSlugs.map((serviceSlug: string) => ({
              key: `service:${serviceSlug}`,
              label: `خدمة: ${serviceSlug}`,
              value: "enabled",
            })),
          ],
        },
      },
      include: {
        features: true,
      },
    });

    return NextResponse.json({
      message: "تم إنشاء الباقة بنجاح.",
      plan,
    });
  }

  if (action === "update-plan") {
    const planId = String(payload?.planId || "").trim();
    const name = String(payload?.name || "").trim();
    const priceMonthly = Number(payload?.priceMonthly);
    const priceYearly = Number(payload?.priceYearly);
    const commercialType = String(payload?.commercialType || "").trim();
    const durationMode =
      String(payload?.durationMode || "DAYS").trim() === "FIXED_END_DATE"
        ? "FIXED_END_DATE"
        : "DAYS";
    const fixedEndDate = String(payload?.fixedEndDate || "").trim();
    const termLabel = String(payload?.termLabel || "").trim();
    const durationDays = Number(payload?.durationDays || 30);
    const maxStudents = Number(payload?.maxStudents || 0);
    const maxUsers = Number(payload?.maxUsers || 0);
    const maxReports = Number(payload?.maxReports || 0);
    const offerEnabled = Boolean(payload?.offerEnabled);
    const offerName = String(payload?.offerName || "").trim();
    const offerPrice = Number(payload?.offerPrice);
    const targetAudienceRaw = String(payload?.targetAudience || "ALL").trim();
    const targetAudience: PlanAudience =
      targetAudienceRaw === "GUIDANCE" || targetAudienceRaw === "ACTIVITY"
        ? targetAudienceRaw
        : "ALL";
    const visibleRoles = normalizePlanVisibleRoles(payload?.visibleRoles);
    const enabledServiceSlugs = getActivityProgramsBillingServiceSlugs(
      Array.isArray(payload?.enabledServiceSlugs)
        ? payload.enabledServiceSlugs.map(String)
        : [],
    );
    const serviceAccessMode =
      String(payload?.serviceAccessMode || "CUSTOM_SERVICES").trim() ===
      "ALL_SERVICES"
        ? "ALL_SERVICES"
        : "CUSTOM_SERVICES";

    if (!planId)
      return NextResponse.json({ error: "رقم الباقة مطلوب." }, { status: 400 });
    if (!name)
      return NextResponse.json({ error: "اكتب اسم الباقة." }, { status: 400 });
    if (
      !Number.isFinite(priceMonthly) ||
      !Number.isFinite(priceYearly) ||
      priceMonthly < 0 ||
      priceYearly < 0
    ) {
      return NextResponse.json(
        { error: "يجب أن تكون أسعار الباقة أرقامًا صحيحة غير سالبة." },
        { status: 400 },
      );
    }
    if (!visibleRoles)
      return NextResponse.json(
        { error: "الأدوار المحددة للباقة غير صالحة." },
        { status: 400 },
      );
    if (
      commercialType &&
      commercialType !== "TERM" &&
      commercialType !== "YEAR"
    )
      return NextResponse.json(
        { error: "نوع الباقة غير صالح." },
        { status: 400 },
      );
    if (commercialType === "TERM" && priceMonthly <= 0)
      return NextResponse.json(
        { error: "سعر باقة الفصل مطلوب." },
        { status: 400 },
      );
    if (commercialType === "YEAR" && priceYearly <= 0)
      return NextResponse.json(
        { error: "سعر الباقة السنوية مطلوب." },
        { status: 400 },
      );
    const basePrice = commercialType === "YEAR" ? priceYearly : priceMonthly;
    if (offerEnabled) {
      if (!offerName) {
        return NextResponse.json(
          { error: "اسم العرض مطلوب عند تفعيل العرض على الباقة." },
          { status: 400 },
        );
      }
      if (!Number.isFinite(offerPrice) || offerPrice < 0) {
        return NextResponse.json(
          { error: "سعر العرض يجب أن يكون رقمًا صحيحًا غير سالب." },
          { status: 400 },
        );
      }
      if (offerPrice >= basePrice) {
        return NextResponse.json(
          { error: "سعر العرض يجب أن يكون أقل من السعر الأساسي." },
          { status: 400 },
        );
      }
    }
    if (
      durationMode === "DAYS" &&
      (!Number.isInteger(durationDays) || durationDays <= 0)
    )
      return NextResponse.json(
        { error: "أدخل مدة صحيحة بالأيام." },
        { status: 400 },
      );
    if (
      durationMode === "FIXED_END_DATE" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(fixedEndDate) ||
        new Date(`${fixedEndDate}T23:59:59.999Z`).getTime() <= Date.now())
    )
      return NextResponse.json(
        {
          error: "تاريخ الانتهاء الثابت يجب أن يكون تاريخًا مستقبليًا صحيحًا.",
        },
        { status: 400 },
      );

    const [existingPlan, knownServices] = await Promise.all([
      prisma.plan.findUnique({
        where: { id: planId },
        select: { id: true, slug: true, isArchived: true, features: true },
      }),
      prisma.service.findMany({ select: { slug: true } }),
    ]);
    if (!existingPlan)
      return NextResponse.json(
        { error: "الباقة غير موجودة." },
        { status: 404 },
      );
    if (existingPlan.slug === "default-free-auto") {
      return NextResponse.json(
        { error: "تُدار الباقة التلقائية من صفحتها المخصصة." },
        { status: 400 },
      );
    }
    const knownServiceSlugs = new Set(
      knownServices.map((service) => service.slug),
    );
    if (
      enabledServiceSlugs.some(
        (serviceSlug) => !knownServiceSlugs.has(serviceSlug),
      )
    ) {
      return NextResponse.json(
        { error: "تتضمن الباقة خدمة غير معروفة." },
        { status: 400 },
      );
    }
    const previousServiceSlugs = getPlanServiceSlugs(existingPlan.features);
    const applyToCurrentSubscribers = Boolean(
      payload?.applyToCurrentSubscribers,
    );

    const managedKeys = [
      "targetAudience",
      "durationDays",
      "commercialType",
      "durationMode",
      "fixedEndDate",
      "termLabel",
      "maxStudents",
      "maxUsers",
      "maxReports",
      "manualOfferEnabled",
      "manualOfferName",
      "manualOfferPrice",
    ];
    const featureData = [
      {
        key: "serviceAccessMode",
        label: "Service access mode",
        value: serviceAccessMode,
      },
      {
        key: "manualOfferEnabled",
        label: "يوجد عرض على الباقة",
        value: String(offerEnabled),
      },
      ...(offerEnabled
        ? [
            {
              key: "manualOfferName",
              label: "اسم العرض",
              value: offerName,
            },
            {
              key: "manualOfferPrice",
              label: "السعر بعد العرض",
              value: String(Math.trunc(offerPrice)),
            },
          ]
        : []),
      {
        key: "targetAudience",
        label: "الجمهور المستهدف",
        value: targetAudience,
      },
      {
        key: "durationDays",
        label: "مدة الاشتراك بالأيام",
        value: String(durationDays > 0 ? durationDays : 30),
      },
      ...(commercialType === "TERM" || commercialType === "YEAR"
        ? [
            {
              key: "commercialType",
              label: "نوع العرض التجاري",
              value: commercialType,
            },
          ]
        : []),
      { key: "durationMode", label: "نمط المدة", value: durationMode },
      ...(durationMode === "FIXED_END_DATE" &&
      /^\d{4}-\d{2}-\d{2}$/.test(fixedEndDate)
        ? [
            {
              key: "fixedEndDate",
              label: "تاريخ الانتهاء الثابت",
              value: fixedEndDate,
            },
          ]
        : []),
      ...(termLabel
        ? [{ key: "termLabel", label: "وسم الفصل", value: termLabel }]
        : []),
      {
        key: "maxStudents",
        label: "حد الطلاب",
        value: String(maxStudents > 0 ? maxStudents : 0),
      },
      {
        key: "maxUsers",
        label: "حد المستخدمين",
        value: String(maxUsers > 0 ? maxUsers : 0),
      },
      {
        key: "maxReports",
        label: "حد التقارير",
        value: String(maxReports > 0 ? maxReports : 0),
      },
      ...enabledServiceSlugs.map((serviceSlug) => ({
        key: `service:${serviceSlug}`,
        label: `خدمة: ${serviceSlug}`,
        value: "enabled",
      })),
    ];

    const plan = await prisma.$transaction(async (transaction) => {
      const existingFeatures = await transaction.planFeature.findMany({
        where: { planId },
        select: { id: true, key: true },
      });
      const featureIdsToDelete = existingFeatures
        .filter(
          (feature) =>
            managedKeys.includes(feature.key) ||
            feature.key.startsWith("service:"),
        )
        .map((feature) => feature.id);

      if (featureIdsToDelete.length > 0) {
        await transaction.planFeature.deleteMany({
          where: { id: { in: featureIdsToDelete } },
        });
      }
      await transaction.planFeature.createMany({
        data: featureData.map((feature) => ({ ...feature, planId })),
      });
      return transaction.plan.update({
        where: { id: planId },
        data: {
          name,
          priceMonthly,
          priceYearly,
          isActive:
            typeof payload?.isActive === "boolean"
              ? payload.isActive
              : undefined,
          isPublic:
            typeof payload?.isPublic === "boolean"
              ? payload.isPublic
              : undefined,
          visibleRoles,
        },
        include: { features: true },
      });
    });

    const serviceChange = applyToCurrentSubscribers
      ? await syncPlanEntitlementsForSubscribers({
          planId,
          previousServiceSlugs,
          nextServiceSlugs: enabledServiceSlugs,
        })
      : {
          affectedSubscribers: 0,
          addedSlugs: enabledServiceSlugs.filter(
            (slug) => !previousServiceSlugs.includes(slug),
          ),
          removedSlugs: previousServiceSlugs.filter(
            (slug) => !enabledServiceSlugs.includes(slug),
          ),
        };
    if (serviceChange.addedSlugs.length || serviceChange.removedSlugs.length) {
      await logAdminActivity({
        actorUserId: current.user.id,
        category: "SUBSCRIPTION",
        action: "PLAN_ENTITLEMENTS_UPDATED",
        severity: "SUCCESS",
        title: "تحديث خدمات الباقة",
        details: {
          planId,
          planName: plan.name,
          addedServices: serviceChange.addedSlugs,
          removedServices: serviceChange.removedSlugs,
          affectedSubscribers: serviceChange.affectedSubscribers,
          appliedToCurrentSubscribers: applyToCurrentSubscribers,
        },
      });
    }
    return NextResponse.json({
      message: "تم تحديث الباقة.",
      plan,
      serviceChange: {
        ...serviceChange,
        appliedToCurrentSubscribers: applyToCurrentSubscribers,
      },
    });
  }

  if (action === "archive-plan" || action === "restore-plan") {
    const planId = String(payload?.planId || "").trim();
    if (!planId)
      return NextResponse.json({ error: "رقم الباقة مطلوب." }, { status: 400 });
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, slug: true },
    });
    if (!plan)
      return NextResponse.json(
        { error: "الباقة غير موجودة." },
        { status: 404 },
      );
    if (plan.slug === "default-free-auto")
      return NextResponse.json(
        { error: "لا يمكن أرشفة الباقة التلقائية من هنا." },
        { status: 400 },
      );
    const isArchived = action === "archive-plan";
    const updated = await prisma.plan.update({
      where: { id: planId },
      data: { isArchived },
      include: { features: true },
    });
    return NextResponse.json({
      message: isArchived ? "تمت أرشفة الباقة." : "تمت استعادة الباقة.",
      plan: updated,
    });
  }

  if (action === "toggle-plan") {
    const planId = String(payload?.planId || "").trim();
    const isActive = Boolean(payload?.isActive);

    if (!planId) {
      return NextResponse.json({ error: "رقم الباقة مطلوب." }, { status: 400 });
    }

    await prisma.plan.update({
      where: {
        id: planId,
      },
      data: {
        isActive,
      },
    });

    return NextResponse.json({
      message: isActive ? "تم تفعيل الباقة." : "تم إيقاف الباقة.",
    });
  }

  if (action === "update-plan-visibility") {
    const planId = String(payload?.planId || "").trim();
    const isPublic =
      typeof payload?.isPublic === "boolean" ? payload.isPublic : undefined;
    const isArchived =
      typeof payload?.isArchived === "boolean" ? payload.isArchived : undefined;
    const visibleRoles = normalizePlanVisibleRoles(payload?.visibleRoles) ?? [];

    if (!planId) {
      return NextResponse.json({ error: "رقم الباقة مطلوب." }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: {
        id: planId,
      },
      select: {
        id: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "الباقة غير موجودة." },
        { status: 404 },
      );
    }

    await prisma.plan.update({
      where: {
        id: planId,
      },
      data: {
        ...(typeof isPublic === "boolean" ? { isPublic } : {}),
        ...(typeof isArchived === "boolean" ? { isArchived } : {}),
        visibleRoles,
      },
    });

    return NextResponse.json({
      message: "تم تحديث ظهور الباقة.",
    });
  }

  if (action === "assign-plan") {
    const schoolAccountId = String(payload?.schoolAccountId || "").trim();
    const planId = String(payload?.planId || "").trim();
    const days = Number(payload?.days || 0);
    const status = String(payload?.status || "ACTIVE") as
      "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";

    if (!schoolAccountId || !planId) {
      return NextResponse.json(
        { error: "اختر الحساب والباقة." },
        { status: 400 },
      );
    }

    const plan = await prisma.plan.findUnique({
      where: {
        id: planId,
      },
      include: {
        features: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "الباقة غير موجودة." },
        { status: 404 },
      );
    }

    const durationDays =
      days > 0
        ? days
        : Number(getPlanFeatureValue(plan.features, "durationDays", "30")) > 0
          ? Number(getPlanFeatureValue(plan.features, "durationDays", "30"))
          : 30;

    const subscription = await assignPlanToSchool({
      schoolAccountId,
      planId,
      days: durationDays,
      status,
      activatedById: current.user.id,
      reason: `إسناد باقة ${plan.name} لمدة ${durationDays} يوم`,
    });

    void dispatchAutomaticPushEvent({
      triggerKey: "subscription-activated",
      actorUserId: current.user.id,
      sourceRecordId: subscription.id,
      variables: { serviceName: plan.name },
    }).catch(() => undefined);

    return NextResponse.json({
      message: "تم إسناد الباقة وتفعيل الخدمات المصاحبة.",
      subscription,
    });
  }

  if (action === "extend-subscription") {
    const subscriptionId = String(payload?.subscriptionId || "").trim();
    const days = Number(payload?.days || 30);

    const subscription = await prisma.subscription.findUnique({
      where: {
        id: subscriptionId,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "الاشتراك غير موجود." },
        { status: 404 },
      );
    }

    const now = new Date();
    const baseDate =
      subscription.endsAt && subscription.endsAt.getTime() > now.getTime()
        ? subscription.endsAt
        : now;

    const endsAt = addDays(baseDate, days > 0 ? days : 30);

    await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        status: "ACTIVE",
        endsAt,
      },
    });

    void dispatchAutomaticPushEvent({
      triggerKey: "subscription-activated",
      actorUserId: current.user.id,
      sourceRecordId: subscription.id,
      variables: { serviceName: "Teachix" },
    }).catch(() => undefined);

    await prisma.manualActivation.create({
      data: {
        schoolAccountId: subscription.schoolAccountId,
        activatedById: current.user.id,
        reason: `تمديد اشتراك لمدة ${days || 30} يوم`,
        startsAt: now,
        endsAt,
      },
    });

    return NextResponse.json({
      message: "تم تمديد الاشتراك.",
    });
  }

  if (action === "cancel-subscription" || action === "reset-subscription") {
    const subscriptionId = String(payload?.subscriptionId || "").trim();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "رقم الاشتراك مطلوب." },
        { status: 400 },
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: {
        id: subscriptionId,
      },
      include: {
        schoolAccount: true,
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "الاشتراك غير موجود أو تم حذفه مسبقًا." },
        { status: 404 },
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.serviceAccess.updateMany({
        where: {
          schoolAccountId: subscription.schoolAccountId,
        },
        data: {
          isEnabled: false,
          isPaid: false,
        },
      });

      await tx.manualActivation.create({
        data: {
          schoolAccountId: subscription.schoolAccountId,
          reason: `حذف الاشتراك وإرجاع الحساب بدون باقة: ${subscription.schoolAccount.name}`,
          startsAt: now,
          endsAt: now,
        },
      });

      await tx.subscription.delete({
        where: {
          id: subscription.id,
        },
      });
    });

    return NextResponse.json({
      message: "تم حذف الاشتراك وإرجاع الحساب بدون باقة وبدون أي أيام.",
    });
  }

  if (action === "toggle-service-access") {
    const schoolAccountId = String(payload?.schoolAccountId || "").trim();
    const serviceId = String(payload?.serviceId || "").trim();
    const isEnabled = Boolean(payload?.isEnabled);
    const isPaid = Boolean(payload?.isPaid);

    if (!schoolAccountId || !serviceId) {
      return NextResponse.json(
        { error: "اختر الحساب والخدمة." },
        { status: 400 },
      );
    }

    await prisma.serviceAccess.upsert({
      where: {
        schoolAccountId_serviceId: {
          schoolAccountId,
          serviceId,
        },
      },
      update: {
        isEnabled,
        isPaid,
      },
      create: {
        schoolAccountId,
        serviceId,
        isEnabled,
        isPaid,
      },
    });

    return NextResponse.json({
      message: "تم تحديث صلاحية الخدمة للحساب.",
    });
  }

  return NextResponse.json({ error: "إجراء غير معروف." }, { status: 400 });
}
