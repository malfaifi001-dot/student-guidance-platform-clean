export const ACTIVITY_LEADER_REPORT_TEMPLATE_KIND =
  "ACTIVITY_LEADER_REPORT_TEMPLATE" as const;

export type ActivityLeaderReportTemplateId =
  | "activity-execution-card"
  | "activity-evidence-report"
  | "activity-domain-report"
  | "activity-annual-summary";

export type ActivityLeaderReportTemplateStatus = "READY" | "PLANNED";

export type ActivityLeaderReportTemplateConfig = {
  id: ActivityLeaderReportTemplateId;
  name: string;
  shortName: string;
  description: string;
  category: string;
  reportKind:
    | "ACTIVITY_CARD"
    | "EVIDENCE_REPORT"
    | "DOMAIN_REPORT"
    | "ANNUAL_SUMMARY";
  defaultSortOrder: number;
  defaultEnabled: boolean;
  status: ActivityLeaderReportTemplateStatus;
  serviceSlug: string;
  requiredCaseValues: string[];
  outputRoute?: string;
};

export const activityLeaderReportTemplates: ActivityLeaderReportTemplateConfig[] =
  [
    {
      id: "activity-execution-card",
      name: "بطاقة تنفيذ برنامج نشاط طلابي",
      shortName: "بطاقة تنفيذ نشاط",
      description:
        "تقرير A4 مفرد يسحب بيانات النشاط المعتمد، اسم المعلم، توقيع المعلم، المجال، والشواهد المرتبطة بالحالة.",
      category: "تقارير التنفيذ",
      reportKind: "ACTIVITY_CARD",
      defaultSortOrder: 10,
      defaultEnabled: true,
      status: "READY",
      serviceSlug: "activity-programs",
      requiredCaseValues: [
        "activity_domain",
        "assigned_teacher_name",
        "assigned_teacher_signature_url",
      ],
      outputRoute: "/dashboard/activity-leader/reports/activity-card",
    },
    {
      id: "activity-evidence-report",
      name: "تقرير شواهد نشاط",
      shortName: "تقرير الشواهد",
      description:
        "تقرير مخصص لعرض شواهد النشاط فقط مع تقسيمها على صفحات A4 عند كثرتها.",
      category: "الشواهد",
      reportKind: "EVIDENCE_REPORT",
      defaultSortOrder: 20,
      defaultEnabled: false,
      status: "PLANNED",
      serviceSlug: "activity-programs",
      requiredCaseValues: ["activity_domain"],
    },
    {
      id: "activity-domain-report",
      name: "تقرير مجال نشاط",
      shortName: "تقرير مجال",
      description:
        "يجمع الأنشطة المعتمدة داخل مجال محدد مثل العلوم والتقنية أو الرياضة والصحة.",
      category: "تقارير المجالات",
      reportKind: "DOMAIN_REPORT",
      defaultSortOrder: 30,
      defaultEnabled: false,
      status: "PLANNED",
      serviceSlug: "activity-programs",
      requiredCaseValues: ["activity_domain"],
    },
    {
      id: "activity-annual-summary",
      name: "التقرير السنوي الشامل لريادة النشاط",
      shortName: "التقرير السنوي",
      description:
        "تقرير شامل يجمع المجالات والأنشطة والشواهد والإحصاءات في نهاية العام.",
      category: "التقارير الشاملة",
      reportKind: "ANNUAL_SUMMARY",
      defaultSortOrder: 40,
      defaultEnabled: false,
      status: "PLANNED",
      serviceSlug: "activity-programs",
      requiredCaseValues: ["activity_domain"],
    },
  ];

export function getActivityLeaderReportTemplateConfig(
  templateId: string,
) {
  return activityLeaderReportTemplates.find(
    (template) => template.id === templateId,
  );
}

export function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function isActivityLeaderReportTemplateJson(value: unknown) {
  const json = parseJsonRecord(value);

  return json.kind === ACTIVITY_LEADER_REPORT_TEMPLATE_KIND;
}

export function getActivityLeaderTemplateIdFromJson(value: unknown) {
  const json = parseJsonRecord(value);
  const activityLeader = parseJsonRecord(json.activityLeader);

  return String(activityLeader.templateId || json.activityReportTemplateId || "");
}

export function getActivityLeaderTemplateSortOrder(
  value: unknown,
  fallback: number,
) {
  const json = parseJsonRecord(value);
  const activityLeader = parseJsonRecord(json.activityLeader);
  const sortOrder = Number(activityLeader.sortOrder ?? json.sortOrder);

  return Number.isFinite(sortOrder) ? sortOrder : fallback;
}

export function buildActivityLeaderReportTemplateJson(
  config: ActivityLeaderReportTemplateConfig,
  options?: {
    isActive?: boolean;
    sortOrder?: number;
  },
) {
  const isActive = options?.isActive ?? config.defaultEnabled;
  const sortOrder = options?.sortOrder ?? config.defaultSortOrder;

  return {
    id: config.id,
    kind: ACTIVITY_LEADER_REPORT_TEMPLATE_KIND,
    name: config.name,
    description: config.description,
    status: isActive ? "PUBLISHED" : "ARCHIVED",
    scope: "SERVICE",
    serviceSlug: config.serviceSlug,
    documentType: "REPORT",
    activityReportTemplateId: config.id,
    activityLeader: {
      version: 1,
      templateId: config.id,
      reportKind: config.reportKind,
      category: config.category,
      sortOrder,
      enabled: isActive,
      status: config.status,
      requiredCaseValues: config.requiredCaseValues,
      outputRoute: config.outputRoute || null,
    },
  };
}