export const ACTIVITY_PROGRAM_SERVICE_SLUG = "activity-programs";

export const ACTIVITY_PROGRAM_DOMAINS = [
  {
    slug: "citizenship-life",
    serviceSlug: "activity-programs-citizenship-life",
    title: "المواطنة والحياة",
    shortLabel: "المواطنة",
    description: "برامج تعزز الانتماء، المسؤولية، القيم، والوعي بالحياة اليومية.",
  },
  {
    slug: "science-technology",
    serviceSlug: "activity-programs-science-technology",
    title: "العلوم والتقنية",
    shortLabel: "العلوم",
    description: "برامج الابتكار، التقنية، البحث، والتطبيقات العلمية.",
  },
  {
    slug: "culture-arts",
    serviceSlug: "activity-programs-culture-arts",
    title: "الثقافة والفنون",
    shortLabel: "الثقافة",
    description: "برامج الثقافة، الفنون، الإلقاء، المسرح، والمهارات الإبداعية.",
  },
  {
    slug: "sports-health",
    serviceSlug: "activity-programs-sports-health",
    title: "الرياضة والصحة",
    shortLabel: "الرياضة",
    description: "برامج اللياقة، الصحة، المنافسات، ونمط الحياة المتوازن.",
  },
  {
    slug: "scouting",
    serviceSlug: "activity-programs-scouting",
    title: "النشاط الكشفي",
    shortLabel: "الكشفي",
    description: "برامج الخدمة، الانضباط، المهارات الكشفية، والعمل الجماعي.",
  },
  {
    slug: "events-occasions",
    serviceSlug: "activity-programs-events-occasions",
    title: "الأيام والمناسبات",
    shortLabel: "المناسبات",
    description: "برامج الأيام العالمية، المناسبات الوطنية، والفعاليات الموسمية.",
  },
  {
    slug: "non-class-periods",
    serviceSlug: "activity-programs-non-class-periods",
    title: "الفترات اللاصفية",
    shortLabel: "اللاصفية",
    description: "برامج حصص النشاط والفترات اللاصفية داخل المدرسة.",
  },
  {
    slug: "school-broadcast",
    serviceSlug: "activity-programs-school-broadcast",
    title: "الإذاعة المدرسية",
    shortLabel: "الإذاعة المدرسية",
    description: "برامج الإذاعة المدرسية وتنظيم فقراتها ومشاركاتها الطلابية.",
  },
] as const;

export type ActivityProgramDomain = (typeof ACTIVITY_PROGRAM_DOMAINS)[number];

export const ACTIVITY_PROGRAM_PARENT_SERVICE = {
  slug: ACTIVITY_PROGRAM_SERVICE_SLUG,
  title: "برامج النشاط",
  description: "إدارة برامج النشاط المدرسي، بطاقات التنفيذ، الشواهد، والتقارير.",
  href: "/dashboard/activity-leader/programs",
  kind: "standalone" as const,
};

export const ACTIVITY_PROGRAM_WORKFLOW_SERVICES = ACTIVITY_PROGRAM_DOMAINS.map(
  (domain) => ({
    slug: domain.serviceSlug,
    title: `برامج النشاط - ${domain.title}`,
    description: domain.description,
    href: `/dashboard/activity-leader/programs/${domain.slug}`,
    kind: "workflow" as const,
  }),
);

export const ACTIVITY_PROGRAM_DOMAIN_SERVICE_SLUGS = ACTIVITY_PROGRAM_DOMAINS.map(
  (domain) => domain.serviceSlug,
);

export function getActivityProgramDomainBySlug(slug: string) {
  return ACTIVITY_PROGRAM_DOMAINS.find((domain) => domain.slug === slug) || null;
}

export function getActivityProgramDomainByServiceSlug(serviceSlug: string) {
  return ACTIVITY_PROGRAM_DOMAINS.find((domain) => domain.serviceSlug === serviceSlug) || null;
}

export function isActivityProgramDomainServiceSlug(serviceSlug: string) {
  return ACTIVITY_PROGRAM_DOMAIN_SERVICE_SLUGS.includes(
    serviceSlug as (typeof ACTIVITY_PROGRAM_DOMAIN_SERVICE_SLUGS)[number],
  );
}

export function getActivityProgramsBillingServiceSlug(serviceSlug: string) {
  return isActivityProgramDomainServiceSlug(serviceSlug)
    ? ACTIVITY_PROGRAM_SERVICE_SLUG
    : serviceSlug;
}

export function getActivityProgramsBillingServiceSlugs(serviceSlugs: string[]) {
  return Array.from(
    new Set(
      serviceSlugs
        .map((serviceSlug) => String(serviceSlug || "").trim())
        .filter(Boolean)
        .map(getActivityProgramsBillingServiceSlug),
    ),
  );
}
