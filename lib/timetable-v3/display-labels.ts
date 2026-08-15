const STATUS_LABELS: Readonly<Record<string, string>> = {
  GENERATED: "تم الإنشاء",
  ACTIVE: "نشط",
  APPROVED: "معتمد",
  PUBLISHED: "منشور",
  DRAFT: "مسودة",
  ARCHIVED: "مؤرشف",
  INACTIVE: "غير نشط",
  PENDING: "قيد الانتظار",
  FAILED: "فشل الإنشاء",
};

export function timetableV3StatusLabel(status: string) {
  return STATUS_LABELS[status.toUpperCase()] ?? "غير محدد";
}
