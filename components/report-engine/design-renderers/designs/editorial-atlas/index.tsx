import { ReportSmartA4ContentRegion } from "../../smart-layout/report-smart-a4-layout";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function EditorialAtlasReportDesign({
  page,
  context,
  previewCase,
  pageLabel,
  PageBlocks,
  getDesignLogoSrc,
}: ReportDesignPageComponentProps) {
  const designId = "editorial-atlas" as const;

  const title = context["case.title"] || pageLabel;
  const schoolName = context["identity.schoolName"] || "المدرسة";

  return (
    <article
      className="pdf-report-page mx-auto h-[297mm] min-h-[297mm] w-full max-w-[210mm] overflow-hidden bg-[#EEF5F8] p-[7mm] shadow-xl"
      data-report-design="editorial-atlas"
    >
      <div className="grid h-[283mm] grid-cols-[27mm_1fr] overflow-hidden bg-white">
        <aside className="relative flex flex-col bg-[#10243A] px-3 py-[8mm] text-white">
          <img
            src={getDesignLogoSrc(context)}
            alt="شعار وزارة التعليم"
            className="mx-auto h-12 w-auto object-contain brightness-0 invert"
          />

          <div className="mt-8 flex-1">
            <div className="mx-auto h-full w-px bg-white/15" />
          </div>

          <div className="rotate-180 [writing-mode:vertical-rl]">
            <p className="text-[10px] font-black tracking-[0.22em] text-[#7ed6d0]">
              EDITORIAL ATLAS
            </p>
            <p className="mt-2 text-[9px] font-bold text-white/60">
              منصة التوجيه الطلابي
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col px-[10mm] pb-[7mm] pt-[8mm]">
          <header className="report-design-header shrink-0">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0F9D94]">
                  {context["service.name"] || "تقرير إرشادي"}
                </p>

                <h1 className="mt-3 max-w-[125mm] text-[27px] font-black leading-[1.42] text-[#10243A]">
                  {title}
                </h1>

                <div className="mt-4 flex items-center gap-3">
                  <span className="h-1 w-[22mm] bg-[#E07A5F]" />
                  <span className="h-1 w-[10mm] bg-[#0F9D94]" />
                </div>
              </div>

              <div className="shrink-0 border-r border-[#10243A]/15 pr-4 text-left text-[9px] font-bold leading-5 text-slate-500">
                <p>{schoolName}</p>
                <p>{context["case.createdAt"] || ""}</p>
                <p className="text-[#E07A5F]">{pageLabel}</p>
              </div>
            </div>
          </header>

          <div className="mt-[7mm] flex-1">
            <ReportSmartA4ContentRegion
              heightMm={202}
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

          <footer className="mt-auto shrink-0 border-t border-[#10243A]/15 pt-3">
            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
              <span className="text-[#10243A]">الأطلس التحريري</span>
              <span>{context["identity.counselorName"] || "التوجيه الطلابي"}</span>
            </div>
          </footer>
        </div>
      </div>
    </article>
  );
}
