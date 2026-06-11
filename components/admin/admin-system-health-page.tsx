"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import type { SystemHealthReport, HealthStatus } from "@/lib/admin/system-health-service";

const statusConfig: Record<HealthStatus, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  CLEAR: {
    label: "سليم",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle,
  },
  WARNING: {
    label: "يحتاج انتباه",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: AlertTriangle,
  },
  DANGER: {
    label: "خطر",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: XCircle,
  },
};

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    INFO: "bg-blue-50 text-blue-700 border-blue-200",
    SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
    WARNING: "bg-amber-50 text-amber-700 border-amber-200",
    ERROR: "bg-red-50 text-red-700 border-red-200",
    CRITICAL: "bg-red-100 text-red-800 border-red-300",
  };

  const labelMap: Record<string, string> = {
    INFO: "معلومات",
    SUCCESS: "نجاح",
    WARNING: "تنبيه",
    ERROR: "خطأ",
    CRITICAL: "حرج",
  };

  return (
    <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${map[severity] || map.INFO}`}>
      {labelMap[severity] || severity}
    </span>
  );
}

function MetricCard({
  metric,
}: {
  metric: SystemHealthReport["metrics"][number];
}) {
  const cfg = statusConfig[metric.status];
  const Icon = cfg.icon;

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border ${cfg.border} ${cfg.bg} p-5 transition hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">{metric.label}</h3>
        <Icon className={`h-5 w-5 ${cfg.color}`} />
      </div>

      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-black ${cfg.color}`}>{metric.count}</span>
        <span className="text-sm text-slate-500">سجل</span>
      </div>

      <p className="text-xs leading-6 text-slate-600">{metric.description}</p>

      {metric.href ? (
        <Link
          href={metric.href}
          className="mt-1 self-start rounded-xl bg-white/80 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-900"
        >
          الانتقال →
        </Link>
      ) : null}
    </div>
  );
}

function ActivityLogRow({ entry }: { entry: SystemHealthReport["recentActivity"][number] }) {
  const date = new Date(entry.createdAt);
  const timeStr = date.toLocaleString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 transition hover:border-slate-200">
      <div className="mt-0.5 shrink-0">
        <Clock className="h-4 w-4 text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-800">{entry.title}</span>
          <SeverityBadge severity={entry.severity} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
          <span>التصنيف: {entry.category}</span>
          <span>•</span>
          <span>{timeStr}</span>
        </div>
      </div>
    </div>
  );
}

export function AdminSystemHealthPage() {
  const [data, setData] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/admin/system-health");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "فشل في تحميل بيانات صحة النظام");
      }
      const json: SystemHealthReport = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-slate-400" />
          <h2 className="text-lg font-black text-slate-800">مركز صحة النظام</h2>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
            <p className="text-sm font-bold text-slate-500">جاري تحميل تقرير الصحة...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-red-500" />
          <h2 className="text-lg font-black text-slate-800">مركز صحة النظام</h2>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm font-bold text-red-700">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const overallCfg = statusConfig[data.overallStatus];
  const OverallIcon = overallCfg.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-slate-600" />
          <h2 className="text-lg font-black text-slate-800">مركز صحة النظام</h2>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Clock className="h-4 w-4" />
          تحديث
        </button>
      </div>

      <div className={`flex items-center gap-4 rounded-2xl border p-5 ${overallCfg.border} ${overallCfg.bg}`}>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${overallCfg.bg} ${overallCfg.color}`}>
          <OverallIcon className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500">الحالة العامة للمنصة</p>
          <p className={`text-xl font-black ${overallCfg.color}`}>{overallCfg.label}</p>
        </div>
        <div className="mr-auto text-left text-[11px] text-slate-400">
          آخر تحديث: {new Date(data.generatedAt).toLocaleString("ar-SA")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-500" />
          <h3 className="text-base font-black text-slate-800">آخر النشاطات</h3>
        </div>

        {data.recentActivity.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
            <p className="text-sm font-bold text-slate-400">لا توجد نشاطات مسجلة بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentActivity.map((entry) => (
              <ActivityLogRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
