import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
} from "lucide-react";

type AttentionReminder = {
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

type DashboardAttentionPanelProps = {
  reminders: AttentionReminder[];
};

function formatDateTime(value: Date | string) {
  try {
    return new Date(value).toLocaleString("ar-SA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function getReminderState(reminder: AttentionReminder) {
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
      className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    };
  }

  return {
    label: "قادم",
    icon: <CalendarDays className="h-4 w-4" />,
    className: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  };
}

function getLinkLabel(reminder: AttentionReminder) {
  if (reminder.linkType === "SERVICE" && reminder.service) {
    return `خدمة: ${reminder.service.name}`;
  }

  if (reminder.linkType === "CASE" && reminder.caseEntry) {
    return `حالة: ${reminder.caseEntry.title || "بدون عنوان"}`;
  }

  if (reminder.linkType === "STUDENT" && reminder.student) {
    return `طالب: ${reminder.student.fullName}`;
  }

  return "تنبيه عام";
}

function getLinkHref(reminder: AttentionReminder) {
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

function getPriorityLabel(priority: string) {
  if (priority === "URGENT") return "عاجل";
  if (priority === "IMPORTANT") return "مهم";
  return "عادي";
}

export function DashboardAttentionPanel({
  reminders,
}: DashboardAttentionPanelProps) {
  return (
    <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
              <Bell className="h-4 w-4" />
              ما يحتاج انتباهك الآن
            </span>

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
              {reminders.length} تنبيهات
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            ابدأ من هنا
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
            أهم التنبيهات فقط. افتح التقويم لرؤية كل المواعيد والتنبيهات.
          </p>
        </div>

        <Link
          href="/dashboard/calendar"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
        >
          <CalendarDays className="h-4 w-4" />
          فتح التقويم
        </Link>
      </div>

      {reminders.length ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {reminders.map((reminder) => {
            const state = getReminderState(reminder);
            const href = getLinkHref(reminder);

            return (
              <article
                key={reminder.id}
                className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black",
                      state.className,
                    ].join(" ")}
                  >
                    {state.icon}
                    {state.label}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                    {getPriorityLabel(reminder.priority)}
                  </span>
                </div>

                <h3 className="mt-3 line-clamp-2 text-lg font-black leading-7 text-slate-950">
                  {reminder.title}
                </h3>

                <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
                  {formatDateTime(reminder.scheduledAt)}
                </p>

                <p className="mt-2 line-clamp-1 text-xs font-black text-slate-400">
                  {getLinkLabel(reminder)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-sky-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      فتح
                    </Link>
                  ) : null}

                  <Link
                    href="/dashboard/calendar"
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-sky-800"
                  >
                    التفاصيل
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 ring-1 ring-slate-100">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <h3 className="mt-3 text-lg font-black text-slate-800">
            لا يوجد شيء عاجل الآن
          </h3>

          <p className="mt-1 text-sm font-bold text-slate-500">
            عند إضافة تنبيهات قريبة ستظهر هنا تلقائيًا.
          </p>
        </div>
      )}
    </section>
  );
}
