"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { downloadBlobAsFile } from "@/lib/print-export/print-export-download";

type CertificateStatus = "DRAFT" | "ISSUED" | "PRINTED";

type CertificateRecord = {
  id: string;
  status: CertificateStatus;
  createdAt: string;
  printedAt?: string;
  student: {
    id: string;
    fullName: string;
    nationalId: string | null;
    gender: "MALE" | "FEMALE" | "UNKNOWN";
    stage: string | null;
    grade: string | null;
    classroom: string | null;
    guardian: {
      name: string;
      phone: string | null;
    } | null;
  } | null;
  values: Record<string, string>;
};

const STORAGE_KEY =
  "student-guidance.student-follow-up.appreciation-certificates.v1";

export function AppreciationCertificateStatisticsClient() {
  const [records, setRecords] = useState<CertificateRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  useEffect(() => {
    setRecords(readRecords());
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const category = record.values.achievementCategory || "غير محدد";

      const haystack = [
        record.student?.fullName,
        record.values.recipientName,
        record.values.achievementCategory,
        record.values.appreciationReason,
        record.values.termName,
        record.values.weekName,
        record.values.followUpResult,
        record.status,
      ]
        .filter(Boolean)
        .join(" ");

      const statusOk = statusFilter === "ALL" || record.status === statusFilter;
      const categoryOk =
        categoryFilter === "ALL" || category === categoryFilter;
      const searchOk = !search.trim() || haystack.includes(search.trim());

      return statusOk && categoryOk && searchOk;
    });
  }, [records, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => buildStats(filteredRecords), [filteredRecords]);
  const fullStats = useMemo(() => buildStats(records), [records]);

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        records.map((record) => record.values.achievementCategory || "غير محدد")
      )
    );
  }, [records]);

  function refresh() {
    setRecords(readRecords());
  }

  function clearAll() {
    if (!records.length) return;

    if (!confirm("هل تريد حذف سجل شهادات الشكر المحلي كاملًا؟")) return;

    window.localStorage.removeItem(STORAGE_KEY);
    setRecords([]);
  }

  async function exportCsv() {
    await downloadCsv(filteredRecords);
  }

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-emerald-700">
              الإحصائيات والمتابعة
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-900">
              لوحة شهادات الشكر
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              تحليل الشهادات حسب الحالة، مجال التميز، الأسبوع، الفصل، ونسب
              التحميل. هذه المرحلة تقرأ السجل المحلي الحالي، ثم ننقلها لاحقًا
              لقاعدة البيانات و Audit Log.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/student-follow-up/appreciation-certificates"
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white"
            >
              إصدار شهادة جديدة
            </Link>

            <button
              type="button"
              onClick={refresh}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              تحديث
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              تصدير CSV
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-600"
            >
              حذف السجل المحلي
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الشهادات" value={stats.total} hint="بعد الفلترة" />
        <StatCard label="تم تحميل PDF" value={stats.printed} hint={`${stats.printedRate}% من النتائج`} />
        <StatCard label="شهادات صادرة" value={stats.issued} hint="لم تُطبع بعد" />
        <StatCard label="مسودات" value={stats.draft} hint="تحتاج مراجعة" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="طلاب مكرمون" value={stats.uniqueStudents} hint="عدد الطلاب بدون تكرار" />
        <StatCard label="أكثر مجال" value={stats.topCategory} hint="حسب السجل الحالي" />
        <StatCard label="أكثر أسبوع" value={stats.topWeek} hint="أكثر أسبوع فيه تكريم" />
        <StatCard label="متوسط الحضور" value={stats.averageAttendance} hint="من القيم المتاحة" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              فلاتر التحليل
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              استخدم الفلاتر لمتابعة مجال معين أو حالة معينة.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث باسم الطالب أو المجال..."
              className="h-11 min-w-[260px] rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-emerald-400"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-emerald-400"
            >
              <option value="ALL">كل الحالات</option>
              <option value="DRAFT">مسودة</option>
              <option value="ISSUED">صادرة</option>
              <option value="PRINTED">تم تحميل PDF</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-emerald-400"
            >
              <option value="ALL">كل المجالات</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartPanel
          title="الشهادات حسب مجال التميز"
          description="يوضح المجالات الأكثر استخدامًا في شهادات الشكر."
          data={stats.categoryChart}
        />

        <ChartPanel
          title="الشهادات حسب الحالة"
          description="نسبة المسودات والصادرة والمحمّلة PDF."
          data={stats.statusChart}
        />

        <ChartPanel
          title="الشهادات حسب الأسبوع"
          description="يساعد في متابعة كثافة التكريم أسبوعيًا."
          data={stats.weekChart}
        />

        <ChartPanel
          title="الشهادات حسب الفصل الدراسي"
          description="توزيع التكريم حسب الفصول الدراسية."
          data={stats.termChart}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                آخر شهادات الشكر
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                آخر السجلات المطابقة للفلترة الحالية.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
              {filteredRecords.length} نتيجة
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {filteredRecords.slice(0, 12).map((record) => (
              <div
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      {record.student?.fullName ||
                        record.values.recipientName ||
                        "طالب/طالبة"}
                    </div>

                    <div className="mt-1 text-xs font-bold leading-6 text-slate-500">
                      {record.values.achievementCategory || "غير محدد"} —{" "}
                      {record.values.weekName || "أسبوع غير محدد"} —{" "}
                      {record.values.issueDate || formatDate(record.createdAt)}
                    </div>
                  </div>

                  <span className={statusClass(record.status)}>
                    {statusLabel(record.status)}
                  </span>
                </div>
              </div>
            ))}

            {!filteredRecords.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                لا توجد بيانات حسب الفلاتر الحالية.
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              قراءة تشغيلية
            </h2>

            <div className="mt-4 space-y-3">
              {buildInsights(stats, fullStats).map((insight) => (
                <div
                  key={insight}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold leading-7 text-emerald-900"
                >
                  {insight}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              التوصيات القادمة
            </h2>

            <ul className="mt-4 space-y-3 text-sm font-bold leading-7 text-slate-600">
              <li>ربط السجل بقاعدة البيانات بدل localStorage.</li>
              <li>إضافة Audit Log لكل إصدار وتحميل PDF.</li>
              <li>إضافة صلاحيات: إصدار، اعتماد، طباعة، حذف.</li>
              <li>إضافة فلتر حسب الصف والفصل والمرحلة.</li>
              <li>إضافة تقرير شهري لشهادات الشكر حسب المدرسة والموجه.</li>
            </ul>
          </section>
        </section>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black text-slate-400">{label}</div>

      <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>

      {hint ? (
        <div className="mt-2 text-xs font-bold text-slate-400">{hint}</div>
      ) : null}
    </div>
  );
}

function ChartPanel({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; value: number }>;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">{title}</h2>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
          {data.length} عنصر
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {data.length ? (
          data.map((item) => {
            const width = Math.max(7, Math.round((item.value / maxValue) * 100));

            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black text-slate-600">
                  <span className="truncate">{item.label}</span>
                  <span>{item.value}</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
            لا توجد بيانات للرسم.
          </div>
        )}
      </div>
    </section>
  );
}

function buildStats(records: CertificateRecord[]) {
  const total = records.length;
  const printed = records.filter((record) => record.status === "PRINTED").length;
  const issued = records.filter((record) => record.status === "ISSUED").length;
  const draft = records.filter((record) => record.status === "DRAFT").length;

  const uniqueStudents = new Set(
    records
      .map((record) => record.student?.id || record.student?.fullName || record.values.recipientName)
      .filter(Boolean)
  ).size;

  const categoryCounts = countBy(records, (record) =>
    record.values.achievementCategory || "غير محدد"
  );

  const statusCounts = countBy(records, (record) => statusLabel(record.status));

  const weekCounts = countBy(records, (record) =>
    record.values.weekName || "غير محدد"
  );

  const termCounts = countBy(records, (record) =>
    record.values.termName || "غير محدد"
  );

  const attendanceValues = records
    .map((record) => parsePercent(record.values.attendanceRate))
    .filter((value) => Number.isFinite(value));

  const averageAttendance = attendanceValues.length
    ? `${Math.round(
        attendanceValues.reduce((sum, value) => sum + value, 0) /
          attendanceValues.length
      )}%`
    : "—";

  return {
    total,
    printed,
    issued,
    draft,
    uniqueStudents,
    printedRate: total ? Math.round((printed / total) * 100) : 0,
    topCategory: topLabel(categoryCounts),
    topWeek: topLabel(weekCounts),
    averageAttendance,
    categoryChart: toChartData(categoryCounts),
    statusChart: toChartData(statusCounts),
    weekChart: toChartData(weekCounts),
    termChart: toChartData(termCounts),
  };
}

function countBy(
  records: CertificateRecord[],
  getKey: (record: CertificateRecord) => string
) {
  return records.reduce<Record<string, number>>((acc, record) => {
    const key = getKey(record) || "غير محدد";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function toChartData(counts: Record<string, number>) {
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function topLabel(counts: Record<string, number>) {
  return toChartData(counts)[0]?.label || "—";
}

function parsePercent(value?: string) {
  if (!value) return Number.NaN;

  const match = value.match(/[\d.]+/);

  return match ? Number(match[0]) : Number.NaN;
}

function buildInsights(
  stats: ReturnType<typeof buildStats>,
  fullStats: ReturnType<typeof buildStats>
) {
  const insights: string[] = [];

  if (!fullStats.total) {
    return [
      "ابدأ بإصدار شهادات الشكر حتى تظهر مؤشرات المتابعة.",
      "بعد حفظ أو طباعة أول شهادة ستبدأ الرسوم والتحليلات بالظهور هنا.",
    ];
  }

  insights.push(`إجمالي شهادات الشكر المسجلة حتى الآن: ${fullStats.total}.`);

  if (stats.topCategory !== "—") {
    insights.push(`أكثر مجال تكريم حاليًا هو: ${stats.topCategory}.`);
  }

  if (stats.printedRate < 50 && stats.total > 0) {
    insights.push(
      "نسبة تحميل PDF منخفضة؛ راجع الشهادات الصادرة التي لم تُطبع بعد."
    );
  } else if (stats.printedRate >= 50) {
    insights.push("نسبة تحميل PDF جيدة، مما يعني أن عملية الإصدار تعمل بانتظام.");
  }

  if (stats.averageAttendance !== "—") {
    insights.push(`متوسط الحضور في الشهادات الحالية: ${stats.averageAttendance}.`);
  }

  return insights;
}

function readRecords(): CertificateRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function statusLabel(status: CertificateStatus) {
  if (status === "PRINTED") return "تم تحميل PDF";
  if (status === "ISSUED") return "صادرة";
  return "مسودة";
}

function statusClass(status: CertificateStatus) {
  if (status === "PRINTED") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-700";
  }

  if (status === "ISSUED") {
    return "rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black text-blue-700";
  }

  return "rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600";
}

function formatDate(value?: string) {
  if (!value) return "—";

  return value.slice(0, 10);
}

async function downloadCsv(records: CertificateRecord[]) {
  const headers = [
    "student",
    "status",
    "category",
    "reason",
    "term",
    "week",
    "issueDate",
    "score",
    "attendanceRate",
    "createdAt",
    "printedAt",
  ];

  const rows = records.map((record) => [
    record.student?.fullName || record.values.recipientName || "",
    statusLabel(record.status),
    record.values.achievementCategory || "",
    record.values.appreciationReason || "",
    record.values.termName || "",
    record.values.weekName || "",
    record.values.issueDate || "",
    record.values.score || "",
    record.values.attendanceRate || "",
    record.createdAt || "",
    record.printedAt || "",
  ]);

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  await downloadBlobAsFile(
    blob,
    `appreciation-certificates-statistics-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
