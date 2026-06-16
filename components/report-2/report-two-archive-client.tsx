"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReportTwoPdfDownloadButton } from "@/components/report-2/report-two-pdf-download-button";

type SnapshotItem = {
  id: string;
  caseEntryId: string;
  serviceSlug: string | null;
  serviceName: string | null;
  reportTitle: string;
  templateId: string | null;
  templateName: string | null;
  snapshotTemplateJson: unknown;
  snapshotPagesJson: unknown;
  snapshotHtml: string;
  pdfUrl: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReportTwoArchiveClientProps = {
  snapshots: SnapshotItem[];
};

type SortKey = "newest" | "oldest" | "title" | "service";
type QuickFilter = "all" | "today" | "7days" | "month";

function formatDate(value: string | null | undefined) {
  if (!value) return "غير محدد";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function shortDate(value: string | null | undefined) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isLast7Days(d: Date) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return d >= weekAgo;
}

function isThisMonth(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

function getUniqueValues(items: SnapshotItem[], key: "serviceName" | "templateName" | "approvedByName") {
  const values = new Set<string>();
  for (const item of items) {
    const v = item[key];
    if (v) values.add(v);
  }
  return Array.from(values).sort();
}

export function ReportTwoArchiveClient({
  snapshots,
}: ReportTwoArchiveClientProps) {
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterApprovedBy, setFilterApprovedBy] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const services = useMemo(() => getUniqueValues(snapshots, "serviceName"), [snapshots]);
  const templates = useMemo(() => getUniqueValues(snapshots, "templateName"), [snapshots]);
  const approvedByNames = useMemo(() => getUniqueValues(snapshots, "approvedByName"), [snapshots]);

  const filtered = useMemo(() => {
    let list = [...snapshots];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const reportTitle = (s.reportTitle || "").toLowerCase();
        const serviceName = (s.serviceName || "").toLowerCase();
        const templateName = (s.templateName || "").toLowerCase();
        const approvedByName = (s.approvedByName || "").toLowerCase();
        return (
          reportTitle.includes(q) ||
          serviceName.includes(q) ||
          templateName.includes(q) ||
          approvedByName.includes(q)
        );
      });
    }

    if (filterService) {
      list = list.filter((s) => s.serviceName === filterService);
    }

    if (filterTemplate) {
      list = list.filter((s) => s.templateName === filterTemplate);
    }

    if (filterApprovedBy) {
      list = list.filter((s) => s.approvedByName === filterApprovedBy);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((s) => s.approvedAt && new Date(s.approvedAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((s) => s.approvedAt && new Date(s.approvedAt) <= to);
    }

    if (quickFilter === "today") {
      list = list.filter((s) => s.approvedAt && isToday(new Date(s.approvedAt)));
    } else if (quickFilter === "7days") {
      list = list.filter((s) => s.approvedAt && isLast7Days(new Date(s.approvedAt)));
    } else if (quickFilter === "month") {
      list = list.filter((s) => s.approvedAt && isThisMonth(new Date(s.approvedAt)));
    }

    list.sort((a, b) => {
      const aDate = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
      const bDate = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
      switch (sortKey) {
        case "oldest":
          return aDate - bDate;
        case "title":
          return (a.reportTitle || "").localeCompare(b.reportTitle || "", "ar");
        case "service":
          return (a.serviceName || "").localeCompare(b.serviceName || "", "ar");
        case "newest":
        default:
          return bDate - aDate;
      }
    });

    return list;
  }, [
    snapshots,
    search,
    filterService,
    filterTemplate,
    filterApprovedBy,
    dateFrom,
    dateTo,
    sortKey,
    quickFilter,
  ]);

  function resetFilters() {
    setSearch("");
    setFilterService("");
    setFilterTemplate("");
    setFilterApprovedBy("");
    setDateFrom("");
    setDateTo("");
    setSortKey("newest");
    setQuickFilter("all");
  }

  const hasActiveFilters =
    search ||
    filterService ||
    filterTemplate ||
    filterApprovedBy ||
    dateFrom ||
    dateTo ||
    sortKey !== "newest" ||
    quickFilter !== "all";

  return (
    <div className="space-y-5" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">
              بحث عام
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="عنوان التقرير، الخدمة، القالب..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-emerald-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">
              الخدمة
            </label>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
            >
              <option value="">الكل</option>
              {services.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">
              القالب
            </label>
            <select
              value={filterTemplate}
              onChange={(e) => setFilterTemplate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
            >
              <option value="">الكل</option>
              {templates.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">
              اعتمد بواسطة
            </label>
            <select
              value={filterApprovedBy}
              onChange={(e) => setFilterApprovedBy(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
            >
              <option value="">الكل</option>
              {approvedByNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">
              من تاريخ
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">
              ترتيب
            </label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
              <option value="title">حسب العنوان</option>
              <option value="service">حسب الخدمة</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">
                تصفية سريعة
              </label>
              <select
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value as QuickFilter)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
              >
                <option value="all">الكل</option>
                <option value="today">اليوم</option>
                <option value="7days">آخر 7 أيام</option>
                <option value="month">هذا الشهر</option>
              </select>
            </div>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950"
              >
                إعادة تعيين
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-400">
          عدد النتائج: {filtered.length}
        </div>
      </section>

      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((snapshot) => (
            <article
              key={snapshot.id}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {snapshot.serviceName || snapshot.serviceSlug || "خدمة غير محددة"}
                  </p>

                  <h2 className="mt-2 text-xl font-black leading-8 text-slate-950 dark:text-white">
                    {snapshot.reportTitle}
                  </h2>

                  {snapshot.templateName ? (
                    <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                      {snapshot.templateName}
                    </p>
                  ) : null}
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800">
                  تم اعتماد التقرير
                </span>
              </div>

              <dl className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4 text-xs font-bold text-slate-600 sm:grid-cols-2 dark:bg-slate-900 dark:text-slate-300">
                <div>
                  <dt className="font-black text-slate-400 dark:text-slate-500">تاريخ الاعتماد</dt>
                  <dd className="mt-1 text-slate-800 dark:text-slate-200">
                    {formatDate(snapshot.approvedAt)}
                  </dd>
                </div>

                <div>
                  <dt className="font-black text-slate-400 dark:text-slate-500">اعتمد بواسطة</dt>
                  <dd className="mt-1 text-slate-800 dark:text-slate-200">
                    {snapshot.approvedByName || "غير محدد"}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/report-2/snapshots/${snapshot.id}/preview`}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  معاينة التقرير
                </Link>

                <ReportTwoPdfDownloadButton
                  snapshot={{
                    caseEntryId: snapshot.caseEntryId,
                    reportTitle: snapshot.reportTitle,
                    snapshotTemplateJson: snapshot.snapshotTemplateJson,
                    snapshotPagesJson: snapshot.snapshotPagesJson,
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-700"
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">
            لا توجد تقارير معتمدة
          </h2>

          <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
            {hasActiveFilters
              ? "لا توجد نتائج تطابق معايير البحث المحددة."
              : "ستظهر هنا التقارير بعد اعتمادها من استوديو report-2."}
          </p>
        </div>
      )}
    </div>
  );
}
