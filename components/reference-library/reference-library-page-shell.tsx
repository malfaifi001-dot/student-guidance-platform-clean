import {
  BookOpen,
  FileText,
  FolderOpen,
  Search,
} from "lucide-react";
import Link from "next/link";
import { ReferenceLibraryItemCard } from "@/components/reference-library/reference-library-item-card";
import type {
  ReferenceLibraryItemSummary,
} from "@/lib/reference-library/reference-library-types";

export function ReferenceLibraryPageShell({
  title,
  description,
  items,
  breadcrumbs,
  search,
}: {
  title: string;
  description: string;
  items: ReferenceLibraryItemSummary[];
  breadcrumbs: Array<{
    id: string;
    title: string;
  }>;
  search: string;
}) {
  const folderCount = items.filter(
    (item) => item.itemType === "FOLDER",
  ).length;

  const fileCount = items.filter(
    (item) => item.itemType === "FILE",
  ).length;

  return (
    <div
      className="space-y-7 pb-12"
      dir="rtl"
    >
      <section className="overflow-hidden rounded-[36px] bg-gradient-to-l from-sky-500 via-sky-600 to-slate-800 p-6 text-white shadow-[0_18px_45px_rgba(30,64,175,0.18)] sm:p-8">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-white/75">
              <BookOpen className="h-4 w-4" />
              مكتبة معرفية
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-white/85 sm:text-base">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-center backdrop-blur">
              <FolderOpen className="mx-auto h-5 w-5" />
              <p className="mt-2 text-2xl font-black">
                {folderCount}
              </p>
              <p className="text-xs font-bold text-white/75">
                مجلدات
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-center backdrop-blur">
              <FileText className="mx-auto h-5 w-5" />
              <p className="mt-2 text-2xl font-black">
                {fileCount}
              </p>
              <p className="text-xs font-bold text-white/75">
                ملفات
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/counselor-reference-library"
              className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            >
              المرجع الشامل
            </Link>

            {breadcrumbs.map(
              (breadcrumb) => (
                <div
                  key={breadcrumb.id}
                  className="flex items-center gap-2"
                >
                  <span className="text-slate-300">
                    ‹
                  </span>

                  <Link
                    href={`/dashboard/counselor-reference-library/${encodeURIComponent(
                      breadcrumb.id,
                    )}`}
                    className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700"
                  >
                    {breadcrumb.title}
                  </Link>
                </div>
              ),
            )}
          </div>

          <form className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              name="q"
              defaultValue={search}
              placeholder="ابحث داخل هذا المستوى..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white sm:w-80"
            />
          </form>
        </div>
      </section>

      {items.length > 0 ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {items.map((item) => (
            <ReferenceLibraryItemCard
              key={item.id}
              item={item}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-sky-50 text-sky-700">
            <BookOpen className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-950">
            لا يوجد محتوى متاح
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm font-bold leading-7 text-slate-500">
            لا توجد حقائب أو ملفات منشورة في هذا
            المستوى، أو لا توجد نتائج مطابقة
            للبحث.
          </p>
        </section>
      )}
    </div>
  );
}