export const PROJECT_STATUS_LABELS: Record<
  string,
  string
> = {
  DRAFT: "مسودة",
  READY: "جاهز",
  GENERATED: "تم الإنشاء",
  APPROVED: "معتمد",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

export const PROJECT_STATUS_TONES: Record<
  string,
  string
> = {
  DRAFT:
    "border-amber-200 bg-amber-50 text-amber-700",

  READY:
    "border-teal-200 bg-teal-50 text-teal-700",

  GENERATED:
    "border-sky-200 bg-sky-50 text-sky-700",

  APPROVED:
    "border-teal-200 bg-teal-50 text-teal-700",

  PUBLISHED:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  ARCHIVED:
    "border-slate-200 bg-slate-100 text-slate-500",
};

export const SCHEDULE_STATUS_LABELS: Record<
  string,
  string
> = {
  GENERATED: "تم الإنشاء",
  APPROVED: "معتمد",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

export function formatScheduleDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "ar-EG",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}
