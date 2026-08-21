"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, Download, Eye, FileText, FolderOpen, Search, X } from "lucide-react";
import type { PublicReferenceLibraryItem } from "@/lib/reference-library/reference-library-types";

type Breadcrumb = { id: string; title: string };

export function PublicReferenceLibraryShell({
  initialItems,
  initialBreadcrumbs,
  initialParentId = null,
  initialSearch = "",
}: {
  initialItems: PublicReferenceLibraryItem[];
  initialBreadcrumbs: Breadcrumb[];
  initialParentId?: string | null;
  initialSearch?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [breadcrumbs, setBreadcrumbs] = useState(initialBreadcrumbs);
  const [parentId, setParentId] = useState(initialParentId);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PublicReferenceLibraryItem | null>(null);

  async function loadContents(nextParentId: string | null, nextSearch: string, nextBreadcrumbs: Breadcrumb[]) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (nextParentId) query.set("parentId", nextParentId);
      if (nextSearch.trim()) query.set("q", nextSearch.trim());
      const response = await fetch(`/api/public/counselor-reference-library?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json() as { items?: PublicReferenceLibraryItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل محتوى المكتبة.");
      setItems(payload.items || []);
      setParentId(nextParentId);
      setBreadcrumbs(nextBreadcrumbs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل محتوى المكتبة.");
    } finally {
      setLoading(false);
    }
  }

  function openFolder(item: PublicReferenceLibraryItem) {
    setSearch("");
    void loadContents(item.id, "", [...breadcrumbs, { id: item.id, title: item.title }]);
  }

  function openBreadcrumb(index: number) {
    const nextParentId = index < 0 ? null : breadcrumbs[index]?.id || null;
    const nextBreadcrumbs = index < 0 ? [] : breadcrumbs.slice(0, index + 1);
    setSearch("");
    void loadContents(nextParentId, "", nextBreadcrumbs);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadContents(parentId, search, breadcrumbs);
  }

  const folderCount = items.filter((item) => item.itemType === "FOLDER").length;
  const fileCount = items.filter((item) => item.itemType === "FILE").length;

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm font-black">
            <BookOpen className="h-5 w-5 shrink-0 text-sky-600" />
            <button type="button" onClick={() => openBreadcrumb(-1)} className="rounded-xl px-2 py-2 text-slate-700 transition hover:bg-slate-50">ابدأ الآن</button>
            {breadcrumbs.map((breadcrumb, index) => (
              <span key={breadcrumb.id} className="flex min-w-0 items-center gap-2">
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                <button type="button" onClick={() => openBreadcrumb(index)} className="max-w-[180px] truncate rounded-xl bg-sky-50 px-3 py-2 text-sky-700">{breadcrumb.title}</button>
              </span>
            ))}
          </div>
          <form onSubmit={submitSearch} className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث داخل المكتبة..." className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold outline-none transition focus:border-sky-400 focus:bg-white" />
          </form>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 text-xs font-bold text-slate-400">
          <span>{folderCount} مجلدات</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>{fileCount} ملفات</span>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}
      {loading ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-16 text-center text-sm font-black text-slate-500">جارٍ تحميل المحتوى...</div>
      ) : items.length ? (
        <section className="grid gap-4 md:grid-cols-2" aria-label="محتوى المكتبة">
          {items.map((item) => <PublicReferenceLibraryItem key={item.id} item={item} onOpenFolder={openFolder} onPreview={setPreview} />)}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-sky-600" />
          <h2 className="mt-4 text-xl font-black">لا يوجد محتوى متاح</h2>
          <p className="mt-2 text-sm font-bold text-slate-500">جرّب البحث بكلمات أخرى.</p>
        </section>
      )}

      {preview ? <PublicReferencePreview item={preview} onClose={() => setPreview(null)} /> : null}
    </section>
  );
}

function PublicReferenceLibraryItem({ item, onOpenFolder, onPreview }: { item: PublicReferenceLibraryItem; onOpenFolder: (item: PublicReferenceLibraryItem) => void; onPreview: (item: PublicReferenceLibraryItem) => void }) {
  const isFolder = item.itemType === "FOLDER";
  const fileUrl = `/api/public/counselor-reference-library/${encodeURIComponent(item.id)}/download`;
  const primaryVariant = (item.downloadVariants[0] || "ORIGINAL").toLowerCase();

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">{isFolder ? <FolderOpen className="h-6 w-6" /> : <FileText className="h-6 w-6" />}</div>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-black text-sky-700">{isFolder ? "مجلد" : item.fileExtension?.toUpperCase() || (item.hasPdf ? "PDF" : item.hasDocx ? "Word" : "ملف")}</span>
          <h2 className="mt-1 line-clamp-2 text-lg font-black leading-8 text-slate-950">{item.title}</h2>
          {item.description ? <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-500">{item.description}</p> : null}
          {!isFolder && (item.sizeBytes || item.mimeType) ? <p className="mt-2 text-xs font-bold text-slate-400">{item.mimeType || "ملف"}{item.sizeBytes ? ` · ${formatFileSize(item.sizeBytes)}` : ""}</p> : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {isFolder ? <button type="button" onClick={() => onOpenFolder(item)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"><FolderOpen className="h-4 w-4" />فتح</button> : item.hasPdf ? <button type="button" onClick={() => onPreview(item)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"><Eye className="h-4 w-4" />معاينة</button> : null}
        {!isFolder && item.allowDownload && item.downloadVariants.length ? <a href={`${fileUrl}?variant=${primaryVariant}&download=1`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />تحميل</a> : null}
      </div>
    </article>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} بايت`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} كيلوبايت`;
  return `${(size / 1024 / 1024).toFixed(1)} ميجابايت`;
}

function PublicReferencePreview({ item, onClose }: { item: PublicReferenceLibraryItem; onClose: () => void }) {
  const fileUrl = `/api/public/counselor-reference-library/${encodeURIComponent(item.id)}/download?variant=pdf`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5" dir="rtl">
      <section className="flex max-h-[82dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0"><h2 className="truncate text-base font-black text-slate-950">{item.title}</h2><p className="mt-0.5 text-xs font-bold text-slate-500">معاينة الملف</p></div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="إغلاق"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 flex-1 bg-slate-100"><iframe src={fileUrl} title={`معاينة ${item.title}`} className="h-[58dvh] min-h-[300px] w-full border-0" /></div>
        <footer className="flex shrink-0 gap-2 border-t border-slate-100 bg-white p-3"><a href={`${fileUrl}&download=1`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-700 text-sm font-black text-white hover:bg-sky-800"><Download className="h-4 w-4" />تحميل</a><button type="button" onClick={onClose} className="h-11 rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-700 hover:bg-slate-200">إغلاق</button></footer>
      </section>
    </div>
  );
}
