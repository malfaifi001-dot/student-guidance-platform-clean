import { prisma } from "@/lib/prisma";

export type DefaultPlatformService = {
  slug: string;
  name: string;
  description: string;
};

export const DEFAULT_PLATFORM_SERVICES: DefaultPlatformService[] = [
  {
    slug: "guidance-programs",
    name: "البرامج الإرشادية",
    description: "إدارة البرامج الإرشادية وخطط التنفيذ والمتابعة.",
  },
  {
    slug: "committees-meetings",
    name: "اللجان والاجتماعات",
    description: "تنظيم اللجان والاجتماعات ومحاضرها داخل المدرسة.",
  },
  {
    slug: "student-follow-up",
    name: "متابعة الطالب",
    description: "متابعة الحالات والطلاب وخطط المتابعة الإرشادية.",
  },
  {
    slug: "student-guidance-services",
    name: "الخدمات الإرشادية",
    description: "إدارة النماذج والخدمات الإرشادية المقدمة للطلاب.",
  },
  {
    slug: "reports",
    name: "التقارير",
    description: "إنشاء وإدارة التقارير الرسمية والتقارير المخصصة.",
  },
  {
    slug: "comprehensive-reference",
    name: "المرجع الشامل للموجه",
    description: "مرجع شامل للموجه/الموجهة داخل لوحة التحكم.",
  },
  {
    slug: "student-comprehensive-reference",
    name: "المرجع الشامل للطالب",
    description: "مكتبة مرجعية مخصصة للطالب/الطالبة يمكن ربطها لاحقًا بواجهة الطالب.",
  },
  {
    slug: "results-analysis",
    name: "تحليل النتائج",
    description: "تحليل نتائج الطلاب واستخراج المؤشرات الداعمة للإرشاد.",
  },
  {
    slug: "family-school-communication",
    name: "التواصل بين الأسرة والمدرسة",
    description: "إدارة تواصل المدرسة مع الأسرة والمتابعة ذات العلاقة.",
  },
  {
    slug: "student-import",
    name: "استيراد الطلاب",
    description: "استيراد بيانات الطلاب وربطها بخدمات المنصة.",
  },
  {
    slug: "cases",
    name: "الحالات",
    description: "إدارة الحالات الإرشادية ومتابعتها.",
  },
  {
    slug: "calendar",
    name: "التقويم",
    description: "تنظيم المواعيد والمهام والأحداث المرتبطة بالإرشاد.",
  },
];

export async function ensureDefaultPlatformServices() {
  for (const service of DEFAULT_PLATFORM_SERVICES) {
    await prisma.service.upsert({
      where: {
        slug: service.slug,
      },
      update: {
        name: service.name,
        description: service.description,
      },
      create: {
        slug: service.slug,
        name: service.name,
        description: service.description,
      },
    });
  }
}