"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
  Users,
} from "lucide-react";
import {
  CERTIFICATE_RECIPIENT_TYPES,
  CERTIFICATE_TYPES,
  getCertificateTypeLabel,
} from "@/lib/certificates/certificate-types";

type CertificateArchiveItem = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  reason?: string | null;
  title: string;
  issueDate: string;
  status: string;
  pdfUrl?: string | null;
  batchId?: string | null;
  batchNumber?: string | null;
  createdAt: string;
};

type ArchiveEntry =
  | {
      kind: "batch";
      batchId: string;
      batchNumber: string;
      createdAt: string;
      issueDate: string;
      count: number;
      firstItem: CertificateArchiveItem;
      certificateTypes: string[];
      namesPreview: string[];
    }
  | {
      kind: "single";
      item: CertificateArchiveItem;
    };

function sanitizeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCertificateFileDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "غير محدد";

  try {
    return new Date(value).toLocaleDateString("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function getRecipientLabel(value: string) {
  return (
    CERTIFICATE_RECIPIENT_TYPES.find((item) => item.value === value)?.label ||
    "مستفيد"
  );
}

function getCertificateStatusLabel(status: string) {
  if (status === "ISSUED") return "مصدرة";
  if (status === "DRAFT") return "مسودة";
  if (status === "CANCELED") return "ملغاة";

  return status || "مصدرة";
}

function getCertificateStatusClass(status: string) {
  if (status === "CANCELED") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
  }

  if (status === "DRAFT") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  }

  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
}

