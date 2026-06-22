"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Link2,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";

type ReminderStatus = "PENDING" | "COMPLETED" | "CANCELED";
type ReminderPriority = "NORMAL" | "IMPORTANT" | "URGENT";
type ReminderLinkType = "GENERAL" | "SERVICE" | "CASE" | "STUDENT";

type ReminderItem = {
  id: string;
  title: string;
  note?: string | null;
  status: ReminderStatus;
  priority: ReminderPriority;
  linkType: ReminderLinkType;
  scheduledAt: string;
  remindBeforeMinutes?: number | null;
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

type ServiceOption = {
  id: string;
  name: string;
  slug: string;
};

type CaseOption = {
  id: string;
  title?: string | null;
  status: string;
  service?: {
    name: string;
    slug: string;
  } | null;
};

type StudentOption = {
  id: string;
  fullName: string;
  grade?: string | null;
  classroom?: string | null;
};

type Props = {
  reminders: ReminderItem[];
  services: ServiceOption[];
  cases: CaseOption[];
  students: StudentOption[];
};

type TabKey = "now" | "today" | "upcoming" | "late" | "done";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getPriorityLabel(priority: ReminderPriority) {
  if (priority === "URGENT") return "عاجل";
  if (priority === "IMPORTANT") return "مهم";
  return "عادي";
}

function getPriorityClass(priority: ReminderPriority) {
  if (priority === "URGENT") return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
  if (priority === "IMPORTANT") return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
}

function getLinkLabel(reminder: ReminderItem) {
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

function getLinkHref(reminder: ReminderItem) {
  if (reminder.linkType === "SERVICE" && reminder.service?.slug) {
    return `/dashboard/${reminder.service.slug}`;
  }

  if (reminder.linkType === "CASE" && reminder.caseEntry?.id) {
    return `/dashboard/cases/${reminder.caseEntry.id}`;
  }

  if (reminder.linkType === "STUDENT" && reminder.student?.id) {
    return `/dashboard/comprehensive-reference?studentId=${reminder.student.id}`;
  }

  return "";
}

function getReminderBucket(reminder: ReminderItem, now: Date): TabKey {
  if (reminder.status === "COMPLETED") return "done";

  const date = new Date(reminder.scheduledAt);

  if (date < now) return "late";
  if (isSameDay(date, now)) return "today";

  const threeDays = 1000 * 60 * 60 * 24 * 3;
  if (date.getTime() - now.getTime() <= threeDays) return "now";

  return "upcoming";
}

function statNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

export function CalendarCenterClient({
  reminders,
  services,
  cases,
  students,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(toDateInputValue());
  const [time, setTime] = useState(toTimeInputValue());
  const [priority, setPriority] = useState<ReminderPriority>("NORMAL");
  const [linkType, setLinkType] = useState<ReminderLinkType>("GENERAL");
  const [serviceId, setServiceId] = useState("");
  const [caseEntryId, setCaseEntryId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [remindBeforeMinutes] = useState("0");
  const [activeTab, setActiveTab] = useState<TabKey>("now");
  const [feedback, setFeedback] = useState("");

  const now = new Date();

  const grouped = useMemo(() => {
    const result: Record<TabKey, ReminderItem[]> = {
      now: [],
      today: [],
      upcoming: [],
      late: [],
      done: [],
    };

    for (const reminder of reminders) {
      result[getReminderBucket(reminder, now)].push(reminder);
    }

    return result;
  }, [reminders]);

  const tabs = [
    { id: "now" as const, label: "اقتراحات الآن", count: grouped.now.length },
    { id: "today" as const, label: "اليوم", count: grouped.today.length },
    { id: "late" as const, label: "متأخر", count: grouped.late.length },
    { id: "upcoming" as const, label: "قريبًا", count: grouped.upcoming.length },
    { id: "done" as const, label: "مكتمل", count: grouped.done.length },
  ];

  async function createReminder() {
    setFeedback("");

    if (!title.trim()) {
      setFeedback("اكتب عنوان التنبيه أولًا.");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`);

    if (Number.isNaN(scheduledAt.getTime())) {
      setFeedback("اختر تاريخ ووقت صحيحين.");
      return;
    }

    const payload = {
      title,
      note: "",
      priority,
      linkType,
      scheduledAt: scheduledAt.toISOString(),
      remindBeforeMinutes: Number(remindBeforeMinutes || 0),
      serviceId: linkType === "SERVICE" ? serviceId : null,
      caseEntryId: linkType === "CASE" ? caseEntryId : null,
      studentId: linkType === "STUDENT" ? studentId : null,
    };

    const response = await fetch("/api/dashboard/calendar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setFeedback(data?.error || "تعذر إنشاء التنبيه.");
      return;
    }

    setTitle("");
    setPriority("NORMAL");
    setLinkType("GENERAL");
    setServiceId("");
    setCaseEntryId("");
    setStudentId("");
    setFeedback("تم إنشاء التنبيه.");

    startTransition(() => router.refresh());
  }

  async function patchReminder(reminderId: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/dashboard/calendar/${reminderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setFeedback(data?.error || "تعذر تحديث التنبيه.");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function deleteReminder(reminderId: string) {
    const ok = window.confirm("حذف التنبيه؟");
    if (!ok) return;

    const response = await fetch(`/api/dashboard/calendar/${reminderId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setFeedback(data?.error || "تعذر حذف التنبيه.");
      return;
    }

    startTransition(() => router.refresh());
  }

  const activeReminders = grouped[activeTab];

  return (
    <div className="space-y-4" dir="rtl">
      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <Field label="عنوان التنبيه">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثال: متابعة لجنة"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="التاريخ">
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white"
                />
              </Field>

              <Field label="الوقت">
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white"
                />
              </Field>
            </div>

            <Field label="الأولوية">
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as ReminderPriority)
                }
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white"
              >
                <option value="NORMAL">عادي</option>
                <option value="IMPORTANT">مهم</option>
                <option value="URGENT">عاجل</option>
              </select>
            </Field>

            <Field label="الربط">
              <select
                value={linkType}
                onChange={(event) =>
                  setLinkType(event.target.value as ReminderLinkType)
                }
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white"
              >
                <option value="GENERAL">تنبيه عام</option>
                <option value="SERVICE">خدمة</option>
                <option value="CASE">حالة</option>
                <option value="STUDENT">طالب</option>
              </select>
            </Field>

            {linkType === "SERVICE" ? (
              <Field label="الخدمة">
                <select
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white"
                >
                  <option value="">اختر خدمة...</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {linkType === "CASE" ? (
              <Field label="الحالة">
                <select
                  value={caseEntryId}
                  onChange={(event) => setCaseEntryId(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white"
                >
                  <option value="">اختر حالة...</option>
                  {cases.map((caseItem) => (
                    <option key={caseItem.id} value={caseItem.id}>
                      {caseItem.title || "حالة بدون عنوان"} -{" "}
                      {caseItem.service?.name || "خدمة"}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {linkType === "STUDENT" ? (
              <Field label="الطالب">
                <select
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white"
                >
                  <option value="">اختر طالب...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {feedback ? (
              <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-700">
                {feedback}
              </div>
            ) : null}

            <button
              type="button"
              onClick={createReminder}
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              حفظ
            </button>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "min-w-[132px] rounded-2xl border px-4 py-3 text-right transition",
                      active
                        ? "border-sky-300 bg-sky-50"
                        : "border-slate-200 bg-slate-50 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong
                        className={[
                          "text-sm font-black",
                          active ? "text-sky-800" : "text-slate-800",
                        ].join(" ")}
                      >
                        {tab.label}
                      </strong>

                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-500">
                        {statNumber(tab.count)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            {activeReminders.map((reminder) => {
              const href = getLinkHref(reminder);

              return (
                <article
                  key={reminder.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-black",
                            getPriorityClass(reminder.priority),
                          ].join(" ")}
                        >
                          {getPriorityLabel(reminder.priority)}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTime(reminder.scheduledAt)}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                          <Link2 className="h-3.5 w-3.5" />
                          {getLinkLabel(reminder)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black leading-8 text-slate-950">
                        {reminder.title}
                      </h3>

                      {reminder.note ? (
                        <p className="mt-1 text-sm font-bold leading-7 text-slate-500">
                          {reminder.note}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {href ? (
                        <a
                          href={href}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          فتح الرابط
                        </a>
                      ) : null}

                      {reminder.status === "COMPLETED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            patchReminder(reminder.id, { status: "PENDING" })
                          }
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          إعادة
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            patchReminder(reminder.id, { status: "COMPLETED" })
                          }
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          تم
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteReminder(reminder.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {activeReminders.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center font-black text-slate-500">
                لا توجد تنبيهات
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
