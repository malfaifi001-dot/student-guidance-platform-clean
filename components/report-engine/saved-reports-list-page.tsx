import Link from "next/link";
import { ArrowRight, Eye, FileText, Plus } from "lucide-react";

type SavedReportListItem = {
  id: string;
  title: string;
  status: string;
  serviceSlug: string;
  generatedAt: string;
  createdAt: string;
  templateSnapshot: unknown;
  caseEntry: {
    id: string;
    title: string | null;
    service: {
      name: string;
      slug: string;
    } | null;
    student: {
      fullName: string;
      grade: string | null;
      classroom: string | null;
    } | null;
  } | null;
};

type SavedReportsListPageProps = {
  reports: SavedReportListItem[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getReportVariantName(report: SavedReportListItem) {
  const snapshot = asRecord(report.templateSnapshot);

  return (
    String(snapshot.variantShortName || snapshot.variantName || "").trim() ||
    "تقرير محفوظ"
  );
}

function getReportStatusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "GENERATED") return "محفوظ";
  if (status === "APPROVED") return "معتمد";
  if (status === "ARCHIVED") return "مؤرشف";

  return status || "غير محدد";
}

function formatDate(value: string) {
  if (!value) return "غير محدد";

  try {
    return new Date(value).toLocaleDateString("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return value;
  }
}

export function SavedReportsListPage({ reports }: SavedReportsListPageProps) {
  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-700">
              التقارير المحفوظة
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              كل التقارير الصادرة
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-500">
              هذه القائمة تعرض النسخ الثابتة المحفوظة من التقارير. فتح التقرير لا يعيد بناءه من بيانات الحالة، بل يعرض النسخة التي تم حفظها وقت الإصدار.
            </p>
          </div>

          <Link
            href="/dashboard/cases"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            إصدار تقرير من حالة
          </Link>
        </div>
      </section>

      {reports.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                      {getReportStatusLabel(report.status)}
                    </span>

                    <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                      {getReportVariantName(report)}
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-black leading-8 text-slate-950">
                    {report.title || "تقرير محفوظ"}
                  </h2>

                  <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                    {report.caseEntry?.service?.name || report.serviceSlug}
                    {report.caseEntry?.student?.fullName
                      ? ` · ${report.caseEntry.student.fullName}`
                      : ""}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <FileText className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4 text-xs font-black text-slate-500 md:grid-cols-3">
                <div>
                  <span className="block text-slate-400">تاريخ الحفظ</span>
                  <strong className="mt-1 block text-slate-800">
                    {formatDate(report.generatedAt || report.createdAt)}
                  </strong>
                </div>

                <div>
                  <span className="block text-slate-400">الحالة المرتبطة</span>
                  <strong className="mt-1 block truncate text-slate-800">
                    {report.caseEntry?.title || report.caseEntry?.id || "غير محدد"}
                  </strong>
                </div>

                <div>
                  <span className="block text-slate-400">الخدمة</span>
                  <strong className="mt-1 block truncate text-slate-800">
                    {report.caseEntry?.service?.name || report.serviceSlug}
                  </strong>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/reports/${report.id}/preview`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  <Eye className="h-4 w-4" />
                  فتح التقرير
                </Link>

                {report.caseEntry?.id ? (
                  <Link
                    href={`/dashboard/cases/${report.caseEntry.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                    فتح الحالة
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-black text-slate-500">
            لا توجد تقارير محفوظة حتى الآن.
          </p>

          <Link
            href="/dashboard/cases"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            اختر حالة لإصدار تقرير
          </Link>
        </section>
      )}
    </main>
  );
}