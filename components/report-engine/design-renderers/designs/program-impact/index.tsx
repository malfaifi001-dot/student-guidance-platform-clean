import { ReportSmartA4ContentRegion } from "../../smart-layout/report-smart-a4-layout";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function ProgramImpactReportDesign({
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
  const designId = "program-impact" as const;

  return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[34px] border border-cyan-100 bg-cyan-50 p-[8mm] shadow-xl">
        <div className="relative min-h-[279mm] rounded-[28px] bg-white p-[11mm]">
          <header className="report-design-header rounded-[32px] border border-cyan-100 bg-gradient-to-l from-cyan-700 to-blue-800 p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-cyan-100">تقرير أثر برنامج إرشادي</p>
                <h1 className="mt-3 text-3xl font-black">{context["case.title"] || pageLabel}</h1>
              </div>
              <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="h-14 w-auto object-contain brightness-0 invert" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStat label="الخدمة" value={context["service.name"]} />
              <MiniStat label="الشواهد" value={context["evidence.count"]} />
              <MiniStat label="التاريخ" value={context["case.createdAt"]} />
            </div>
          </header>

          <ReportSmartA4ContentRegion
              heightMm={185}
              priorityMode="signature" className="mt-6"
            >
              <PageBlocks
                page={page}
                context={context}
                previewCase={previewCase}
                designId={designId}
                className="min-h-full"
              />
            </ReportSmartA4ContentRegion>
          <DesignFooter text="أثر برنامج إرشادي" barClass="from-cyan-700 to-blue-200" />
        </div>
      </article>
  );
}

