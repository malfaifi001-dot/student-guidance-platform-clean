import { ReportSmartA4ContentRegion } from "../../smart-layout/report-smart-a4-layout";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function EvidenceShowcaseReportDesign({
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
  const designId = "evidence-showcase" as const;

  return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[34px] border border-emerald-100 bg-emerald-50 p-[8mm] shadow-xl">
        <div className="relative min-h-[279mm] overflow-hidden rounded-[28px] bg-white p-[11mm]">
          <div className="absolute left-0 right-0 top-0 h-[44mm] bg-gradient-to-l from-emerald-800 via-teal-700 to-slate-900" />
          <header className="report-design-header relative z-10 grid grid-cols-[1fr_90px] items-start gap-5 text-white">
            <div>
              <p className="text-xs font-black text-emerald-100">تقرير بصري للشواهد والإنجاز</p>
              <h1 className="mt-3 text-3xl font-black leading-[1.5]">{context["case.title"] || pageLabel}</h1>
              <p className="mt-2 text-xs font-bold text-emerald-100">
                {context["service.name"]} · {context["case.createdAt"]}
              </p>
            </div>
            <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="h-16 w-auto justify-self-end object-contain brightness-0 invert" />
          </header>

          <div className="relative z-10 mt-9 rounded-[30px] border border-emerald-100 bg-white p-5 shadow-sm">
            <ReportSmartA4ContentRegion
              heightMm={185}
              priorityMode="signature"
            >
              <PageBlocks
                page={page}
                context={context}
                previewCase={previewCase}
                designId={designId}
                className="min-h-full"
              />
            </ReportSmartA4ContentRegion>
          </div>

          <DesignFooter text="تقرير شواهد بصري" barClass="from-emerald-800 to-teal-200" />
        </div>
      </article>
  );
}

