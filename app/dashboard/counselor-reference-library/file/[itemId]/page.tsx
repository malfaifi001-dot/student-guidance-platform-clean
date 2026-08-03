import {
  ArrowRight,
  Download,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import {
  buildReferenceLibraryViewer,
  getVisibleReferenceLibraryItem,
} from "@/lib/reference-library/reference-library-public-service";
import { COUNSELOR_REFERENCE_LIBRARY_SERVICE_SLUG } from "@/lib/reference-library/reference-library-constants";

type PageProps = {
  params: Promise<{
    itemId: string;
  }>;
};

export default async function CounselorReferenceLibraryFilePage({
  params,
}: PageProps) {
  const current = await requireServiceAccessForCurrentUser(
    COUNSELOR_REFERENCE_LIBRARY_SERVICE_SLUG,
  );

  const { itemId } = await params;

  const viewer = buildReferenceLibraryViewer({
    id: current.user.id,
    role: current.user.role,
    schoolAccountId: current.user.schoolAccountId,
  });

  const item = await getVisibleReferenceLibraryItem({
    itemId,
    viewer,
  }).catch(() => null);

  if (!item || item.itemType !== "FILE") {
    notFound();
  }

  const parentHref = item.parentId
    ? `/dashboard/counselor-reference-library/${encodeURIComponent(
        item.parentId,
      )}`
    : "/dashboard/counselor-reference-library";

  const fileUrl = `/api/dashboard/counselor-reference-library/files/${encodeURIComponent(
    item.id,
  )}`;
  const basePdfPreviewUrl = `${fileUrl}?variant=pdf`;
  const pdfPreviewUrl = item.pdfCoverApplied
    ? `${basePdfPreviewUrl}#page=2`
    : basePdfPreviewUrl;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)] sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-black text-sky-700">
                {item.hasPdf ? "PDF" : "Word"}
              </p>

              <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                {item.title}
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
                {item.description ||
                  "معاينة الملف داخل مكتبة الموجه الطلابي."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={parentHref}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowRight className="h-4 w-4" />
              العودة للمحتوى
            </Link>

            {item.allowDownload && item.hasPdf ? (
              <a
                href={`${fileUrl}?variant=pdf&download=1`}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                تحميل PDF
              </a>
            ) : null}

            {item.allowDownload && item.hasDocx ? (
              <a
                href={`${fileUrl}?variant=docx&download=1`}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                تحميل Word
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {item.hasPdf ? (
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <iframe
            src={pdfPreviewUrl}
            title={`معاينة ${item.title}`}
            className="h-[78vh] min-h-[620px] w-full bg-slate-100"
          />
        </section>
      ) : (
        <section className="rounded-[30px] border border-amber-200 bg-amber-50 px-6 py-12 text-center">
          <h2 className="text-lg font-black text-amber-950">
            لا توجد نسخة PDF متاحة للمعاينة
          </h2>

          <p className="mt-2 text-sm font-bold text-amber-800">
            ملفات Word متاحة للتحميل فقط عند السماح بالتحميل.
          </p>
        </section>
      )}
    </div>
  );
}
