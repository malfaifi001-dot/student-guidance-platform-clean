import { prisma } from "@/lib/prisma";

export const DEFAULT_PLATFORM_SERVICES = [
  {
    slug: "student-comprehensive-reference",
    name: "المرجع الشامل للطالب",
    description: "مكتبة مرجعية مخصصة للطالب/الطالبة يمكن ربطها لاحقًا بواجهة الطالب.",
  },
] as const;

export async function ensureDefaultPlatformServices() {
  for (const service of DEFAULT_PLATFORM_SERVICES) {
    await prisma.service.upsert({
      where: {
        slug: service.slug,
      },
      update: {
        name: service.name,
        description: service.description,
        status: "ACTIVE",
      },
      create: {
        slug: service.slug,
        name: service.name,
        description: service.description,
        status: "ACTIVE",
      },
    });
  }
}
