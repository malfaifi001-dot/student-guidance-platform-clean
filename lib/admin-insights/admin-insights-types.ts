export const ADMIN_INSIGHT_METRICS = [
  "cases",
  "reports",
  "evidence",
  "users",
  "subscriptions",
  "accounts",
] as const;

export type AdminInsightMetric = (typeof ADMIN_INSIGHT_METRICS)[number];

export type AdminInsightRow = {
  label: string;
  value: number;
  detail?: string;
};

export type AdminInsightData = {
  metric: AdminInsightMetric;
  title: string;
  description: string;
  total: number;
  rows: AdminInsightRow[];
};
