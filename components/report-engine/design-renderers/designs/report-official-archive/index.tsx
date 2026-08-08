import type { ComponentType } from "react";

type ReportOfficialArchiveDesignProps = {
  page?: any;
  context: Record<string, string>;
  previewCase: any;
  pageLabel: string;
  PageBlocks: ComponentType<any>;
  getDesignLogoSrc: (context: Record<string, string>) => string;
};

export function ReportOfficialArchiveDesign({
  page,
  context,
  previewCase,
  pageLabel,
  PageBlocks,
  getDesignLogoSrc,
}: ReportOfficialArchiveDesignProps) {
  const designId = "report-official-archive" as const;
return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden border border-slate-300 bg-white p-[10mm] shadow-xl">
        <div className="relative min-h-[277mm] border-[3px] border-slate-900 p-[8mm]">
          <header className="report-design-header grid grid-cols-[115px_1fr_115px] items-start gap-4 border-b-[3px] border-slate-900 pb-5">
            <div className="text-right text-[11px] font-black leading-6 text-slate-800">
              <p>وزارة التعليم</p>
              <p>الإدارة العامة للتعليم</p>
              <p>مكتب التعليم</p>
            </div>

            <div className="text-center">
              <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="mx-auto h-14 w-auto object-contain" />
              <p className="mt-3 inline-flex rounded-full border border-slate-900 px-4 py-1 text-[11px] font-black text-slate-900">
                تقرير رسمي معتمد
              </p>
              <h1 className="mt-4 text-2xl font-black leading-[1.6] text-slate-950">
                {context["case.title"] || pageLabel}
              </h1>
            </div>

            <div className="text-left text-[11px] font-black leading-6 text-slate-800">
              <p>رقم الحالة</p>
              <p className="truncate">{context["case.id"]}</p>
              <p>{context["case.createdAt"]}</p>
            </div>
          </header>

          <section className="mt-5 grid grid-cols-4 border border-slate-900 text-xs font-black text-slate-800">
            <div className="border-l border-slate-900 bg-slate-100 p-3">الخدمة</div>
            <div className="border-l border-slate-900 p-3">{context["service.name"] || "غير محدد"}</div>
            <div className="border-l border-slate-900 bg-slate-100 p-3">الشواهد</div>
            <div className="p-3">{context["evidence.count"] || "0"}</div>
          </section>

          <main className="mt-6">
            <PageBlocks page={page} context={context} previewCase={previewCase} designId={designId} className="min-h-[184mm]" />
          </main>

          <footer className="absolute bottom-[8mm] left-[8mm] right-[8mm]">
            <div className="grid grid-cols-3 gap-4 text-center text-xs font-black text-slate-800">
              <div className="border-t-2 border-slate-900 pt-3">معد التقرير</div>
              <div className="border-t-2 border-slate-900 pt-3">مدير/مديرة المدرسة</div>
              <div className="border-t-2 border-slate-900 pt-3">الختم</div>
            </div>
          </footer>
        </div>
      </article>
    );
}
