import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

function getSchoolDisplayName(account: {
  profile?: {
    schoolName?: string | null;
  } | null;
}) {
  const schoolName = String(account.profile?.schoolName || "").trim();
  return schoolName || "Ù‡ÙˆÙŠØ© Ø§Ù„Ù…Ø¯Ø±Ø³Ø© ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø©";
}

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
    .filter((feature: any) => feature.value === "enabled")
    .map((feature: any) => feature.key.replace("service:", ""));

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
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current) {
    return NextResponse.json({ error: "ØºÙŠØ± Ù…ØµØ±Ø­." }, { status: 401 });
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
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current) {
    return NextResponse.json({ error: "ØºÙŠØ± Ù…ØµØ±Ø­." }, { status: 401 });
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
        { error: "Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ø§Ù„Ø¨Ø§Ù‚Ø©." },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: "ØªØ¹Ø°Ø± Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø¹Ø±Ù Ø§Ù„Ø¨Ø§Ù‚Ø©." },
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
        { error: "ÙŠÙˆØ¬Ø¯ Ø¨Ø§Ù‚Ø© Ø¨Ù†ÙØ³ Ø§Ù„Ù…Ø¹Ø±Ù." },
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
              label: "Ù…Ø¯Ø© Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ø¨Ø§Ù„Ø£ÙŠØ§Ù…",
              value: String(durationDays > 0 ? durationDays : 30),
            },
            {
              key: "maxStudents",
              label: "Ø­Ø¯ Ø§Ù„Ø·Ù„Ø§Ø¨",
              value: String(maxStudents > 0 ? maxStudents : 0),
            },
            {
              key: "maxUsers",
              label: "Ø­Ø¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†",
              value: String(maxUsers > 0 ? maxUsers : 0),
            },
            {
              key: "maxReports",
              label: "Ø­Ø¯ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±",
              value: String(maxReports > 0 ? maxReports : 0),
            },
            ...enabledServiceSlugs.map((serviceSlug: string) => ({
              key: `service:${serviceSlug}`,
              label: `Ø®Ø¯Ù…Ø©: ${serviceSlug}`,
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
      message: "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¨Ø§Ù‚Ø© Ø¨Ù†Ø¬Ø§Ø­.",
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
      message: isActive ? "ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¨Ø§Ù‚Ø©." : "ØªÙ… Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø¨Ø§Ù‚Ø©.",
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
        { error: "Ø§Ø®ØªØ± Ø§Ù„Ø­Ø³Ø§Ø¨ ÙˆØ§Ù„Ø¨Ø§Ù‚Ø©." },
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
        { error: "Ø§Ù„Ø¨Ø§Ù‚Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©." },
        { status: 404 }
      );
    }

    const durationFeature = plan.features.find(
      (feature: any) => feature.key === "durationDays"
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
        reason: `Ø¥Ø³Ù†Ø§Ø¯ Ø¨Ø§Ù‚Ø© ${plan.name} Ù„Ù…Ø¯Ø© ${durationDays} ÙŠÙˆÙ…`,
        startsAt: now,
        endsAt,
      },
    });

    return NextResponse.json({
      message: "ØªÙ… Ø¥Ø³Ù†Ø§Ø¯ Ø§Ù„Ø¨Ø§Ù‚Ø© ÙˆØªÙØ¹ÙŠÙ„ Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ù…ØµØ§Ø­Ø¨Ø©.",
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
        { error: "Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯." },
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
        reason: `ØªÙ…Ø¯ÙŠØ¯ Ø§Ø´ØªØ±Ø§Ùƒ Ù„Ù…Ø¯Ø© ${days || 30} ÙŠÙˆÙ…`,
        startsAt: now,
        endsAt,
      },
    });

    return NextResponse.json({
      message: "ØªÙ… ØªÙ…Ø¯ÙŠØ¯ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ.",
    });
  }

  if (action === "cancel-subscription" || action === "reset-subscription") {
    const subscriptionId = String(payload?.subscriptionId || "").trim();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Ø±Ù‚Ù… Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ù…Ø·Ù„ÙˆØ¨." },
        { status: 400 }
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
        { error: "Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ Ø£Ùˆ ØªÙ… Ø­Ø°ÙÙ‡ Ù…Ø³Ø¨Ù‚Ù‹Ø§." },
        { status: 404 }
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
          reason: `Ø­Ø°Ù Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ÙˆØ¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø¨Ø¯ÙˆÙ† Ø¨Ø§Ù‚Ø©: ${subscription.schoolAccount.name}`,
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
      message: "ØªÙ… Ø­Ø°Ù Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ÙˆØ¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø¨Ø¯ÙˆÙ† Ø¨Ø§Ù‚Ø© ÙˆØ¨Ø¯ÙˆÙ† Ø£ÙŠØ§Ù….",
    });
  }

  if (action === "toggle-service-access") {
    const schoolAccountId = String(payload?.schoolAccountId || "").trim();
    const serviceId = String(payload?.serviceId || "").trim();
    const isEnabled = Boolean(payload?.isEnabled);
    const isPaid = Boolean(payload?.isPaid);

    if (!schoolAccountId || !serviceId) {
      return NextResponse.json(
        { error: "Ø§Ø®ØªØ± Ø§Ù„Ø­Ø³Ø§Ø¨ ÙˆØ§Ù„Ø®Ø¯Ù…Ø©." },
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
      message: "ØªÙ… ØªØ­Ø¯ÙŠØ« ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ø®Ø¯Ù…Ø© Ù„Ù„Ø­Ø³Ø§Ø¨.",
    });
  }

  return NextResponse.json(
    { error: "Ø¥Ø¬Ø±Ø§Ø¡ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ." },
    { status: 400 }
  );
}




