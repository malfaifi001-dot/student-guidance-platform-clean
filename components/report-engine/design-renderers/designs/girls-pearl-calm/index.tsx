import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function GirlsPearlCalmReportDesign({
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
  const designId = "girls-pearl-calm" as const;

  return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[36px] border border-fuchsia-100 bg-fuchsia-50 p-[8mm] shadow-xl">
        <div className="relative min-h-[279mm] rounded-[32px] border border-fuchsia-100 bg-gradient-to-b from-white via-white to-fuchsia-50 p-[11mm]">
          <header className="report-design-header grid grid-cols-[90px_1fr] items-center gap-5 rounded-[30px] border border-fuchsia-100 bg-white/80 p-5 shadow-sm">
            <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="h-16 w-auto object-contain" />
            <div>
              <p className="text-xs font-black text-fuchsia-700">رعاية ودعم ومتابعة</p>
              <h1 className="mt-2 text-2xl font-black text-slate-950">{context["case.title"] || pageLabel}</h1>
            </div>
          </header>

          <div className="mt-5 rounded-[30px] border border-fuchsia-100 bg-white p-5">
            <PageBlocks page={page} context={context} previewCase={previewCase} designId={designId} className="min-h-[190mm]" />
          </div>

          <DesignFooter text="بناتي لؤلؤي هادئ" barClass="from-fuchsia-700 to-rose-200" />
        </div>
      </article>
  );
}

