"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ReportStatus = "DRAFT" | "GENERATED" | "APPROVED" | "ARCHIVED" | string;

type ReportDashboardItem = {
  id: string;
  title: string;
  serviceSlug: string;
  status: ReportStatus;
  genderMode: string;
  templateId?: string | null;
  hasTemplateSnapshot: boolean;
  hasReportDataSnapshot: boolean;
  generatedAt?: string | null;
  generatedPdfUrl?: string | null;
  approvedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  evidenceItemsCount: number;

  caseEntry: {
    id: string;
    title?: string | null;
    status: string;
    createdAt: string;

    service: {
      id: string;
      name: string;
      slug: string;
    };

    student?: {
      id: string;
      fullName: string;
      nationalId?: string | null;
      stage?: string | null;
      grade?: string | null;
      classroom?: string | null;
      guardianName?: string | null;
      guardianPhone?: string | null;
    } | null;
  };
};

type ReportsStats = {
  total: number;
  approved: number;
  draft: number;
  generated: number;
  archived: number;
  withSnapshot: number;
  withoutSnapshot: number;
};

type ReportsDashboardProps = {
  reports: ReportDashboardItem[];
  stats: ReportsStats;
};

type SnapshotFilter = "ALL" | "SNAPSHOT" | "LIVE";
type TemplateFilter =
  | "ALL"
  | "official-long"
  | "visual-activity"
  | "executive-brief"
  | "UNKNOWN";
type PendingAction =
  | {
      type: "APPROVE";
      report: ReportDashboardItem;
    }
  | {
      type: "ARCHIVE";
      report: ReportDashboardItem;
    }
  | {
      type: "DUPLICATE";
      report: ReportDashboardItem;
    }
  | null;

export function ReportsDashboard({ reports, stats }: ReportsDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReportStatus>("ALL");
  const [snapshotFilter, setSnapshotFilter] = useState<SnapshotFilter>("ALL");
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState("");

  const services = useMemo(() => {
    const unique = new Map<string, string>();

    for (const report of reports) {
      unique.set(report.caseEntry.service.slug, report.caseEntry.service.name);
    }

    return Array.from(unique.entries()).map(([slug, name]) => ({
      slug,
      name,
    }));
  }, [reports]);

  const filteredReports = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return reports.filter((report) => {
      const searchableText = [
        report.title,
        report.status,
        report.serviceSlug,
        report.caseEntry.title,
        report.caseEntry.service.name,
        report.caseEntry.student?.fullName,
        report.caseEntry.student?.nationalId,
        report.caseEntry.student?.grade,
        report.caseEntry.student?.classroom,
        getTemplateName(report.templateId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = keyword ? searchableText.includes(keyword) : true;

      const matchesStatus =
        statusFilter === "ALL" ? true : report.status === statusFilter;

      const matchesSnapshot =
        snapshotFilter === "ALL"
          ? true
          : snapshotFilter === "SNAPSHOT"
            ? report.hasReportDataSnapshot
            : !report.hasReportDataSnapshot;

      const normalizedTemplate = normalizeTemplateFilter(report.templateId);

      const matchesTemplate =
        templateFilter === "ALL" ? true : normalizedTemplate === templateFilter;

      const matchesService =
        serviceFilter === "ALL"
          ? true
          : report.caseEntry.service.slug === serviceFilter;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesSnapshot &&
        matchesTemplate &&
        matchesService
      );
    });
  }, [
    reports,
    query,
    statusFilter,
    snapshotFilter,
    templateFilter,
    serviceFilter,
  ]);
