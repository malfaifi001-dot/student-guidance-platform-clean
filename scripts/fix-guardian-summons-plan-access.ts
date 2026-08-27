import { prisma } from "../lib/prisma";
import { syncSchoolServicesFromPlan } from "../lib/subscription/subscription-service";

async function main() {
  const userEmail = "counselr@test.test";
  const planSlug = "fjmonthly";
  const serviceSlug = "guardian-summons";
  const featureKey = `service:${serviceSlug}`;

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: {
      id: true,
      schoolAccountId: true,
    },
  });

  if (!user?.schoolAccountId) {
    throw new Error("المستخدم غير مرتبط بحساب مدرسة.");
  }

  const plan = await prisma.plan.findUnique({
    where: { slug: planSlug },
    select: {
      id: true,
      name: true,
    },
  });

  if (!plan) {
    throw new Error("الباقة غير موجودة.");
  }

  const service = await prisma.service.findUnique({
    where: { slug: serviceSlug },
    select: {
      id: true,
      name: true,
    },
  });

  if (!service) {
    throw new Error("الخدمة غير موجودة.");
  }

  const existingFeature = await prisma.planFeature.findFirst({
    where: {
      planId: plan.id,
      key: featureKey,
    },
  });

  if (existingFeature) {
    await prisma.planFeature.update({
      where: {
        id: existingFeature.id,
      },
      data: {
        label: `خدمة: ${serviceSlug}`,
        value: "enabled",
      },
    });
  } else {
    await prisma.planFeature.create({
      data: {
        planId: plan.id,
        key: featureKey,
        label: `خدمة: ${serviceSlug}`,
        value: "enabled",
      },
    });
  }

  const syncResult = await syncSchoolServicesFromPlan({
    schoolAccountId: user.schoolAccountId,
    userId: user.id,
    planId: plan.id,
  });

  const access = await prisma.serviceAccess.findUnique({
    where: {
      userId_serviceId: {
        userId: user.id,
        serviceId: service.id,
      },
    },
    select: {
      isEnabled: true,
      isPaid: true,
    },
  });

  console.dir(
    {
      plan: plan.name,
      service: service.name,
      featureKey,
      syncResult,
      access,
    },
    { depth: null },
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
