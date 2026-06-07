import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  ImageIcon,
  School,
} from "lucide-react";

export type StudentTimelineEventTone =
  | "student"
  | "case"
  | "report"
  | "evidence"
  | "calendar";

export type StudentTimelineEvent = {
  id: string;
  tone: StudentTimelineEventTone;
  title: string;
  subtitle?: string | null;
  date: Date | string;
  href?: string | null;
  badge?: string | null;
};

type Props = {
  events: StudentTimelineEvent[];
};

function formatDate(value: Date | string) {
  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatTime(value: Date | string) {
  try {
    return new Date(value).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getEventIcon(tone: StudentTimelineEventTone) {
  if (tone === "case") return <ClipboardList className="h-4 w-4" />;
  if (tone === "report") return <FileText className="h-4 w-4" />;
  if (tone === "evidence") return <ImageIcon className="h-4 w-4" />;
  if (tone === "calendar") return <Bell className="h-4 w-4" />;

  return <School className="h-4 w-4" />;
}

function getToneClass(tone: StudentTimelineEventTone) {
  if (tone === "case") return "bg-sky-50 text-sky-700 ring-sky-100";
  if (tone === "report") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (tone === "evidence") return "bg-violet-50 text-violet-700 ring-violet-100";
  if (tone === "calendar") return "bg-amber-50 text-amber-700 ring-amber-100";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getToneLabel(tone: StudentTimelineEventTone) {
  if (tone === "case") return "حالة";
  if (tone === "report") return "تقرير";
  if (tone === "evidence") return "شاهد";
  if (tone === "calendar") return "تنبيه";

  return "سجل الطالب";
}

function EventAction({
  href,
}: {
  href?: string | null;
}) {
  if (!href) return null;

  if (href.startsWith("/")) {
    return (
      <Link
        href={href}
        className="mt-3 inline-flex rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-sky-50"
      >
        فتح
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-flex rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-sky-50"
    >
      فتح
    </a>
  );
}

export function StudentRecordTimeline({ events }: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-sky-700">خط زمني</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            رحلة الطالب
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
            الأحداث مرتبة من الأحدث إلى الأقدم حتى يسهل تتبع ما حدث.
          </p>
        </div>

        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          {new Intl.NumberFormat("ar-SA").format(events.length)} حدث
        </span>
      </div>

      {events.length ? (
        <div className="relative mt-6">
          <div className="absolute right-[1.15rem] top-2 h-[calc(100%-1rem)] w-0.5 bg-slate-200" />

          <div className="space-y-4">
            {events.map((event) => (
              <article
                key={event.id}
                className="relative grid gap-3 pr-12 md:grid-cols-[150px_1fr]"
              >
                <div
                  className={[
                    "absolute right-0 top-1 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white",
                    getToneClass(event.tone),
                  ].join(" ")}
                >
                  {getEventIcon(event.tone)}
                </div>

                <div className="pt-1 text-right md:text-left">
                  <p className="text-xs font-black text-slate-400">
                    {formatDate(event.date)}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    {formatTime(event.date)}
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-[11px] font-black ring-1",
                        getToneClass(event.tone),
                      ].join(" ")}
                    >
                      {getToneLabel(event.tone)}
                    </span>

                    {event.badge ? (
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
                        {event.badge}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-3 text-lg font-black leading-8 text-slate-950">
                    {event.title}
                  </h3>

                  {event.subtitle ? (
                    <p className="mt-1 text-sm font-bold leading-7 text-slate-500">
                      {event.subtitle}
                    </p>
                  ) : null}

                  <EventAction href={event.href} />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-lg font-black text-slate-800">
            لا توجد أحداث بعد
          </h3>
          <p className="mt-1 text-sm font-bold text-slate-500">
            عندما يتم إنشاء حالات أو تقارير أو تنبيهات للطالب ستظهر هنا.
          </p>
        </div>
      )}
    </section>
  );
}