async function runReportAction() {
  if (!pendingAction) {
    return;
  }

  try {
    setActionError("");

    const endpoint =
      pendingAction.type === "APPROVE"
        ? `/api/dashboard/reports/${pendingAction.report.id}/approve`
        : pendingAction.type === "ARCHIVE"
          ? `/api/dashboard/reports/${pendingAction.report.id}/delete`
          : `/api/dashboard/reports/${pendingAction.report.id}/duplicate`;

    const response = await fetch(endpoint, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "تعذر تنفيذ الإجراء.");
    }

    setPendingAction(null);

    if (pendingAction.type === "DUPLICATE" && data.previewUrl) {
      router.push(data.previewUrl);
      router.refresh();
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  } catch (error) {
    setActionError(
      error instanceof Error ? error.message : "تعذر تنفيذ الإجراء."
    );
  }
}
  return (
    <section className="space-y-6">
      <StatsGrid stats={stats} />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              التقارير المحفوظة
            </h2>

            <p className="mt-1 text-sm leading-7 text-slate-500">
              ابحث وفلتر التقارير حسب الحالة، الخدمة، القالب، أو نوع الحفظ
              Snapshot.
            </p>
          </div>

          <Link
            href="/dashboard/report/new"
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            إنشاء تقرير جديد
          </Link>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث باسم الطالب، عنوان التقارير، الخدمة..."
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="ALL">كل الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="GENERATED">مولّد</option>
            <option value="APPROVED">معتمد</option>
            <option value="ARCHIVED">مؤرشف</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="ALL">كل الخدمات</option>
            {services.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
          </select>

          <select
            value={templateFilter}
            onChange={(event) =>
              setTemplateFilter(event.target.value as TemplateFilter)
            }
            className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="ALL">كل القوالب</option>
            <option value="official-long">القالب الرسمي</option>
            <option value="visual-activity">القالب البصري</option>
            <option value="executive-brief">القالب المختصر</option>
            <option value="UNKNOWN">بدون قالب</option>
          </select>

          <select
            value={snapshotFilter}
            onChange={(event) =>
              setSnapshotFilter(event.target.value as SnapshotFilter)
            }
            className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="ALL">كل الأنواع</option>
            <option value="SNAPSHOT">Snapshot ثابت</option>
            <option value="LIVE">Live قديم</option>
          </select>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>النتائج المعروضة</span>
          <span>{filteredReports.length} تقرير</span>
        </div>
      </section>

      {filteredReports.length ? (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <ReportCard
  key={report.id}
  report={report}
  onApprove={() => {
    setActionError("");
    setPendingAction({ type: "APPROVE", report });
  }}
  onArchive={() => {
    setActionError("");
    setPendingAction({ type: "ARCHIVE", report });
  }}
  onDuplicate={() => {
    setActionError("");
    setPendingAction({ type: "DUPLICATE", report });
  }}
/>
          ))}
        </div>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h3 className="text-xl font-black text-slate-900">
            لا توجد تقارير مطابقة
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            غيّر البحث أو الفلاتر، أو أنشئ تقريرًا جديدًا من حالة محفوظة.
          </p>
        </section>
      )}

      {pendingAction ? (
        <ActionConfirmModal
          pendingAction={pendingAction}
          loading={isPending}
          error={actionError}
          onCancel={() => {
            setPendingAction(null);
            setActionError("");
          }}
          onConfirm={runReportAction}
        />
      ) : null}
    </section>
  );
}

function StatsGrid({ stats }: { stats: ReportsStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <StatCard label="إجمالي التقارير" value={stats.total} />
      <StatCard label="معتمدة" value={stats.approved} tone="success" />
      <StatCard label="مسودات" value={stats.draft} tone="neutral" />
      <StatCard label="مولّدة" value={stats.generated} tone="info" />
      <StatCard label="Snapshot ثابت" value={stats.withSnapshot} tone="success" />
      <StatCard label="Live قديم" value={stats.withoutSnapshot} tone="warning" />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "info"
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`rounded-[2rem] border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}
function ReportCard({
  report,
  onApprove,
  onArchive,
  onDuplicate,
}: {
  report: ReportDashboardItem;
  onApprove: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
}) {
  const statusMeta = getReportStatusMeta(report.status);
  const templateName = getTemplateName(report.templateId);
  const canApprove = report.status !== "APPROVED" && report.status !== "ARCHIVED";
  const canArchive = report.status !== "ARCHIVED";

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={statusMeta.label} className={statusMeta.className} />

            <StatusBadge
              label={
                report.hasReportDataSnapshot ? "Snapshot ثابت" : "Live قديم"
              }
              className={
                report.hasReportDataSnapshot
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }
            />

            <StatusBadge
              label={templateName}
              className="border-sky-200 bg-sky-50 text-sky-700"
            />
          </div>

          <h3 className="mt-3 text-xl font-black text-slate-900">
            {report.title}
          </h3>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            {report.caseEntry.service.name}
            {report.caseEntry.student
              ? ` — ${report.caseEntry.student.fullName}`
              : " — بدون طالب مرتبط"}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <InfoBox label="تاريخ الإنشاء" value={formatDate(report.createdAt)} />
            <InfoBox
              label="تاريخ التوليد"
              value={report.generatedAt ? formatDate(report.generatedAt) : "غير محدد"}
            />
            <InfoBox label="عدد الشواهد" value={`${report.evidenceItemsCount}`} />
            <InfoBox
              label="الصف/الفصل"
              value={
                report.caseEntry.student
                  ? [
                      report.caseEntry.student.grade,
                      report.caseEntry.student.classroom
                        ? `فصل ${report.caseEntry.student.classroom}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" - ") || "غير محدد"
                  : "غير مرتبط"
              }
            />
          </div>
        </div>

        <div className="flex min-w-[190px] flex-col gap-2">
          <Link
            href={`/dashboard/report/${report.id}/preview`}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-slate-800"
          >
            معاينة التقارير
          </Link>
{report.status !== "APPROVED" && report.status !== "ARCHIVED" ? (
  <Link
    href={`/dashboard/report/${report.id}/studio`}
    className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm font-black text-sky-700 transition hover:bg-sky-100"
  >
    تعديل التقارير
  </Link>
) : null}
          <Link
            href={`/dashboard/cases/${report.caseEntry.id}`}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            عرض الحالة
          </Link>

          {canApprove ? (
            <button
              type="button"
              onClick={onApprove}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
            >
              اعتماد التقارير
            </button>
          ) : null}

