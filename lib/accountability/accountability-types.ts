export const ACCOUNTABILITY_SERVICE = {
  slug: "accountability-statements",
  title: "متابعة المعلمين",
  description: "إنشاء ومتابعة الإفادات والمساءلات الإدارية للمعلمين والموظفين.",
  href: "/dashboard/principal/accountability",
  kind: "workflow",
} as const;

export const ACCOUNTABILITY_REQUEST_STATUSES = [
  "DRAFT",
  "SENT",
  "OPENED",
  "RESPONDED",
  "NEEDS_COMPLETION",
  "CLOSED",
  "REFERRED",
  "EXPIRED",
  "CANCELED",
] as const;

export type AccountabilityRequestStatus =
  (typeof ACCOUNTABILITY_REQUEST_STATUSES)[number];

export const ACCOUNTABILITY_DELIVERY_METHODS = ["SYSTEM", "WHATSAPP"] as const;
export type AccountabilityDeliveryMethod =
  (typeof ACCOUNTABILITY_DELIVERY_METHODS)[number];

export const ACCOUNTABILITY_STATUS_TRANSITIONS: Record<
  AccountabilityRequestStatus,
  readonly AccountabilityRequestStatus[]
> = {
  DRAFT: ["SENT", "CANCELED"],
  SENT: ["OPENED", "RESPONDED", "EXPIRED", "CANCELED"],
  OPENED: ["RESPONDED", "EXPIRED", "CANCELED"],
  RESPONDED: ["NEEDS_COMPLETION", "CLOSED", "REFERRED", "CANCELED"],
  NEEDS_COMPLETION: ["RESPONDED", "EXPIRED", "CANCELED"],
  CLOSED: [],
  REFERRED: [],
  EXPIRED: [],
  CANCELED: [],
};

export function isAccountabilityRequestStatus(
  value: unknown,
): value is AccountabilityRequestStatus {
  return (
    typeof value === "string" &&
    (ACCOUNTABILITY_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

export function canTransitionAccountabilityRequest(
  from: AccountabilityRequestStatus,
  to: AccountabilityRequestStatus,
) {
  return ACCOUNTABILITY_STATUS_TRANSITIONS[from].includes(to);
}

export type AccountabilityValues = Record<string, unknown>;

export type AccountabilityRequestRecipient = {
  respondentUserId?: string | null;
  respondentName: string;
  respondentPhone?: string | null;
  respondentEmail?: string | null;
  respondentJobTitle?: string | null;
};