function buildArchiveEntries(items: CertificateArchiveItem[]): ArchiveEntry[] {
  const batches = new Map<string, CertificateArchiveItem[]>();
  const singles: CertificateArchiveItem[] = [];

  for (const item of items) {
    if (item.batchId) {
      const current = batches.get(item.batchId) || [];
      current.push(item);
      batches.set(item.batchId, current);
    } else {
      singles.push(item);
    }
  }

  const batchEntries: ArchiveEntry[] = Array.from(batches.entries()).map(
    ([batchId, batchItems]) => {
      const sorted = [...batchItems].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const firstItem = sorted[0];
      const certificateTypes = Array.from(
        new Set(sorted.map((item) => item.certificateType).filter(Boolean)),
      );

      return {
        kind: "batch",
        batchId,
        batchNumber: firstItem.batchNumber || batchId,
        createdAt: firstItem.createdAt,
        issueDate: firstItem.issueDate,
        count: sorted.length,
        firstItem,
        certificateTypes,
        namesPreview: sorted.slice(0, 4).map((item) => item.recipientName),
      };
    },
  );

  const singleEntries: ArchiveEntry[] = singles.map((item) => ({
    kind: "single",
    item,
  }));

  return [...batchEntries, ...singleEntries].sort((a, b) => {
    const aDate = a.kind === "batch" ? a.createdAt : a.item.createdAt;
    const bDate = b.kind === "batch" ? b.createdAt : b.item.createdAt;

    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

function SimpleMetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
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

export function CertificatesArchivePage() {
  const [items, setItems] = useState<CertificateArchiveItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState("");
  const [exportingBatchId, setExportingBatchId] = useState("");
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const search = new URLSearchParams();

    if (query.trim()) search.set("query", query.trim());
    if (type) search.set("type", type);
    if (recipientType) search.set("recipientType", recipientType);

    return search.toString();
  }, [query, type, recipientType]);

  const archiveEntries = useMemo(() => buildArchiveEntries(items), [items]);

  const batchCount = useMemo(() => {
    return archiveEntries.filter((entry) => entry.kind === "batch").length;
  }, [archiveEntries]);

  const singleCount = useMemo(() => {
    return archiveEntries.filter((entry) => entry.kind === "single").length;
  }, [archiveEntries]);

  const issuedThisMonth = useMemo(() => {
    const now = new Date();

    return items.filter((item) => {
      const date = new Date(item.issueDate);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }).length;
  }, [items]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/dashboard/certificates?${params}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "تعذر تحميل الشهادات.");
        }

        if (!ignore) {
          setItems(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "تعذر تحميل الشهادات.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [params]);

  async function exportPdf(item: CertificateArchiveItem) {
    if (exportingId) return;

    setExportingId(item.id);
    setError("");

    try {
      const fileName = sanitizeFileName(
        `${getCertificateTypeLabel(item.certificateType)} - ${
          item.recipientName || "مستفيد"
        } - ${formatCertificateFileDate(item.issueDate)}.pdf`,
      );

      const response = await fetch(
        `/api/dashboard/certificates/${encodeURIComponent(item.id)}/export/pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileName }),
        },
      );

      if (!response.ok) {
        throw new Error("تعذر تصدير PDF.");
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json = await response.json();

        if (json.fallback === "PRINT_PREVIEW" && json.previewUrl) {
          const previewWindow = window.open(
            json.previewUrl,
            "_blank",
            "noopener,noreferrer",
          );

          if (!previewWindow) {
            window.location.href = json.previewUrl;
          }

          return;
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تصدير PDF.");
    } finally {
      setExportingId("");
    }
  }

  async function exportBatchPdf(entry: Extract<ArchiveEntry, { kind: "batch" }>) {
    if (!entry.batchId || exportingBatchId) return;

    setExportingBatchId(entry.batchId);
    setError("");

    try {
      const fileName = sanitizeFileName(
        `دفعة شهادات - ${entry.batchNumber || entry.batchId} - ${formatCertificateFileDate(entry.issueDate)}.pdf`,
      );

      const response = await fetch(
        `/api/dashboard/certificates/batches/${encodeURIComponent(entry.batchId)}/export/pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileName }),
        },
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل الدفعة.");
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json = await response.json();

        if (json.fallback === "PRINT_PREVIEW" && json.previewUrl) {
          const previewWindow = window.open(
            json.previewUrl,
            "_blank",
            "noopener,noreferrer",
          );

          if (!previewWindow) {
            window.location.href = json.previewUrl;
          }

          return;
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الدفعة.");
    } finally {
      setExportingBatchId("");
    }
  }

  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-black text-sky-100">الشهادات</p>

            <h1 className="mt-3 text-4xl font-black">الشهادات والتكريم</h1>

            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              إدارة الشهادات والدفعات.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/certificates/linking"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 py-3 text-sm font-black text-white ring-1 ring-white/30 transition hover:bg-white/20"
            >
              ربط بالتقرير
            </Link>

            <Link
              href="/dashboard/certificates/bulk"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 py-3 text-sm font-black text-white ring-1 ring-white/30 transition hover:bg-white/20"
            >
              إصدار جماعي
            </Link>

            <Link
              href="/dashboard/certificates/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
            >
              <Plus className="h-4 w-4" />
              إنشاء شهادة جديدة
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SimpleMetricCard
          icon={<Award className="h-5 w-5" />}
          label="إجمالي الشهادات"
          value={formatCount(total)}
        />

        <SimpleMetricCard
          icon={<Users className="h-5 w-5" />}
          label="الدفعات"
          value={formatCount(batchCount)}
        />

        <SimpleMetricCard
          icon={<FileText className="h-5 w-5" />}
          label="شهادات فردية"
          value={formatCount(singleCount)}
        />

        <SimpleMetricCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="هذا الشهر"
          value={formatCount(issuedThisMonth)}
        />
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">البحث والفلاتر</p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              أرشيف الدفعات والشهادات الفردية
            </h2>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              ابحث وفلتر الشهادات.
            </p>
          </div>

          
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="بحث سريع..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
            />
          </div>

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-sky-200 focus:bg-white"
          >
            <option value="">كل أنواع الشهادات</option>
            {CERTIFICATE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={recipientType}
            onChange={(event) => setRecipientType(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-sky-200 focus:bg-white"
          >
            <option value="">كل المستفيدين</option>
            {CERTIFICATE_RECIPIENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">السجلات</p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              الدفعات والشهادات الفردية
            </h2>

            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              عرض الدفعات والشهادات.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-100">
              <Search className="h-7 w-7" />
            </div>

            <p className="mt-4 text-sm font-black text-slate-500">
              جاري تحميل الأرشيف...
            </p>
          </div>
        ) : archiveEntries.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {archiveEntries.map((entry) => {
              if (entry.kind === "batch") {
                return (
                  <article
                    key={entry.batchId}
                    className="rounded-[2rem] border border-sky-100 bg-sky-50/60 p-5 transition hover:border-sky-200 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-sky-700 px-3 py-1 text-xs font-black text-white">
                        دفعة شهادات
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                        {formatCount(entry.count)} شهادة
                      </span>

                      {entry.certificateTypes.slice(0, 2).map((certificateType) => (
                        <span
                          key={certificateType}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100"
                        >
                          {getCertificateTypeLabel(certificateType)}
                        </span>
                      ))}
                    </div>

                    <h3 className="mt-3 text-xl font-black leading-8 text-slate-950">
                      دفعة شهادات
                    </h3>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      رقم الدفعة: {entry.batchNumber}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      تاريخ الإصدار: {formatDate(entry.issueDate)}
                    </p>

                    <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-xs font-black leading-6 text-slate-500 ring-1 ring-slate-100">
                      المستفيدون: {entry.namesPreview.join("، ")}
                      {entry.count > entry.namesPreview.length ? "..." : ""}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 pt-4">
                      <Link
                        href={`/dashboard/certificates/batches/${entry.batchId}`}
                        className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-2.5 text-xs font-black text-sky-700 transition hover:bg-sky-50"
                      >
                        <Eye className="h-4 w-4" />
                        تفاصيل الدفعة
                      </Link>

                      <button
                        type="button"
                        onClick={() => exportBatchPdf(entry)}
                        disabled={exportingBatchId === entry.batchId}
                        className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-sky-800 disabled:opacity-60"
                      >
                        <Download className="h-4 w-4" />
                        {exportingBatchId === entry.batchId
                          ? "جاري تحميل الدفعة"
                          : "تحميل الدفعة"}
                      </button>
                    </div>
                  </article>
                );
              }

              const item = entry.item;

              return (
                <article
                  key={item.id}
                  className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-white hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-black",
                          getCertificateStatusClass(item.status),
                        ].join(" ")}
                      >
                        {getCertificateStatusLabel(item.status)}
                      </span>

                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                        {getCertificateTypeLabel(item.certificateType)}
                      </span>

                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                        {getRecipientLabel(item.recipientType)}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-black leading-8 text-slate-950">
                      {item.recipientName}
                    </h3>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      تاريخ الإصدار: {formatDate(item.issueDate)}
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                    سبب التكريم: {item.reason || "غير محدد"}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <a
                      href={`/dashboard/certificates/${item.id}/preview-print`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      عرض
                    </a>

                    <button
                      type="button"
                      onClick={() => exportPdf(item)}
                      disabled={exportingId === item.id}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      {exportingId === item.id ? "جاري التحميل" : "تحميل فردي"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-100">
              <Search className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-800">
              لا توجد سجلات بعد
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-500">
              ابدأ بإنشاء شهادة فردية أو إصدار دفعة شهادات.
            </p>

            <Link
              href="/dashboard/certificates/new"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              إنشاء شهادة جديدة
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
