const labels: Record<string, string> = {
  DRAFT: "مسودة",
  SENT: "بانتظار الرد",
  OPENED: "تم الفتح",
  RESPONDED: "وردت الإفادة",
  NEEDS_COMPLETION: "تحتاج استكمال",
  CLOSED: "مغلقة",
  REFERRED: "محالة",
  EXPIRED: "منتهية",
  CANCELED: "ملغاة",
};

export function AccountabilityStatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
      {labels[status] || status}
    </span>
  );
}
