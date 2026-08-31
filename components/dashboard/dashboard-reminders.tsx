import Link from "next/link";

export type DashboardReminder = {
  title: string;
  helper: string;
};

export function DashboardReminders({
  reminders,
  href = "/dashboard/calendar",
}: {
  reminders: DashboardReminder[];
  href?: string;
}) {
  if (reminders.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-slate-900 dark:text-white">
          مهام قريبة
        </h2>
        <Link href={href} className="text-xs font-black text-sky-700 hover:underline dark:text-sky-300">
          فتح التقويم
        </Link>
      </div>
      <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
        {reminders.map((reminder) => (
          <div key={`${reminder.title}-${reminder.helper}`} className="py-2 first:pt-0 last:pb-0">
            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
              {reminder.title}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {reminder.helper}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
