"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OperationalAlertSeverity = "CRITICAL" | "WARNING" | "INFO";

type OperationalAlert = {
  id: string;
  category: string;
  severity: OperationalAlertSeverity;
  title: string;
  description: string;
  count: number;
  href?: string;
  actionLabel?: string;
  meta?: Record<string, unknown>;
};

type OperationalAlertsResponse = {
  generatedAt: string;
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  alerts: OperationalAlert[];
};

function getSeverityLabel(severity: OperationalAlertSeverity) {
  if (severity === "CRITICAL") return "عاجل";
  if (severity === "WARNING") return "تنبيه";
  return "متابعة";
}

function getSeverityClass(severity: OperationalAlertSeverity) {
  if (severity === "CRITICAL") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200";
  }

  if (severity === "WARNING") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200";
}

function getCardClass(severity: OperationalAlertSeverity) {
  if (severity === "CRITICAL") {
    return "border-red-100 bg-white dark:border-red-900/40 dark:bg-slate-950";
  }

  if (severity === "WARNING") {
    return "border-amber-100 bg-white dark:border-amber-900/40 dark:bg-slate-950";
  }

  return "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";
}

export function AdminOperationalAlertsPanel() {
  const [data, setData] = useState<OperationalAlertsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadAlerts() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/dashboard/admin/operational-alerts", {
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل تنبيهات التشغيل.");
      }

      setData(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "تعذر تحميل تنبيهات التشغيل."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  const topAlerts = useMemo(() => data?.alerts.slice(0, 6) || [], [data]);

  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            مركز التنبيهات التشغيلية
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
            متابعة ذكية للحسابات والاشتراكات والنشاط
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            هذه التنبيهات تساعد الأدمن على اكتشاف الحسابات التي تحتاج إجراءً سريعًا:
            اشتراكات قاربت على الانتهاء، تحويلات معلقة، مستخدمون خاملون، وتحذيرات
            سجل العمليات.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAlerts()}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          تحديث التنبيهات
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          جارٍ تحميل التنبيهات التشغيلية...
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      ) : data && data.alerts.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          لا توجد تنبيهات تشغيلية حاليًا. الوضع العام للمنصة مستقر.
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي التنبيهات</p>
              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                {data?.summary.total || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-red-100 p-4 dark:border-red-900/40">
              <p className="text-xs text-red-500 dark:text-red-300">عاجلة</p>
              <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-200">
                {data?.summary.critical || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 p-4 dark:border-amber-900/40">
              <p className="text-xs text-amber-600 dark:text-amber-300">تحذيرات</p>
              <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-200">
                {data?.summary.warning || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 p-4 dark:border-sky-900/40">
              <p className="text-xs text-sky-600 dark:text-sky-300">متابعة</p>
              <p className="mt-2 text-2xl font-bold text-sky-700 dark:text-sky-200">
                {data?.summary.info || 0}
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {topAlerts.map((alert) => (
              <article
                key={alert.id}
                className={`rounded-2xl border p-4 shadow-sm ${getCardClass(alert.severity)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSeverityClass(
                        alert.severity
                      )}`}
                    >
                      {getSeverityLabel(alert.severity)}
                    </span>
                    <h3 className="mt-3 text-base font-bold text-slate-950 dark:text-white">
                      {alert.title}
                    </h3>
                  </div>

                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-lg font-black text-slate-900 dark:bg-slate-900 dark:text-white">
                    {alert.count}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {alert.description}
                </p>

                {alert.href ? (
                  <Link
                    href={alert.href}
                    className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                  >
                    {alert.actionLabel || "فتح التفاصيل"}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
