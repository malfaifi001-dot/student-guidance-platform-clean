import { prisma } from "@/lib/prisma";
import { ACTIVITY_PROGRAM_PARENT_SERVICE } from "@/lib/activity-programs/activity-program-catalog";
import { PRINCIPAL_PERFORMANCE_WORKFLOW_SERVICES } from "@/lib/principal/performance-items";
import { PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES } from "@/lib/principal/evaluation-accreditation-services";
import { STUDENT_ACTIVITY_PLAN_SERVICE } from "@/lib/activity-plan/activity-plan-service";
import { SCHOOL_ACTIVITY_TEAM_SERVICE } from "@/lib/activity-team/activity-team-config";

export const DEFAULT_PLATFORM_SERVICES = [
  {
    slug: STUDENT_ACTIVITY_PLAN_SERVICE.slug,
    name: STUDENT_ACTIVITY_PLAN_SERVICE.title,
    description: STUDENT_ACTIVITY_PLAN_SERVICE.description,
  },
  {
    slug: SCHOOL_ACTIVITY_TEAM_SERVICE.slug,
    name: SCHOOL_ACTIVITY_TEAM_SERVICE.title,
    description: SCHOOL_ACTIVITY_TEAM_SERVICE.description,
  },
  {
    slug: "curriculum-distribution",
    name: "توزيع المنهج",
    description: "استعراض توزيع الوحدات والدروس للمعلمين.",
  },
  {
    slug: ACTIVITY_PROGRAM_PARENT_SERVICE.slug,
    name: ACTIVITY_PROGRAM_PARENT_SERVICE.title,
    description: ACTIVITY_PROGRAM_PARENT_SERVICE.description,
  },
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
  ...PRINCIPAL_PERFORMANCE_WORKFLOW_SERVICES.map((service) => ({
    slug: service.slug,
    name: service.title,
    description: service.description,
  })),
  ...PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES.map((service) => ({
    slug: service.serviceSlug,
    name: service.title,
    description: service.description,
  })),
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
