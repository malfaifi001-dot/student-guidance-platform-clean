import { ReportSmartA4ContentRegion } from "../../smart-layout/report-smart-a4-layout";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function GeometricHorizonReportDesign({
  page,
  context,
  previewCase,
  pageLabel,
  PageBlocks,
  getDesignLogoSrc,
}: ReportDesignPageComponentProps) {
  const designId = "geometric-horizon" as const;

  const title = context["case.title"] || pageLabel;
  const schoolName = context["identity.schoolName"] || "المدرسة";

  return (
    <article
      className="pdf-report-page mx-auto h-[297mm] min-h-[297mm] w-full max-w-[210mm] overflow-hidden bg-[#F4F2ED] p-[7mm] shadow-xl"
      data-report-design="geometric-horizon"
    >
      <div className="relative flex h-[283mm] flex-col overflow-hidden bg-white">
        <div className="pointer-events-none absolute left-0 top-0 h-[34mm] w-[34mm] bg-[#6C5CE7]/10 [clip-path:polygon(0_0,100%_0,0_100%)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-[28mm] w-[52mm] bg-[#25316D] [clip-path:polygon(0_0,100%_0,100%_100%,35%_100%)]" />
        <div className="pointer-events-none absolute right-[38mm] top-0 h-[13mm] w-[30mm] bg-[#F4B942]" />

        <header className="report-design-header relative z-10 shrink-0 px-[11mm] pb-[6mm] pt-[9mm]">
          <div className="grid grid-cols-[1fr_34mm] items-start gap-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#25316D]/5 px-3 py-1 text-[9px] font-black text-[#25316D]">
                <span className="h-2 w-2 rotate-45 bg-[#F4B942]" />
                {context["service.name"] || "تقرير إرشادي"}
              </span>

              <h1 className="mt-4 max-w-[130mm] text-[26px] font-black leading-[1.45] text-[#25316D]">
                {title}
              </h1>

              <div className="mt-4 grid max-w-[130mm] grid-cols-3 gap-2">
                <div className="border-r-2 border-[#6C5CE7] pr-3">
                  <p className="text-[8px] font-bold text-slate-400">المدرسة</p>
                  <p className="mt-1 truncate text-[10px] font-black text-[#25316D]">
                    {schoolName}
                  </p>
                </div>

                <div className="border-r-2 border-[#F4B942] pr-3">
                  <p className="text-[8px] font-bold text-slate-400">التاريخ</p>
                  <p className="mt-1 truncate text-[10px] font-black text-[#25316D]">
                    {context["case.createdAt"] || "—"}
                  </p>
                </div>

                <div className="border-r-2 border-[#0F9D94] pr-3">
                  <p className="text-[8px] font-bold text-slate-400">المعد</p>
                  <p className="mt-1 truncate text-[10px] font-black text-[#25316D]">
                    {context["identity.counselorName"] || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex h-[24mm] items-start justify-end">
              <div className="relative z-10 grid h-[20mm] w-[26mm] place-items-center bg-white/95 p-2 shadow-sm">
                <img
                  src={getDesignLogoSrc(context)}
                  alt="شعار وزارة التعليم"
                  className="max-h-full w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="mx-[11mm] flex-1 border-t border-[#25316D]/10 pt-[5mm]">
          <ReportSmartA4ContentRegion
            heightMm={198}
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

        <footer className="relative mx-[11mm] mb-[6mm] mt-auto shrink-0 pt-3">
          <div className="absolute left-0 right-0 top-0 flex h-[2px]">
            <span className="w-1/2 bg-[#25316D]" />
            <span className="w-1/4 bg-[#6C5CE7]" />
            <span className="w-1/4 bg-[#F4B942]" />
          </div>

          <div className="flex items-center justify-between pt-2 text-[9px] font-bold text-slate-400">
            <span>الأفق الهندسي</span>
            <span className="text-[#25316D]">{pageLabel}</span>
          </div>
        </footer>
      </div>
    </article>
  );
}
