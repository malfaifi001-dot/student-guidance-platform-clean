type ReportPdfGuidanceCardProps = {
  reportTitle: string;
  serviceName: string;
  editUrl: string;
  pdfPreviewUrl: string;
  pdfDownloadUrl: string;
};

export function ReportPdfGuidanceCard({
  reportTitle,
  serviceName,
  editUrl,
  pdfPreviewUrl,
  pdfDownloadUrl,
}: ReportPdfGuidanceCardProps) {
  return (
    <section
      className="no-print mx-auto mb-4 max-w-[210mm] rounded-[1.75rem] border border-slate-200 bg-white/95 p-4 shadow-sm ring-1 ring-white"
      dir="rtl"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
              معاينة التقارير
            </span>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
              جاهز للمراجعة
            </span>

            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
              {serviceName}
            </span>
          </div>

          <h1 className="mt-3 truncate text-2xl font-black text-slate-950">
            {reportTitle}
          </h1>

          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
            راجع التقارير كما سيظهر للمستفيد. إذا احتجت تعديل النصوص أو الشواهد افتح محرر التقارير، وإذا كان جاهزًا صدّره PDF مباشرة.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[440px] lg:grid-cols-4">
          <a
            href="/dashboard/reports"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            التقارير
          </a>

          <a
            href={editUrl}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            تعديل
          </a>

          <a
            href={pdfPreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800"
          >
            PDF
          </a>

          <a
            href={pdfDownloadUrl}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
          >
            تحميل
          </a>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs font-black text-slate-500">
        <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">
          هذه البطاقة لا تظهر في PDF
        </span>

        <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">
          التعديل لا يغير بيانات الحالة الأصلية
        </span>

        <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">
          التقارير الرسمي يبدأ بالصفحات أدناه
        </span>
      </div>
    </section>
  );
}
