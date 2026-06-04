"use client";

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
    <section className="no-print mx-auto mb-6 max-w-[210mm] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
            معاينة تقرير رسمي
          </p>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            {reportTitle}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            هذا التقرير مرتبط بخدمة{" "}
            <span className="font-black text-slate-900">{serviceName}</span>.
            يمكنك مراجعة الشكل النهائي للتقرير، تعديل المحتوى المسموح به، ثم
            معاينة نسخة PDF أو تحميلها كنسخة رسمية جاهزة للطباعة.
          </p>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            ملاحظة: تعديل التقرير يسمح بتعديل النصوص والشواهد والبيانات القابلة
            للتحرير فقط، أما تصميم القالب الرسمي فيبقى من صلاحيات الأدمن.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-600 shadow-inner">
          الخطوات المقترحة:
          <br />
          1) راجع التقرير
          <br />
          2) عدّل عند الحاجة
          <br />
          3) عاين PDF
          <br />
          4) حمّل النسخة النهائية
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={editUrl}
          className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          تعديل التقرير
        </a>

        <a
          href={pdfPreviewUrl}
          target="_blank"
          className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
        >
          معاينة PDF
        </a>

        <a
          href={pdfDownloadUrl}
          className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
        >
          تحميل PDF
        </a>
      </div>
    </section>
  );
}
