"use client";

import {
  BookOpen,
  Download,
  Eye,
  FileText,
  FolderOpen,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ReferenceLibraryItemSummary } from "@/lib/reference-library/reference-library-types";

export function ReferenceLibraryItemCard({
  item,
}: {
  item: ReferenceLibraryItemSummary;
}) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const isFolder = item.itemType === "FOLDER";
  const hasAnyFile = item.hasPdf || item.hasDocx;
  const openHref = isFolder
    ? `/dashboard/counselor-reference-library/${encodeURIComponent(item.id)}`
    : `/dashboard/counselor-reference-library/file/${encodeURIComponent(
        item.id,
      )}`;

  return (
    <>
      <article className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.09)]">
        <Link
          href={openHref}
          className="absolute inset-0 z-0"
          aria-label={`فتح ${item.title}`}
        />

        <div className="pointer-events-none relative z-10">
          <div className="flex items-start gap-4">
            <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              {isFolder ? (
                <FolderOpen className="h-6 w-6" />
              ) : (
                <FileText className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">
                  {isFolder ? (item.parentId ? "قسم" : "حقيبة") : "ملف"}
                </span>

                {!isFolder && item.hasPdf ? (
                  <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700">
                    PDF
                  </span>
                ) : null}

                {!isFolder && item.hasDocx ? (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                    Word
                  </span>
                ) : null}

                {item.pdfCoverApplied ? (
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                    غلاف رسمي
                  </span>
                ) : null}
              </div>

              <h2 className="mt-3 line-clamp-2 text-xl font-black leading-8 text-slate-950">
                {item.title}
              </h2>
            </div>
          </div>

          <p className="mt-4 line-clamp-2 min-h-12 text-sm font-bold leading-6 text-slate-500">
            {item.description ||
              (isFolder
                ? "محتوى معرفي منظم يضم أقسامًا وملفات متعددة."
                : "ملف متاح للقراءة ضمن المرجع الشامل.")}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
            {isFolder ? (
              <span className="rounded-xl bg-slate-50 px-3 py-2">
                {item.childrenCount} عنصر
              </span>
            ) : (
              <>
                <span className="rounded-xl bg-slate-50 px-3 py-2">
                  {formatVariantSize(item)}
                </span>

                <span className="rounded-xl bg-slate-50 px-3 py-2">
                  {item.allowDownload
                    ? "التحميل مسموح"
                    : "التحميل غير متاح"}
                </span>
              </>
            )}

            <span className="rounded-xl bg-slate-50 px-3 py-2">
              تحديث {formatDate(item.updatedAt)}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {isFolder ? (
            <Link
              href={openHref}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <BookOpen className="h-4 w-4" />
              فتح المحتوى
            </Link>
          ) : item.hasPdf ? (
            <Link
              href={openHref}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Eye className="h-4 w-4" />
              معاينة PDF
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-500">
              <Eye className="h-4 w-4" />
              لا توجد معاينة
            </span>
          )}

          {!isFolder && item.allowDownload && hasAnyFile ? (
            <button
              type="button"
              onClick={() => setDownloadOpen(true)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              تحميل
            </button>
          ) : null}
        </div>
      </article>

      {downloadOpen ? (
        <DownloadDialog item={item} onClose={() => setDownloadOpen(false)} />
      ) : null}
    </>
  );
}

function DownloadDialog({
  item,
  onClose,
}: {
  item: ReferenceLibraryItemSummary;
  onClose: () => void;
}) {
  const baseUrl = `/api/dashboard/counselor-reference-library/files/${encodeURIComponent(
    item.id,
  )}`;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-[30px] border border-white/70 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              تحميل الملف
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              اختر النسخة المتاحة للتنزيل من «{item.title}».
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {item.hasPdf ? (
            <a
              href={`${baseUrl}?variant=pdf&download=1`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
            >
              <span>تحميل PDF</span>
              <Download className="h-4 w-4" />
            </a>
          ) : null}

          {item.hasDocx ? (
            <a
              href={`${baseUrl}?variant=docx&download=1`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
            >
              <span>تحميل Word</span>
              <Download className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatVariantSize(item: ReferenceLibraryItemSummary) {
  const sizes = [
    item.pdfSizeBytes ? `PDF ${formatFileSize(item.pdfSizeBytes)}` : null,
    item.docxSizeBytes ? `Word ${formatFileSize(item.docxSizeBytes)}` : null,
  ].filter(Boolean);

  return sizes.length > 0 ? sizes.join(" / ") : "حجم غير محدد";
}

function formatFileSize(size: number | null) {
  if (!size) {
    return "حجم غير محدد";
  }

  if (size < 1024) {
    return `${size} بايت`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} كيلوبايت`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} ميجابايت`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}
