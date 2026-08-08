import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function GirlsRoseOfficialReportDesign({
  page,
  context,
  previewCase,
  pageLabel,
  PageBlocks,
  MetaCard,
  SideMeta,
  MiniStat,
  DesignFooter,
  getDesignLogoSrc,
  getDesignHeaderAlign,
  getDesignHeaderText,
}: ReportDesignPageComponentProps) {
  const designId = "girls-rose-official" as const;

  return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[34px] border border-rose-100 bg-rose-50 p-[8mm] shadow-xl">
        <div className="relative min-h-[279mm] overflow-hidden rounded-[30px] bg-white p-[11mm]">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-rose-100" />
          <div className="absolute -right-8 top-20 h-28 w-28 rounded-full bg-pink-100" />
          <header className="report-design-header relative z-10 rounded-[28px] border border-rose-100 bg-gradient-to-l from-rose-100 to-white p-6">
            <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="h-14 w-auto object-contain" />
            <p className="mt-5 text-xs font-black text-rose-700">تقرير إرشادي بناتي رسمي</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">{context["case.title"] || pageLabel}</h1>
          </header>

          <PageBlocks page={page} context={context} previewCase={previewCase} designId={designId} className="relative z-10 mt-6 min-h-[185mm]" />
          <DesignFooter text="بناتي وردي رسمي" barClass="from-rose-700 to-pink-200" />
        </div>
      </article>
  );
}

