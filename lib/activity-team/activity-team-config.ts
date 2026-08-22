export const SCHOOL_ACTIVITY_TEAM_SERVICE = {
  slug: "school-activity-team",
  title: "فريق النشاط الطلابي بالمدرسة",
  description: "تحديد مشرفي مجالات النشاط الطلابي وحفظها في نموذج رسمي قابل للمعاينة والطباعة.",
  href: "/dashboard/activity-leader/activity-team",
  kind: "standalone" as const,
};

export const SCHOOL_ACTIVITY_TEAM_FIELDS = [
  { key: "citizenship-life", label: "المواطنة والحياة" },
  { key: "science-technology", label: "العلوم والتقنية" },
  { key: "culture-arts", label: "الثقافة والفنون" },
  { key: "sports-health", label: "الرياضة والصحة" },
  { key: "scouting", label: "النشاط الكشفي" },
  { key: "events-occasions", label: "الأيام والمناسبات" },
] as const;
