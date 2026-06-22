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

function getUniqueValues(
  items: SnapshotItem[],
  key: "serviceName" | "approvedByName",
) {
  const values = new Set<string>();

  for (const item of items) {
    const value = item[key];

    if (value) {
      values.add(value);
    }
  }

  return Array.from(values).sort();
}

export function ReportTwoArchiveClient({
  snapshots,
}: ReportTwoArchiveClientProps) {
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterApprovedBy, setFilterApprovedBy] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const services = useMemo(
    () => getUniqueValues(snapshots, "serviceName"),
    [snapshots],
  );
  const approvedByNames = useMemo(
    () => getUniqueValues(snapshots, "approvedByName"),
    [snapshots],
  );

  const filtered = useMemo(() => {
    let list = [...snapshots];
    const query = search.trim().toLowerCase();

    if (query) {
      list = list.filter((snapshot) => {
        const reportTitle = (snapshot.reportTitle || "").toLowerCase();
        const serviceName = (snapshot.serviceName || "").toLowerCase();
        const approvedByName = (snapshot.approvedByName || "").toLowerCase();

        return (
          reportTitle.includes(query) ||
          serviceName.includes(query) ||
          approvedByName.includes(query)
        );
      });
    }

    if (filterService) {
      list = list.filter((snapshot) => snapshot.serviceName === filterService);
    }

    if (filterApprovedBy) {
      list = list.filter(
        (snapshot) => snapshot.approvedByName === filterApprovedBy,
      );
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
  }, [filterApprovedBy, filterService, search, snapshots, sortKey]);

  const hasActiveFilters =
    search || filterService || filterApprovedBy || sortKey !== "newest";

  function resetFilters() {
    setSearch("");
    setFilterService("");
    setFilterApprovedBy("");
    setSortKey("newest");
  }

  return (
    <div className="space-y-4" dir="rtl">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_auto_auto_auto]">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم التقرير أو الخدمة أو المعتمد"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-emerald-800"
          />

          <select
            value={filterService}
            onChange={(event) => setFilterService(event.target.value)}
            className="min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
          >
            <option value="">كل الخدمات</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>

          <select
            value={filterApprovedBy}
            onChange={(event) => setFilterApprovedBy(event.target.value)}
            className="min-w-[150px] rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
          >
            <option value="">اعتمد بواسطة</option>
            {approvedByNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-emerald-800"
            >
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="title">العنوان</option>
              <option value="service">الخدمة</option>
            </select>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950"
              >
                إعادة
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {filtered.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((snapshot) => (
            <article
              key={snapshot.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black leading-8 text-slate-950 dark:text-white">
                  {snapshot.reportTitle}
                </h2>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800">
                  معتمد
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                  {snapshot.serviceName || snapshot.serviceSlug || "خدمة غير محددة"}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400 dark:text-slate-500">
                    حالة الاعتماد
                  </dt>
                  <dd className="font-black text-slate-800 dark:text-slate-100">
                    معتمد
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400 dark:text-slate-500">
                    تاريخ الاعتماد
                  </dt>
                  <dd className="font-black text-slate-800 dark:text-slate-100">
                    {formatDate(snapshot.approvedAt)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400 dark:text-slate-500">
                    اعتمد بواسطة
                  </dt>
                  <dd className="font-black text-slate-800 dark:text-slate-100">
                    {snapshot.approvedByName || "غير محدد"}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/report-2/snapshots/${snapshot.id}/preview`}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
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
                  className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-700"
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">
            لا توجد تقارير معتمدة
          </h2>

          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            {hasActiveFilters
              ? "لا توجد نتائج تطابق الفلاتر الحالية."
              : "ستظهر هنا التقارير بعد اعتمادها."}
          </p>
        </div>
      )}
    </div>
  );
}
