import { prisma } from "@/lib/prisma";

export const DEFAULT_PLATFORM_SERVICES = [
  {
    slug: "counselor-reference-library",
    name: "مكتبة الموجه الطلابي",
    description:
      "مكتبة معرفية للموجه الطلابي تتيح استعراض الحقائب والأدلة والملفات وقراءتها أو تحميلها حسب الصلاحيات.",
  },
  {
    slug: "custom-report",
    name: "التقرير المخصص",
    description: "إنشاء تقارير مخصصة ومرنة حسب احتياج المدرسة.",
  },
  {
    slug: "assessment-center",
    name: "مركز التحليل والاختبارات",
    description: "تحليل نتائج الطلاب والاختبارات، وربطها بالتدخلات والخطط الذكية.",
  },
  {
    slug: "surveys",
    name: "الاستبيانات",
    description: "إنشاء الاستبيانات ونشرها وتحليل ردود المستفيدين.",
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
