import type { ReportDesignPageComponentProps } from "../report-design-component-types";
import { ReportDesignSmartContent } from "../../smart-layout/report-design-smart-content";

export function MinistryFormReportDesign({
  page,
  context,
  previewCase,
  pageLabel,
  PageBlocks,
  getDesignLogoSrc,
  getDesignHeaderAlign,
  getDesignHeaderText,
}: ReportDesignPageComponentProps) {
  const designId = "ministry-form" as const;
  const schoolName = String(context["identity.schoolName"] || "").trim();

  return (
    <article className="pdf-report-page relative mx-auto h-[297mm] min-h-[297mm] w-full max-w-[210mm] overflow-hidden bg-white p-[12mm] pt-[56mm]" data-report-design="ministry-form">
        <style>{`
          [data-report-design="ministry-form"] img[alt="شعار وزارة التعليم"] {
            filter: brightness(0) invert(1) !important;
            opacity: 1 !important;
          }
        `}</style>
        <header className="report-design-header absolute left-0 right-0 top-0 z-10 rounded-b-[46px] bg-[#1d343f] px-[18mm] py-[13mm] text-white">
          <div dir="ltr" className="grid grid-cols-[1.1fr_0.9fr_1.2fr] items-center gap-5">
            <div dir="rtl" className="flex min-w-0 flex-col items-center justify-center text-center text-sm font-bold leading-7 text-slate-100">
              <p className="w-full" style={{ textAlign: getDesignHeaderAlign(context, "service.name", "center") }}>{getDesignHeaderText(context, "service.name", context["service.name"] || pageLabel || "")}</p><p className="w-full" style={{ textAlign: getDesignHeaderAlign(context, "case.createdAt", "center") }}>{getDesignHeaderText(context, "case.createdAt", context["case.createdAt"] || "")}</p>
            </div>
            <div className="flex items-center justify-center text-center">
              <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="mx-auto h-[80px] w-[132px] object-contain brightness-0 invert" />
            </div>
            <div dir="rtl" className="flex min-w-0 flex-col items-center justify-center text-center text-sm font-bold leading-7 text-slate-100">
              <p className="mb-0.5 w-full" style={{ textAlign: getDesignHeaderAlign(context, "identity.ministryName", "center") }}>المملكة العربية السعودية</p><p className="w-full" style={{ textAlign: getDesignHeaderAlign(context, "identity.ministryName", "center") }}>{getDesignHeaderText(context, "identity.ministryName", "وزارة التعليم")}</p><p className="w-full" style={{ textAlign: getDesignHeaderAlign(context, "identity.educationDepartment", "center") }}>{getDesignHeaderText(context, "identity.educationDepartment", "الإدارة العامة للتعليم")}</p>{schoolName ? <p className="mt-1 w-full" style={{ textAlign: getDesignHeaderAlign(context, "identity.schoolName", "center") }}>{schoolName}</p> : null}
            </div>
          </div>
        </header>

        <ReportDesignSmartContent
          availableHeightMm={229}
          className="relative z-10"
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
        <footer data-report-page-footer className="absolute bottom-[10mm] left-[12mm] right-[12mm]">
          <div className="h-1 rounded-full bg-gradient-to-l from-slate-900 to-emerald-300" />
        </footer>
    </article>
  );
}
