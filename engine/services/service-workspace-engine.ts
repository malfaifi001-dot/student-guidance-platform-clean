import { prisma } from "@/lib/prisma";

export async function ensureServiceBySlug(params: {
  slug: string;
  name: string;
  description?: string;
}) {
  return prisma.service.upsert({
    where: {
      slug: params.slug,
    },
    update: {
      name: params.name,
      description: params.description,
    },
    create: {
      slug: params.slug,
      name: params.name,
      description: params.description,
      status: "ACTIVE",
    },
  });
}

export async function getServiceWorkspace(params: {
  slug: string;
  name: string;
  description?: string;
}) {
  const service = await ensureServiceBySlug(params);

  const [totalCases, draftCases, submittedCases, latestCases] =
    await Promise.all([
      prisma.caseEntry.count({
        where: {
          serviceId: service.id,
        },
      }),
      prisma.caseEntry.count({
        where: {
          serviceId: service.id,
          status: "DRAFT",
        },
      }),
      prisma.caseEntry.count({
        where: {
          serviceId: service.id,
          status: "SUBMITTED",
        },
      }),
      prisma.caseEntry.findMany({
        where: {
          serviceId: service.id,
        },
        include: {
          student: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      }),
    ]);

  return {
    service,
    stats: {
      totalCases,
      draftCases,
      submittedCases,
    },
    latestCases,
  };
}