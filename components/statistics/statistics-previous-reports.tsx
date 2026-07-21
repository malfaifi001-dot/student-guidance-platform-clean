"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

type ReportItem = {
  id: string;
  title: string;

  serviceSlug: string;
  serviceName: string;

  sourceCaseCount: number;
  sourceReportCount: number;

  analysisMode: string;

  dateFrom: string;
  dateTo: string;

  createdAt: string;
};

type ReportsResponse = {
  success?: boolean;
  error?: string;
  reports?: ReportItem[];
};

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "ar-SA",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  ).format(new Date(value));
}

export function StatisticsPreviousReports() {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [reports, setReports] =
    useState<ReportItem[]>([]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadReports() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/dashboard/statistics/reports",
          {
            cache: "no-store",
            signal:
              controller.signal,
          },
        );

        const payload =
          (await response.json()) as
            ReportsResponse;

        if (
          !response.ok ||
          !payload.success
        ) {
          throw new Error(
            payload.error ||
              "تعذر تحميل التقارير السابقة.",
          );
        }

        setReports(
          Array.isArray(
            payload.reports,
          )
            ? payload.reports
            : [],
        );
      } catch (caughtError) {
        if (
          caughtError instanceof Error &&
          caughtError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "تعذر تحميل التقارير السابقة.",
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () =>
      controller.abort();
  }, []);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            التقارير الإحصائية السابقة
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            التقارير المحفوظة من بيانات
            الحالات والتقارير الصادرة.
          </p>
        </div>

        {!loading ? (
          <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
            {reports.length} تقرير
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
          جارٍ تحميل التقارير السابقة...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : reports.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="font-black text-slate-900">
            لا توجد تقارير محفوظة بعد
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            أنشئ أول تقرير إحصائي من الزر
            أعلى الصفحة.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map(
            (report) => (
              <article
                key={report.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-200 hover:bg-white hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                    {report.serviceName}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500">
                    {report.analysisMode ===
                    "DEEPSEEK"
                      ? "صياغة ذكية"
                      : "صياغة احتياطية"}
                  </span>
                </div>

                <h3 className="mt-4 line-clamp-2 text-lg font-black leading-7 text-slate-950">
                  {report.title}
                </h3>

                <p className="mt-3 text-xs font-semibold text-slate-500">
                  تم الإنشاء:{" "}
                  {formatDate(
                    report.createdAt,
                  )}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">
                      الحالات
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900">
                      {
                        report.sourceCaseCount
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">
                      التقارير
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900">
                      {
                        report.sourceReportCount
                      }
                    </p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/statistics/${report.id}`}
                  className="mt-5 flex w-full items-center justify-center rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
                >
                  عرض التقرير
                </Link>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}