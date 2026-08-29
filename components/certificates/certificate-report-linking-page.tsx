"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  Link2,
  Save,
  Search,
} from "lucide-react";
import { getCertificateTypeLabel } from "@/lib/certificates/certificate-types";

type ReportOption = {
  id: string;
  title?: string | null;
  status: string;
  serviceName?: string | null;
  studentName?: string | null;
  createdAt: string;
  updatedAt: string;
  linkedCertificateIds: string[];
};

type CertificateOption = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientName: string;
  reason?: string | null;
  issueDate: string;
  createdAt: string;
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getReportTitle(report: ReportOption) {
  return report.title || report.serviceName || "تقرير صادر";
}

function getStatusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "SUBMITTED") return "مرسلة";
  if (status === "APPROVED") return "معتمدة";
  if (status === "COMPLETED") return "مكتملة";
  if (status === "CLOSED") return "مغلقة";

  return status || "تقرير";
}

export function CertificateReportLinkingPage() {
  const searchParams = useSearchParams();
  const requestedCertificateId = searchParams.get("certificateId") || "";
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [certificates, setCertificates] = useState<CertificateOption[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>([]);
  const [reportQuery, setReportQuery] = useState("");
  const [certificateQuery, setCertificateQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedReport = useMemo(() => {
    return reports.find((report) => report.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  const selectedCertificates = useMemo(() => {
    const ids = new Set(selectedCertificateIds);
    return certificates.filter((certificate) => ids.has(certificate.id));
  }, [certificates, selectedCertificateIds]);

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      setLoading(true);
      setError("");

      try {
        const search = new URLSearchParams();

        if (reportQuery.trim()) search.set("reportQuery", reportQuery.trim());
        if (certificateQuery.trim()) search.set("certificateQuery", certificateQuery.trim());

        const response = await fetch(`/api/dashboard/certificates/linking?${search.toString()}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "تعذر تحميل خيارات الربط.");
        }

        if (!ignore) {
          const nextReports = Array.isArray(data.reports) ? data.reports : [];
          const nextCertificates = Array.isArray(data.certificates) ? data.certificates : [];

          setReports(nextReports);
          setCertificates(nextCertificates);

          const requestedCertificateExists = requestedCertificateId
            ? nextCertificates.some((certificate: CertificateOption) => certificate.id === requestedCertificateId)
            : false;

          if (!selectedReportId && nextReports.length) {
            setSelectedReportId(nextReports[0].id);
            setSelectedCertificateIds(
              requestedCertificateExists
                ? [requestedCertificateId]
                : nextReports[0].linkedCertificateIds || [],
            );
          } else if (selectedReportId) {
            const stillSelected = nextReports.find((report: ReportOption) => report.id === selectedReportId);

            if (stillSelected) {
              setSelectedCertificateIds((current) => {
                if (current.length) return current;
                return stillSelected.linkedCertificateIds || [];
              });
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "تعذر تحميل خيارات الربط.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadOptions, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [reportQuery, certificateQuery, requestedCertificateId]);

  function selectReport(report: ReportOption) {
    setSelectedReportId(report.id);
    setSelectedCertificateIds(report.linkedCertificateIds || []);
    setNotice("");
    setError("");
  }

  function toggleCertificate(certificateId: string) {
    setSelectedCertificateIds((current) => {
      if (current.includes(certificateId)) {
        return current.filter((id) => id !== certificateId);
      }

      return [...current, certificateId];
    });

    setNotice("");
  }

  async function saveLinks() {
    if (!selectedReportId) {
      setError("اختر التقرير أولًا.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/dashboard/certificates/linking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId: selectedReportId,
          certificateIds: selectedCertificateIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ الربط.");
      }

      setReports((current) =>
        current.map((report) =>
          report.id === selectedReportId
            ? { ...report, linkedCertificateIds: data.certificateIds || [] }
            : report,
        ),
      );

      setSelectedCertificateIds(data.certificateIds || []);
      setNotice(`تم ربط ${data.linkedCount || 0} شهادة بالتقرير. ستظهر في آخر التقرير عند تحميل PDF.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الربط.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-4 text-white shadow-xl sm:rounded-[2.5rem] sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-black text-sky-100">Certificates Linking</p>
            <h1 className="mt-3 text-2xl font-black sm:text-4xl">ربط الشهادات بالتقارير</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              اختر تقريرًا صادرًا، ثم اربط شهادة أو أكثر. عند تحميل التقرير PDF ستضاف الشهادات في آخر التقرير مباشرة.
            </p>
          </div>

          <Link
            href="/dashboard/certificates"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للشهادات
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Metric
          icon={<FileText className="h-5 w-5" />}
          label="التقارير المعروضة"
          value={String(reports.length)}
        />

        <Metric
          icon={<Award className="h-5 w-5" />}
          label="الشهادات المعروضة"
          value={String(certificates.length)}
        />

        <Metric
          icon={<Link2 className="h-5 w-5" />}
          label="المحددة للربط"
          value={String(selectedCertificateIds.length)}
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-xs font-black text-sky-700">الربط النشط</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {selectedReport ? getReportTitle(selectedReport) : "اختر تقريرًا"}
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              {selectedReport
                ? `${selectedReport.serviceName || "خدمة غير محددة"} · ${selectedReport.studentName || "بدون طالب"}`
                : "حدد تقريرًا من القائمة اليمنى ثم اختر الشهادات."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedReport ? (
              <Link
                href={`/dashboard/report-2/cases/${selectedReport.id}/studio`}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                فتح التقرير
              </Link>
            ) : null}

            <button
              type="button"
              onClick={saveLinks}
              disabled={saving || !selectedReportId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "جاري الحفظ..." : "حفظ الربط"}
            </button>
          </div>
        </div>

        {notice ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-black text-sky-700">التقارير الصادرة</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">اختر التقرير</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              يظهر آخر التقارير والحالات، ويمكن البحث بالطالب أو الخدمة أو عنوان التقرير.
            </p>
          </div>

          <div className="relative mb-5">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={reportQuery}
              onChange={(event) => setReportQuery(event.target.value)}
              placeholder="بحث في التقارير..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
            />
          </div>

          <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
            {loading ? (
              <EmptyState text="جاري تحميل التقارير..." />
            ) : reports.length ? (
              reports.map((report) => {
                const selected = report.id === selectedReportId;

                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => selectReport(report)}
                    className={[
                      "w-full rounded-[2rem] border p-5 text-right transition",
                      selected
                        ? "border-sky-300 bg-sky-50"
                        : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-black leading-7 text-slate-950">
                          {getReportTitle(report)}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {report.serviceName || "خدمة غير محددة"} · {report.studentName || "بدون طالب"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          آخر تحديث: {formatDate(report.updatedAt)}
                        </p>
                      </div>

                      <div className="shrink-0 space-y-2 text-left">
                        <span className="block rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                          {getStatusLabel(report.status)}
                        </span>

                        {report.linkedCertificateIds?.length ? (
                          <span className="block rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                            {report.linkedCertificateIds.length} شهادة
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState text="لا توجد تقارير مطابقة." />
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-black text-sky-700">الشهادات الصادرة</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">اختر شهادة أو أكثر</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              يمكن ربط أكثر من شهادة بنفس التقرير، وستظهر كلها في آخر PDF بالترتيب المحدد.
            </p>
          </div>

          <div className="relative mb-5">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={certificateQuery}
              onChange={(event) => setCertificateQuery(event.target.value)}
              placeholder="بحث في الشهادات..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
            />
          </div>

          {selectedCertificates.length ? (
            <div className="mb-5 rounded-[2rem] bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs font-black text-emerald-700">الشهادات المحددة</p>
              <p className="mt-2 text-sm font-bold leading-7 text-emerald-900">
                {selectedCertificates.map((item) => item.recipientName).join("، ")}
              </p>
            </div>
          ) : null}

          <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
            {loading ? (
              <EmptyState text="جاري تحميل الشهادات..." />
            ) : certificates.length ? (
              certificates.map((certificate) => {
                const selected = selectedCertificateIds.includes(certificate.id);

                return (
                  <button
                    key={certificate.id}
                    type="button"
                    onClick={() => toggleCertificate(certificate.id)}
                    className={[
                      "w-full rounded-[2rem] border p-5 text-right transition",
                      selected
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                            {getCertificateTypeLabel(certificate.certificateType)}
                          </span>

                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                            {certificate.certificateNumber}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-black leading-7 text-slate-950">
                          {certificate.recipientName}
                        </h3>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          تاريخ الإصدار: {formatDate(certificate.issueDate)}
                        </p>

                        <p className="mt-3 line-clamp-2 text-xs font-black leading-6 text-slate-500">
                          {certificate.reason || "بدون سبب تكريم"}
                        </p>
                      </div>

                      <span
                        className={[
                          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                          selected
                            ? "bg-emerald-700 text-white"
                            : "bg-white text-slate-300 ring-1 ring-slate-200",
                        ].join(" ")}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState text="لا توجد شهادات مطابقة." />
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>
        <div>
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <p className="text-sm font-black text-slate-500">{text}</p>
    </div>
  );
}
