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

  const schoolName = context["identity.schoolName"] || "المدرسة";
  const ministryName = context["identity.ministryName"] || "وزارة التعليم";
  const department =
    context["identity.educationDepartment"] || "الإدارة العامة للتعليم";
  const serviceName =
    context["service.name"] || context["case.title"] || pageLabel || "";
  const createdAt = context["case.createdAt"] || "";
  const logoSrc = getDesignLogoSrc(context) || "/uploads/school-logos/MOE.png";

  return (
    <article
      className="pdf-report-page mx-auto h-[297mm] min-h-[297mm] w-full max-w-[210mm] overflow-hidden bg-white"
      data-report-design="ministry-elegant"
    >
      <style>{`
        [data-report-design="ministry-elegant"] img[alt="شعار وزارة التعليم"] {
          filter: none !important;
          opacity: 1 !important;
        }
      `}</style>
      <div className="relative flex h-full flex-col overflow-hidden bg-white">
        <div className="h-[3mm] shrink-0 bg-gradient-to-l from-[#0f2a4d] via-[#0f766e] to-[#22c55e]" />

        <header className="report-design-header relative shrink-0 px-[11mm] pb-[6mm] pt-[7mm]">
          <div dir="ltr" className="grid grid-cols-[1fr_52mm_1fr] items-center gap-[7mm]">
            <div dir="rtl" className="flex min-w-0 flex-col items-center justify-center text-center text-[10px] font-bold leading-[1.8] text-[#0f2a4d]">
              <p className="w-full text-center">{serviceName}</p>
              <p className="mt-1 w-full text-center">{createdAt}</p>
            </div>

            <div className="flex w-[52mm] shrink-0 flex-col items-center justify-center text-center">
              <img
                src={logoSrc}
                alt="شعار وزارة التعليم"
                className="h-[27mm] w-auto max-w-[50mm] object-contain"
                style={{ filter: "none", opacity: 1 }}
              />
              <p className="mt-1 text-[9px] font-black text-[#0f766e]">
                منصة التوجيه الطلابي
              </p>
            </div>

            <div dir="rtl" className="flex min-w-0 flex-col items-center justify-center text-center text-[10px] font-bold leading-[1.8] text-[#0f2a4d]">
              <p className="w-full text-center">المملكة العربية السعودية</p>
              <p className="w-full text-center">{ministryName}</p>
              <p className="w-full text-center">{department}</p>
              <p className="w-full text-center text-[#0f766e]">{schoolName}</p>
            </div>
          </div>
        </header>

        <div className="mx-[10mm] flex-1">
          <ReportDesignSmartContent
            availableHeightMm={226}
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

        <footer
          data-report-page-footer
          className="mx-[10mm] mb-[5mm] mt-auto shrink-0 border-t border-[#0f766e]/20 pt-1 text-center text-[12px] font-bold leading-none text-[#0f2a4d]/65"
        >
          وزارة التعليم
        </footer>
      </div>
    </article>
  );
}
