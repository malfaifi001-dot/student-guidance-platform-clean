import { ReportDesignSmartContent } from "../../smart-layout/report-design-smart-content";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function MinistryElegantReportDesign({
  page,
  context,
  previewCase,
  pageLabel,
  PageBlocks,
  getDesignLogoSrc,
}: ReportDesignPageComponentProps) {
  const designId = "ministry-elegant" as const;

  const title = context["case.title"] || pageLabel;
  const schoolName = context["identity.schoolName"] || "المدرسة";
  const ministryName = context["identity.ministryName"] || "وزارة التعليم";
  const department =
    context["identity.educationDepartment"] || "الإدارة العامة للتعليم";

  return (
    <article
      className="pdf-report-page mx-auto h-[297mm] min-h-[297mm] w-full max-w-[210mm] overflow-hidden bg-[#eef7f6] p-[7mm] shadow-xl"
      data-report-design="ministry-elegant"
    >
      <div className="relative flex h-[283mm] flex-col overflow-hidden border border-[#0f766e]/20 bg-white">
        <div className="h-[3mm] shrink-0 bg-gradient-to-l from-[#0f2a4d] via-[#0f766e] to-[#22c55e]" />

        <header className="report-design-header relative shrink-0 px-[11mm] pb-[6mm] pt-[7mm]">
          <div className="grid grid-cols-[36mm_1fr_36mm] items-center gap-4">
            <div className="text-right text-[10px] font-bold leading-5 text-[#0f2a4d]">
              <p>{ministryName}</p>
              <p>{department}</p>
              <p className="text-[#0f766e]">{schoolName}</p>
            </div>

            <div className="text-center">
              <div className="relative mx-auto mb-3 grid h-14 w-14 place-items-center">
                <span className="absolute inset-1 rotate-45 border-2 border-[#22c55e]/50" />
                <span className="absolute inset-2 rotate-45 border border-[#0f766e]/30" />
                <img
                  src={getDesignLogoSrc(context)}
                  alt="شعار وزارة التعليم"
                  className="relative z-10 h-11 w-auto object-contain"
                />
              </div>

              <p className="text-[10px] font-black tracking-[0.18em] text-[#0f766e]">
                منصة التوجيه الطلابي
              </p>

              <h1 className="mt-2 text-xl font-black leading-[1.55] text-[#0f2a4d]">
                {title}
              </h1>
            </div>

            <div className="text-left text-[10px] font-bold leading-5 text-slate-500">
              <p>{context["service.name"] || "تقرير إرشادي"}</p>
              <p>{context["case.createdAt"] || ""}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#0f766e]/20" />
            <span className="h-2.5 w-2.5 rotate-45 border border-[#22c55e] bg-white" />
            <span className="h-px flex-1 bg-[#0f766e]/20" />
          </div>
        </header>

        <div className="mx-[10mm] flex-1">
          <ReportDesignSmartContent
            availableHeightMm={202}
            priorityMode="signature"
          >
            <PageBlocks
              page={page}
              context={context}
              previewCase={previewCase}
              designId={designId}
              className="min-h-full"
            />
          </ReportDesignSmartContent>
        </div>

        <footer className="mx-[10mm] mb-[6mm] mt-auto shrink-0 border-t border-[#0f766e]/20 pt-3">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
            <span>{schoolName}</span>
            <span className="text-[#0f766e]">الوزاري الأنيق</span>
            <span>{pageLabel}</span>
          </div>
        </footer>
      </div>
    </article>
  );
}
