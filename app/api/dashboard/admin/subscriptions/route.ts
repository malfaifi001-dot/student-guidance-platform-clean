import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

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

async function requireAdmin() {
  const current = await getCurrentSessionUser();

  if (!current?.user || current.user.role !== "ADMIN") {
    return null;
  }

  return current;
}

async function syncSchoolServicesFromPlan(input: {
  schoolAccountId: string;
  planId: string;
}) {
  const planFeatures = await prisma.planFeature.findMany({
    where: {
      planId: input.planId,
      key: {
        startsWith: "service:",
      },
    },
  });

  const enabledServiceSlugs = planFeatures
    .filter((feature) => feature.value === "enabled")
    .map((feature) => feature.key.replace("service:", ""));

  const services = await prisma.service.findMany({
    where: {
      slug: {
        in: enabledServiceSlugs,
      },
    },
  });

  for (const service of services) {
    await prisma.serviceAccess.upsert({
      where: {
        schoolAccountId_serviceId: {
          schoolAccountId: input.schoolAccountId,
          serviceId: service.id,
        },
      },
      update: {
        isEnabled: true,
        isPaid: true,
      },
      create: {
        schoolAccountId: input.schoolAccountId,
        serviceId: service.id,
        isEnabled: true,
        isPaid: true,
      },
    });
  }
}

export async function GET() {
  const current = await requireAdmin();

  if (!current) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }

  const [plans, services, schools, subscriptions, serviceAccess] =
    await Promise.all([
      prisma.plan.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          features: true,
        },
      }),

      prisma.service.findMany({
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
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);

  return NextResponse.json({
    plans,
    services,
    schools,
    subscriptions,
    serviceAccess,
  });
}

export async function POST(request: Request) {
  const current = await requireAdmin();

  if (!current) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const action = String(payload?.action || "").trim();

  if (action === "create-plan") {
    const name = String(payload?.name || "").trim();
    const rawSlug = String(payload?.slug || "").trim();
    const slug = slugify(rawSlug || name);
    const priceMonthly = Number(payload?.priceMonthly || 0);
    const priceYearly = Number(payload?.priceYearly || 0);
    const durationDays = Number(payload?.durationDays || 30);
    const maxStudents = Number(payload?.maxStudents || 0);
    const maxUsers = Number(payload?.maxUsers || 0);
    const maxReports = Number(payload?.maxReports || 0);
    const enabledServiceSlugs = Array.isArray(payload?.enabledServiceSlugs)
      ? payload.enabledServiceSlugs.map(String)
      : [];

    if (!name) {
      return NextResponse.json(
        { error: "اكتب اسم الباقة." },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: "تعذر إنشاء معرف الباقة." },
        { status: 400 }
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
        { status: 400 }
      );
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        slug,
        priceMonthly: priceMonthly >= 0 ? priceMonthly : 0,
        priceYearly: priceYearly >= 0 ? priceYearly : 0,
        isActive: true,
        features: {
          create: [
            {
              key: "durationDays",
              label: "مدة الاشتراك بالأيام",
              value: String(durationDays > 0 ? durationDays : 30),
            },
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

  if (action === "toggle-plan") {
    const planId = String(payload?.planId || "").trim();
    const isActive = Boolean(payload?.isActive);

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

  if (action === "assign-plan") {
    const schoolAccountId = String(payload?.schoolAccountId || "").trim();
    const planId = String(payload?.planId || "").trim();
    const days = Number(payload?.days || 0);
    const status = String(payload?.status || "ACTIVE") as
      | "TRIAL"
      | "ACTIVE"
      | "PAST_DUE"
      | "CANCELED"
      | "EXPIRED";

    if (!schoolAccountId || !planId) {
      return NextResponse.json(
        { error: "اختر الحساب والباقة." },
        { status: 400 }
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
        { status: 404 }
      );
    }

    const durationFeature = plan.features.find(
      (feature) => feature.key === "durationDays"
    );

    const durationDays =
      days > 0
        ? days
        : Number(durationFeature?.value || 30) > 0
          ? Number(durationFeature?.value || 30)
          : 30;

    const now = new Date();
    const endsAt = addDays(now, durationDays);

    const subscription = await prisma.subscription.upsert({
      where: {
        schoolAccountId,
      },
      update: {
        planId,
        status,
        startsAt: now,
        endsAt,
      },
      create: {
        schoolAccountId,
        planId,
        status,
        startsAt: now,
        endsAt,
      },
    });

    await syncSchoolServicesFromPlan({
      schoolAccountId,
      planId,
    });

    await prisma.manualActivation.create({
      data: {
        schoolAccountId,
        activatedById: current.user.id,
        reason: `إسناد باقة ${plan.name} لمدة ${durationDays} يوم`,
        startsAt: now,
        endsAt,
      },
    });

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
        { status: 404 }
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

  if (action === "cancel-subscription") {
    const subscriptionId = String(payload?.subscriptionId || "").trim();

    await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        status: "CANCELED",
      },
    });

    return NextResponse.json({
      message: "تم إيقاف الاشتراك.",
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
        { status: 400 }
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

  return NextResponse.json(
    { error: "إجراء غير معروف." },
    { status: 400 }
  );
}
