import { prisma } from "../lib/prisma";

async function main() {
  const email = "counselr@test.test";
  const serviceSlug = "guardian-summons";

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      schoolAccountId: true,
      schoolAccount: {
        select: {
          id: true,
          name: true,
          isActive: true,
          subscription: {
            select: {
              id: true,
              status: true,
              startsAt: true,
              endsAt: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  features: {
                    where: {
                      OR: [
                        { key: `service:${serviceSlug}` },
                        { key: "durationDays" },
                        { key: "targetAudience" },
                      ],
                    },
                    select: {
                      key: true,
                      label: true,
                      value: true,
                    },
                  },
                },
              },
            },
          },
          services: {
            where: {
              service: {
                slug: serviceSlug,
              },
            },
            select: {
              isEnabled: true,
              isPaid: true,
              service: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const service = await prisma.service.findUnique({
    where: { slug: serviceSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
    },
  });

  console.dir(
    {
      checkedAt: new Date().toISOString(),
      user,
      service,
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