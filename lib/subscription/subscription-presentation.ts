const DAY_IN_MS = 24 * 60 * 60 * 1000;

type SubscriptionPresentationInput = {
  status?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  planSlug?: string | null;
  durationDays?: number | null;
};

function toDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isFreeSubscriptionPlan(planSlug?: string | null) {
  return planSlug === "default-free-auto";
}

export function formatSubscriptionRemainingTime(
  input: SubscriptionPresentationInput,
  now = new Date(),
) {
  const endsAt = toDate(input.endsAt);
  const inactive = ["CANCELED", "EXPIRED", "PAST_DUE"].includes(
    input.status || "",
  );

  if (inactive) return "انتهى التفعيل";
  if (!endsAt) return "مدة التفعيل غير محددة";

  const difference = endsAt.getTime() - now.getTime();
  if (difference <= 0) return "انتهى التفعيل";

  if (
    endsAt.getFullYear() === now.getFullYear() &&
    endsAt.getMonth() === now.getMonth() &&
    endsAt.getDate() === now.getDate()
  ) {
    return "تنتهي اليوم";
  }

  const remainingDays = Math.ceil(difference / DAY_IN_MS);
  return remainingDays === 1
    ? "متبقي يوم واحد"
    : `متبقي ${remainingDays} يومًا`;
}

export function formatSubscriptionPeriod(input: SubscriptionPresentationInput) {
  if (isFreeSubscriptionPlan(input.planSlug)) {
    return formatSubscriptionRemainingTime(input);
  }

  const startsAt = toDate(input.startsAt);
  const endsAt = toDate(input.endsAt);
  const actualDurationDays =
    startsAt && endsAt
      ? Math.ceil((endsAt.getTime() - startsAt.getTime()) / DAY_IN_MS)
      : input.durationDays;

  return actualDurationDays && actualDurationDays >= 300
    ? "عام دراسي"
    : "فصل دراسي";
}

export function getSubscriptionSidebarPresentation(
  input:
    | (SubscriptionPresentationInput & { planName?: string | null })
    | null,
) {
  if (!input) {
    return {
      planName: "لا توجد باقة مفعلة",
      statusText: "اختر باقة للمتابعة",
    };
  }

  return {
    planName: input.planName || "لا توجد باقة مفعلة",
    statusText: formatSubscriptionPeriod(input),
  };
}

export function getSubscriptionPeriodLabel(cycle?: string | null) {
  const normalizedCycle = String(cycle || "").trim().toUpperCase();

  if (normalizedCycle === "YEARLY") return "عام دراسي";
  if (normalizedCycle === "MONTHLY") return "فصل دراسي";
  if (normalizedCycle === "CUSTOM") return "مدة مخصصة";

  return "—";
}

export function getBillingCycleLabel(cycle: "monthly" | "yearly") {
  return getSubscriptionPeriodLabel(cycle);
}
