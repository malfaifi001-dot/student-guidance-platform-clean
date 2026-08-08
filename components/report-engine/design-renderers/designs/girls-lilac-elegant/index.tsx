import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function GirlsLilacElegantReportDesign({
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
  const designId = "girls-lilac-elegant" as const;

  return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[34px] border border-violet-100 bg-violet-50 p-[8mm] shadow-xl">
        <div className="relative grid min-h-[279mm] grid-cols-[1fr_32mm] overflow-hidden rounded-[28px] bg-white">
          <div className="relative p-[11mm]">
            <header className="report-design-header border-b border-violet-100 pb-5">
              <p className="text-xs font-black text-violet-700">تقرير إرشادي أنيق</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">{context["case.title"] || pageLabel}</h1>
              <p className="mt-2 text-xs font-bold text-slate-500">{context["service.name"]}</p>
            </header>
            <PageBlocks page={page} context={context} previewCase={previewCase} designId={designId} className="mt-6 min-h-[200mm]" />
            <DesignFooter text="بناتي ليلكي أنيق" barClass="from-violet-800 to-fuchsia-200" />
          </div>

          <aside className="bg-gradient-to-b from-violet-700 to-fuchsia-500 p-5 text-white">
            <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="mx-auto h-14 w-auto object-contain brightness-0 invert" />
            <div className="mx-auto mt-10 h-40 w-px bg-white/40" />
            <p className="mt-5 rotate-180 text-center text-xs font-black [writing-mode:vertical-rl]">منصة التوجيه الطلابي</p>
          </aside>
        </div>
      </article>
  );
}