<button
  type="button"
  onClick={onDuplicate}
  className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-100"
>
  نسخ التقارير
</button>

          {canArchive ? (
            <button
              type="button"
              onClick={onArchive}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100"
            >
              أرشفة التقارير
            </button>
          ) : null}

          {report.generatedPdfUrl ? (
            <a
              href={report.generatedPdfUrl}
              className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm font-black text-sky-700 transition hover:bg-sky-100"
            >
              ملف PDF
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-400"
            >
              PDF لاحقًا
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ActionConfirmModal({
  pendingAction,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  pendingAction: NonNullable<PendingAction>;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
 const isApprove = pendingAction.type === "APPROVE";
const isArchive = pendingAction.type === "ARCHIVE";
const isDuplicate = pendingAction.type === "DUPLICATE";
return (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
      <div
        className={[
          "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black",
          isApprove
            ? "bg-emerald-50 text-emerald-700"
            : isArchive
              ? "bg-amber-50 text-amber-700"
              : "bg-sky-50 text-sky-700",
        ].join(" ")}
      >
        {isApprove ? "✓" : isArchive ? "!" : "⧉"}
      </div>

      <div className="mt-4 text-center">
        <h2 className="text-xl font-black text-slate-900">
          {isApprove
            ? "اعتماد التقارير؟"
            : isArchive
              ? "أرشفة التقارير؟"
              : "نسخ التقارير؟"}
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-500">
          {isApprove
            ? "سيتم تغيير حالة التقارير إلى معتمد وتسجيل تاريخ الاعتماد."
            : isArchive
              ? "سيتم نقل التقارير إلى الأرشيف بدل حذفه نهائيًا، حفاظًا على السجلات الرسمية."
              : "سيتم إنشاء نسخة جديدة من التقارير بنفس القالب والـ Snapshot والشواهد، دون التأثير على التقارير الأصلي."}
        </p>

        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-900">
          {pendingAction.report.title}
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          إلغاء
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={[
            "rounded-2xl px-4 py-3 text-sm font-black text-white transition disabled:opacity-50",
            isApprove
              ? "bg-emerald-700 hover:bg-emerald-800"
              : isArchive
                ? "bg-amber-700 hover:bg-amber-800"
                : "bg-sky-700 hover:bg-sky-800",
          ].join(" ")}
        >
          {loading
            ? "جارٍ التنفيذ..."
            : isApprove
              ? "نعم، اعتمد التقارير"
              : isArchive
                ? "نعم، أرشف التقارير"
                : "نعم، انسخ التقارير"}
        </button>
      </div>
    </div>
  </div>
);

}

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {label}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-1 text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function getReportStatusMeta(status: ReportStatus) {
  if (status === "APPROVED") {
    return {
      label: "معتمد",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  if (status === "GENERATED") {
    return {
      label: "مولّد",
      className: "bg-sky-50 text-sky-700 border-sky-200",
    };
  }

  if (status === "ARCHIVED") {
    return {
      label: "مؤرشف",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }

  return {
    label: "مسودة",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  };
}

function normalizeTemplateFilter(value?: string | null): TemplateFilter {
  if (
    value === "official-long" ||
    value === "visual-activity" ||
    value === "executive-brief"
  ) {
    return value;
  }

  return "UNKNOWN";
}

function getTemplateName(value?: string | null) {
  if (value === "visual-activity") return "القالب البصري";
  if (value === "executive-brief") return "القالب المختصر";
  if (value === "official-long") return "القالب الرسمي";
  return "بدون قالب";
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("ar-SA");
  } catch {
    return value;
  }
}