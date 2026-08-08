import { ReportSmartA4ContentRegion } from "../../smart-layout/report-smart-a4-layout";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function BehaviorFollowupReportDesign({
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
  const designId = "behavior-followup" as const;

  return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[26px] border border-amber-100 bg-amber-50 p-[8mm] shadow-xl">
        <div className="relative min-h-[279mm] rounded-[22px] bg-white p-[11mm]">
          <header className="report-design-header grid grid-cols-[1fr_100px] items-center gap-5 rounded-[26px] bg-gradient-to-l from-amber-600 to-orange-400 p-6 text-white">
            <div>
              <p className="text-xs font-black text-amber-100">خطة متابعة وتقويم سلوكي</p>
              <h1 className="mt-2 text-2xl font-black">{context["case.title"] || pageLabel}</h1>
            </div>
            <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="h-16 w-auto object-contain brightness-0 invert" />
          </header>

          <div className="mt-6 grid grid-cols-[28mm_1fr] gap-5">
            <aside className="space-y-4">
              {["الرصد", "التدخل", "المتابعة", "الإغلاق"].map((item, index) => (
                <div key={item} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-lg font-black text-amber-700">{index + 1}</p>
                  <p className="mt-1 text-[11px] font-black text-slate-600">{item}</p>
                </div>
              ))}
            </aside>
            <ReportSmartA4ContentRegion
              heightMm={190}
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

          <DesignFooter text="متابعة سلوكية" barClass="from-amber-700 to-orange-200" />
        </div>
      </article>
  );
}

