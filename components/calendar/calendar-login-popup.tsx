"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  X,
} from "lucide-react";

type DueReminder = {
  id: string;
  title: string;
  note?: string | null;
  priority: "NORMAL" | "IMPORTANT" | "URGENT";
  linkType: "GENERAL" | "SERVICE" | "CASE" | "STUDENT";
  scheduledAt: string;
  showAt: string;
  isLate: boolean;
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

const SESSION_DISMISSED_KEY = "calendar-login-popup-v2-dismissed";
const SNOOZE_UNTIL_KEY = "calendar-login-popup-v2-snooze-until";

function priorityWeight(priority: DueReminder["priority"]) {
  if (priority === "URGENT") return 0;
  if (priority === "IMPORTANT") return 1;
  return 2;
}

function sortReminders(items: DueReminder[]) {
  return [...items].sort((a, b) => {
    const priorityDiff = priorityWeight(a.priority) - priorityWeight(b.priority);

    if (priorityDiff !== 0) return priorityDiff;

    return (
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  });
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("ar-SA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function getPriorityMeta(priority: DueReminder["priority"]) {
  if (priority === "URGENT") {
    return {
      label: "عاجل",
      icon: <AlertCircle className="h-4 w-4" />,
      badgeClassName: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
      cardClassName: "border-rose-100 bg-rose-50/45",
      dotClassName: "bg-rose-500",
    };
  }

  if (priority === "IMPORTANT") {
    return {
      label: "مهم",
      icon: <Bell className="h-4 w-4" />,
      badgeClassName: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      cardClassName: "border-amber-100 bg-amber-50/45",
      dotClassName: "bg-amber-500",
    };
  }

  return {
    label: "عادي",
    icon: <Clock3 className="h-4 w-4" />,
    badgeClassName: "bg-slate-50 text-slate-600 ring-1 ring-slate-100",
    cardClassName: "border-slate-100 bg-slate-50",
    dotClassName: "bg-slate-400",
  };
}

function getLinkLabel(reminder: DueReminder) {
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

function getLinkHref(reminder: DueReminder) {
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

function canShowPopupNow() {
  if (typeof window === "undefined") return false;

  if (window.sessionStorage.getItem(SESSION_DISMISSED_KEY) === "true") {
    return false;
  }

  const snoozeUntil = Number(
    window.localStorage.getItem(SNOOZE_UNTIL_KEY) || "0",
  );

  if (Number.isFinite(snoozeUntil) && snoozeUntil > Date.now()) {
    return false;
  }

  return true;
}

export function CalendarLoginPopup() {
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState<DueReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const sortedReminders = useMemo(() => sortReminders(reminders), [reminders]);

  const urgentCount = useMemo(
    () => reminders.filter((item) => item.priority === "URGENT").length,
    [reminders],
  );

  const importantCount = useMemo(
    () => reminders.filter((item) => item.priority === "IMPORTANT").length,
    [reminders],
  );

  useEffect(() => {
    let mounted = true;

    async function loadDueReminders() {
      try {
        if (!canShowPopupNow()) {
          setLoading(false);
          return;
        }

        const response = await fetch("/api/dashboard/calendar/due", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!mounted) return;

        const dueReminders = Array.isArray(data?.reminders)
          ? data.reminders
          : [];

        setReminders(dueReminders);
        setOpen(dueReminders.length > 0);
      } catch {
        if (mounted) {
          setReminders([]);
          setOpen(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDueReminders();

    return () => {
      mounted = false;
    };
  }, []);

  function closeForSession() {
    window.sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
    setOpen(false);
  }

  function snoozeThirtyMinutes() {
    const thirtyMinutes = 1000 * 60 * 30;

    window.localStorage.setItem(
      SNOOZE_UNTIL_KEY,
      String(Date.now() + thirtyMinutes),
    );

    setOpen(false);
  }

  async function completeReminder(reminderId: string) {
    const response = await fetch(`/api/dashboard/calendar/${reminderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "COMPLETED",
      }),
    });

    if (!response.ok) return;

    startTransition(() => {
      setReminders((items) => items.filter((item) => item.id !== reminderId));
    });
  }

  useEffect(() => {
    if (!open) return;

    if (reminders.length === 0 && !loading) {
      setOpen(false);
    }
  }, [open, reminders.length, loading]);

  if (!open || sortedReminders.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/45 px-3 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-sky-50 ring-1 ring-white/10">
                  <Bell className="h-4 w-4" />
                  تنبيهات الدخول
                </div>

                <h2 className="mt-4 text-3xl font-black">
                  قبل ما تبدأ اليوم
                </h2>

                <p className="mt-2 text-sm font-bold leading-7 text-sky-50">
                  عندك {sortedReminders.length} تنبيه ظاهر الآن
                  {urgentCount > 0 ? `، منها ${urgentCount} عاجل` : ""}
                  {importantCount > 0 ? `، و${importantCount} مهم` : ""}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForSession}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-h-[62vh] space-y-3 overflow-y-auto p-5">
            {sortedReminders.map((reminder) => {
              const href = getLinkHref(reminder);
              const priority = getPriorityMeta(reminder.priority);

              return (
                <article
                  key={reminder.id}
                  className={[
                    "rounded-[1.5rem] border p-4",
                    priority.cardClassName,
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black",
                        priority.badgeClassName,
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-2 w-2 rounded-full",
                          priority.dotClassName,
                        ].join(" ")}
                      />
                      {priority.icon}
                      {priority.label}
                    </span>

                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black",
                        reminder.isLate
                          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
                      ].join(" ")}
                    >
                      {reminder.isLate ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}
                      {reminder.isLate ? "متأخر" : "حان وقته"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                      {getLinkLabel(reminder)}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-black leading-7 text-slate-950">
                    {reminder.title}
                  </h3>

                  {reminder.note ? (
                    <p className="mt-1 text-sm font-bold leading-7 text-slate-500">
                      {reminder.note}
                    </p>
                  ) : null}

                  <p className="mt-2 text-xs font-bold text-slate-400">
                    الموعد: {formatDateTime(reminder.scheduledAt)}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {href ? (
                        <Link
                          href={href}
                          onClick={closeForSession}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-sky-50"
                        >
                          <ExternalLink className="h-4 w-4" />
                          فتح الرابط
                        </Link>
                      ) : null}

                      <Link
                        href="/dashboard/calendar"
                        onClick={closeForSession}
                        className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-sky-800"
                      >
                        <CalendarDays className="h-4 w-4" />
                        التقويم
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => completeReminder(reminder.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      تم
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white p-5">
            <button
              type="button"
              onClick={snoozeThirtyMinutes}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              ذكرني بعد 30 دقيقة
            </button>

            <button
              type="button"
              onClick={closeForSession}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              فهمت
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
