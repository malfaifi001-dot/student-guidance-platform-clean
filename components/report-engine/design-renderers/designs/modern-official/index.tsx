import { ReportSmartA4ContentRegion } from "../../smart-layout/report-smart-a4-layout";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function ModernOfficialReportDesign({
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
  const designId = "modern-official" as const;

  return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[30px] border border-sky-100 bg-sky-50 p-[8mm] shadow-xl">
        <div className="relative grid min-h-[279mm] grid-cols-[34mm_1fr] overflow-hidden rounded-[24px] bg-white">
          <aside className="relative bg-gradient-to-b from-sky-950 via-sky-800 to-emerald-700 p-5 text-white">
            <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="mx-auto h-16 w-auto object-contain brightness-0 invert" />
            <div className="mt-10 rotate-180 [writing-mode:vertical-rl]">
              <p className="text-sm font-black tracking-wide">منصة التوجيه الطلابي</p>
              <p className="mt-3 text-xs font-bold text-sky-100">تقرير رسمي حديث</p>
            </div>
          </aside>

          <div className="relative p-[11mm]">
            <header className="report-design-header rounded-3xl border border-sky-100 bg-sky-50 p-5">
              <p className="text-xs font-black text-sky-700">وزارة التعليم</p>
              <h1 className="mt-1 text-xl font-black text-slate-950">
                {context["case.title"] || pageLabel}
              </h1>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold text-slate-600">
                <MetaCard label="الخدمة" value={context["service.name"]} />
                <MetaCard label="التاريخ" value={context["case.createdAt"]} />
                <MetaCard label="المعد" value={context["identity.counselorName"]} />
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
            <DesignFooter text="تقرير رسمي حديث" barClass="from-sky-800 to-emerald-300" />
          </div>
        </div>
      </article>
  );
}

