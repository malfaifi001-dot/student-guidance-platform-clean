import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
} from "lucide-react";

export type DashboardAttentionMiniReminder = {
  id: string;
  title: string;
  note?: string | null;
  priority: string;
  scheduledAt: Date | string;
  linkType: string;
  service?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  caseEntry?: {
    id: string;
    title?: string | null;
    status: string;
    service?: {
      name: string;
      slug: string;
    } | null;
  } | null;
  student?: {
    id: string;
    fullName: string;
    grade?: string | null;
    classroom?: string | null;
  } | null;
};

type Props = {
  reminders?: DashboardAttentionMiniReminder[];
};

function priorityWeight(priority: string) {
  if (priority === "URGENT") return 0;
  if (priority === "IMPORTANT") return 1;
  return 2;
}

function sortReminders(items: DashboardAttentionMiniReminder[]) {
  return [...items].sort((a, b) => {
    const priorityDiff = priorityWeight(a.priority) - priorityWeight(b.priority);

    if (priorityDiff !== 0) return priorityDiff;

    return (
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  });
}

function formatDateTime(value: Date | string) {
  try {
    return new Date(value).toLocaleString("ar-SA", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function getPriorityMeta(priority: string) {
  if (priority === "URGENT") {
    return {
      label: "عاجل",
      className: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
      dotClassName: "bg-rose-500",
    };
  }

  if (priority === "IMPORTANT") {
    return {
      label: "مهم",
      className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      dotClassName: "bg-amber-500",
    };
  }

  return {
    label: "عادي",
    className: "bg-slate-50 text-slate-600 ring-1 ring-slate-100",
    dotClassName: "bg-slate-400",
  };
}

function getReminderState(reminder: DashboardAttentionMiniReminder) {
  const now = new Date();
  const date = new Date(reminder.scheduledAt);

  if (date < now) {
    return {
      label: "متأخر",
      icon: <AlertCircle className="h-4 w-4" />,
      className: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    };
  }

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return {
      label: "اليوم",
      icon: <Clock3 className="h-4 w-4" />,
      className: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    };
  }

  return {
    label: "قادم",
    icon: <CalendarDays className="h-4 w-4" />,
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  };
}

function getLinkLabel(reminder: DashboardAttentionMiniReminder) {
  if (reminder.linkType === "SERVICE" && reminder.service) {
    return reminder.service.name;
  }

  if (reminder.linkType === "CASE" && reminder.caseEntry) {
    return reminder.caseEntry.title || "حالة بدون عنوان";
  }

  if (reminder.linkType === "STUDENT" && reminder.student) {
    return reminder.student.fullName;
  }

  return "تنبيه عام";
}

function getLinkHref(reminder: DashboardAttentionMiniReminder) {
  if (reminder.linkType === "SERVICE" && reminder.service?.slug) {
    return `/dashboard/${reminder.service.slug}`;
  }

  if (reminder.linkType === "CASE" && reminder.caseEntry?.id) {
    return `/dashboard/cases/${reminder.caseEntry.id}`;
  }

  if (reminder.linkType === "STUDENT" && reminder.student?.id) {
    return `/dashboard/comprehensive-reference?studentId=${encodeURIComponent(
      reminder.student.id,
    )}`;
  }

  return "";
}

export function DashboardAttentionMiniCard({ reminders = [] }: Props) {
  const shownReminders = sortReminders(reminders).slice(0, 12);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          <Bell className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black text-sky-700">
            التقويم والتنبيهات
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            اقتراحات الآن
          </h2>

          <p className="mt-1 text-sm font-bold text-slate-500">
            الأهم أولًا.
          </p>
        </div>
      </div>

      {shownReminders.length ? (
        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pl-1 pr-0">
          {shownReminders.map((reminder) => {
            const state = getReminderState(reminder);
            const priority = getPriorityMeta(reminder.priority);
            const href = getLinkHref(reminder);

            return (
              <article
                key={reminder.id}
                className="rounded-[1.4rem] bg-slate-50 p-4 ring-1 ring-slate-100"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black",
                      priority.className,
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        priority.dotClassName,
                      ].join(" ")}
                    />
                    {priority.label}
                  </span>

                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black",
                      state.className,
                    ].join(" ")}
                  >
                    {state.icon}
                    {state.label}
                  </span>
                </div>

                <h3 className="mt-3 line-clamp-2 text-sm font-black leading-7 text-slate-950">
                  {reminder.title}
                </h3>

                <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                  {formatDateTime(reminder.scheduledAt)}
                </p>

                <p className="mt-1 line-clamp-1 text-xs font-black text-slate-400">
                  {getLinkLabel(reminder)}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-sky-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      فتح
                    </Link>
                  ) : null}

                  <Link
                    href="/dashboard/calendar"
                    className="rounded-xl bg-sky-700 px-3 py-2 text-[11px] font-black text-white transition hover:bg-sky-800"
                  >
                    التقويم
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 ring-1 ring-slate-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <h3 className="mt-3 text-base font-black text-slate-800">
              لا يوجد شيء عاجل الآن
            </h3>

            <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
              ستظهر التنبيهات هنا.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
