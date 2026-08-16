export const ANALYTICS_ROLES = [
  "ADMIN",
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
  "PRINCIPAL",
  "SCHOOL_OWNER",
  "STAFF",
] as const;

export type AnalyticsRole = (typeof ANALYTICS_ROLES)[number];

export type AnalyticsParamValue = string | number | boolean;

export type AnalyticsEventParams = Readonly<
  Partial<{
    role: AnalyticsRole;
    method: "email" | "phone" | "password" | "free" | "unknown";
    feature: string;
    source: string;
    result: string;
    row_count_bucket: "0" | "1_10" | "11_50" | "51_200" | "201_plus";
    service_slug: string;
    workflow_type: string;
    report_type: string;
    template_type: string;
    export_format: "pdf" | "excel" | "csv" | "print" | "other";
    activity_domain_slug: string;
    status: string;
    plan_slug: string;
    activation_method: "free" | "online" | "bank_transfer" | "other";
    intervention_target_type: string;
    reason: "validation" | "network" | "permission" | "unknown";
  }>
>;
