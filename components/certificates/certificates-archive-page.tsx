"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  Link2,
  Plus,
  Search,
} from "lucide-react";
import {
  CERTIFICATE_RECIPIENT_TYPES,
  CERTIFICATE_TYPES,
  getCertificateTypeLabel,
} from "@/lib/certificates/certificate-types";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import { CurriculumDistributionMobilePreview } from "@/components/curriculum-distribution/curriculum-distribution-mobile-preview";
import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";

type CertificateArchiveItem = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  reason?: string | null;
  body?: string | null;
  title: string;
  dataJson?: string | null;
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

export function CertificatesArchivePage() {
  const [items, setItems] = useState<CertificateArchiveItem[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState("");
  const [exportingBatchId, setExportingBatchId] = useState("");
  const printExport = usePrintExportAction();
  const [error, setError] = useState("");
  const [previewItem, setPreviewItem] = useState<CertificateArchiveItem | null>(null);

  const params = useMemo(() => {
    const search = new URLSearchParams();

    if (query.trim()) search.set("query", query.trim());
    if (type) search.set("type", type);
    if (recipientType) search.set("recipientType", recipientType);

    return search.toString();
  }, [query, type, recipientType]);

  const archiveEntries = useMemo(() => buildArchiveEntries(items), [items]);

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

  async function exportPdf(item: CertificateArchiveItem): Promise<boolean> {
    if (exportingId) return false;

    setExportingId(item.id);
    setError("");

    try {
      const fileName = sanitizeFileName(
        `${getCertificateTypeLabel(item.certificateType)} - ${
          item.recipientName || "مستفيد"
        } - ${formatCertificateFileDate(item.issueDate)}.pdf`,
      );

      const result = await printExport.runPrintExport({
        exportUrl: `/api/dashboard/certificates/${encodeURIComponent(item.id)}/export/pdf`,
        printUrl: `/certificate-preview/${encodeURIComponent(item.id)}`,
        method: "POST",
        body: { fileName },
        fileName,
        nativeDelivery: "share",
        blockedTitle: "معاينة طباعة الشهادة",
        errorTitle: "تصدير الشهادة",
        errorMessage: "تعذر تصدير الشهادة أو فتح معاينة الطباعة.",
      });
      return result !== "error";
    } catch (err: any) {
      return false;
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

      await printExport.runPrintExport({
        exportUrl: `/api/dashboard/certificates/batches/${encodeURIComponent(entry.batchId)}/export/pdf`,
        printUrl: `/certificate-batch-preview/${encodeURIComponent(entry.batchId)}`,
        method: "POST",
        body: { fileName },
        fileName,
        nativeDelivery: "share",
        blockedTitle: "معاينة طباعة الدفعة",
        errorTitle: "تصدير الدفعة",
        errorMessage: "تعذر تحميل الدفعة أو فتح معاينة الطباعة.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الدفعة.");
    } finally {
      setExportingBatchId("");
    }
  }

  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-4 text-white shadow-xl sm:rounded-[2.5rem] sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="text-2xl font-black sm:text-4xl">الشهادات</h1>

          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/certificates/bulk"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 py-3 text-sm font-black text-white ring-1 ring-white/30 transition hover:bg-white/20"
            >
              إصدار جماعي
            </Link>

            <Link
              href="/dashboard/certificates/new"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50 sm:w-auto sm:px-6"
            >
              <Plus className="h-4 w-4" />
              إنشاء شهادة جديدة
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">السجلات</p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              الشهادات الفردية والجماعية
            </h2>

          </div>
        </div>

        <div className="mb-5 grid gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,.8fr)_minmax(0,.8fr)] sm:p-2.5">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="بحث سريع..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200"
            />
          </div>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-sky-200"
          >
            <option value="">كل أنواع الشهادات</option>
            {CERTIFICATE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select
            value={recipientType}
            onChange={(event) => setRecipientType(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition focus:border-sky-200"
          >
            <option value="">كل المستفيدين</option>
            {CERTIFICATE_RECIPIENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl bg-rose-50 p-3 text-sm font-black text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        ) : null}

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
                  className="relative rounded-[2rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-white hover:shadow-md"
                >
                  <div className="absolute left-5 top-5 z-10">
                    <ExpandableActionMenu menuId={`certificate:${item.id}`} overlayStrip>
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        aria-label="عرض الشهادة"
                        title="عرض الشهادة"
                        className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <Link
                        href={`/dashboard/certificates/linking?certificateId=${encodeURIComponent(item.id)}`}
                        aria-label="ربط الشهادة بالتقرير"
                        title="ربط الشهادة بالتقرير"
                        className="grid h-10 w-10 place-items-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 shadow-sm transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      >
                        <Link2 className="h-4 w-4" aria-hidden="true" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => exportPdf(item)}
                        disabled={exportingId === item.id}
                        aria-label="تحميل الشهادة"
                        title={exportingId === item.id ? "جاري التحميل" : "تحميل الشهادة"}
                        className="grid h-10 w-10 place-items-center rounded-full bg-sky-700 text-white shadow-sm transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-wait disabled:opacity-60"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </ExpandableActionMenu>
                  </div>

                  <div className="min-w-0 pt-14">
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

      <PrintExportPopCard
        modal={printExport.modal}
        onClose={printExport.closeModal}
        onOpenFallback={printExport.openFallbackPrintUrl}
      />

      <CurriculumDistributionMobilePreview
        open={Boolean(previewItem)}
        previewUrl={previewItem ? `/certificate-preview/${encodeURIComponent(previewItem.id)}` : ""}
        onClose={() => setPreviewItem(null)}
        onDownload={async () => {
          if (!previewItem) return false;
          const itemToExport = previewItem;
          setPreviewItem(null);
          return Boolean(await exportPdf(itemToExport));
        }}
        title="معاينة الشهادة"
        subtitle="راجع الشهادة قبل تحميلها أو طباعتها."
        documentSelector=".certificate-shell"
        documentLabel="الشهادة"
        documentOrientation="landscape"
        hideDocumentScrollbars
      />
    </main>
  );
}
