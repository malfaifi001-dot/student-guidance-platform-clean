import type { ComponentType } from "react";

type ReportCalmReaderDesignProps = {
  page?: any;
  context: Record<string, string>;
  previewCase: any;
  pageLabel: string;
  PageBlocks: ComponentType<any>;
  SideMeta: ComponentType<{
    label: string;
    value: string;
  }>;
  DesignFooter: ComponentType<{
    text: string;
    barClass: string;
  }>;
  getDesignLogoSrc: (context: Record<string, string>) => string;
};

export function ReportCalmReaderDesign({
  page,
  context,
  previewCase,
  pageLabel,
  PageBlocks,
  SideMeta,
  DesignFooter,
  getDesignLogoSrc,
}: ReportCalmReaderDesignProps) {
  const designId = "report-calm-reader" as const;
return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[20px] border border-stone-200 bg-stone-50 p-[8mm] shadow-xl">
        <div className="grid min-h-[279mm] grid-cols-[38mm_1fr] overflow-hidden rounded-[18px] bg-white">
          <aside className="border-l border-stone-200 bg-stone-100 p-5">
            <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="mx-auto h-14 w-auto object-contain opacity-80" />

            <div className="mt-10 space-y-4">
              <SideMeta label="الخدمة" value={context["service.name"]} />
              <SideMeta label="التاريخ" value={context["case.createdAt"]} />
              <SideMeta label="الطالب/ـة" value={context["student.name"]} />
              <SideMeta label="الشواهد" value={context["evidence.count"]} />
            </div>
          </aside>

          <div className="relative p-[12mm]">
            <header className="report-design-header border-b border-stone-200 pb-6">
              <p className="text-xs font-black text-stone-500">تقرير مريح للقراءة</p>
              <h1 className="mt-3 max-w-[135mm] text-3xl font-black leading-[1.7] text-stone-950">
                {context["case.title"] || pageLabel}
              </h1>
              <p className="mt-3 text-xs font-bold leading-6 text-stone-500">
                تم ترتيب هذا التقرير بأسلوب هادئ ليسهل استعراض البيانات والقيم دون ازدحام بصري.
              </p>
            </header>

            <PageBlocks page={page} context={context} previewCase={previewCase} designId={designId} className="mt-7 min-h-[192mm]" />
            <DesignFooter text="تقرير مريح للقراءة" barClass="from-stone-700 to-stone-300" />
          </div>
        </div>
      </article>
    );
}
