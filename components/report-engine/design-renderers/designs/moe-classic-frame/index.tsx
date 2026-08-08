import type { ReportDesignPageComponentProps } from "../report-design-component-types";
import { ReportDesignSmartContent } from "../../smart-layout/report-design-smart-content";

export function MoeClassicFrameReportDesign({
  page,
  context,
  previewCase,
  pageLabel,
  PageBlocks,
  getDesignLogoSrc,
}: ReportDesignPageComponentProps) {
  const designId = "moe-classic-frame" as const;

  const department =
    String(context["identity.educationDepartment"] || "").trim() ||
    "الإدارة العامة للتعليم";

  const office =
    String(context["identity.educationOffice"] || "").trim() ||
    "مكتب التعليم";

  const schoolName =
    String(context["identity.schoolName"] || "").trim() ||
    "اسم المدرسة";

  const reportTitle =
    String(context["case.title"] || "").trim() ||
    pageLabel ||
    "التقرير";

  return (
    <article
      className="pdf-report-page mx-auto h-[297mm] min-h-[297mm] w-full max-w-[210mm] overflow-hidden bg-white"
      data-report-design="moe-classic-frame"
      dir="rtl"
    >
      <div className="relative h-full overflow-hidden">

        <div className="absolute inset-x-0 top-0 z-40 h-[1.3mm] bg-gradient-to-l from-[#35bc70] via-[#25ada4] to-[#188dc4]" />

        <header className="report-design-header absolute inset-x-0 top-0 z-30 h-[39mm] overflow-hidden rounded-b-[10mm] bg-[#073f4c] text-white">
          <div className="absolute inset-x-0 top-0 h-[1.3mm] bg-gradient-to-l from-[#35bc70] via-[#25ada4] to-[#188dc4]" />

          <div className="absolute left-1/2 top-[7mm] flex -translate-x-1/2 items-center justify-center gap-[5mm]">

            {/* الشعار يمين */}
            <div className="flex w-[41mm] items-center justify-center">
              <img
                src={getDesignLogoSrc(context)}
                alt="شعار وزارة التعليم"
                className="h-[22mm] w-auto max-w-[38mm] object-contain brightness-0 invert"
              />
            </div>

            {/* الفاصل */}
            <div className="h-[20mm] w-[0.7mm] shrink-0 bg-[#16ad78]" />

            {/* بيانات الإدارة يسار */}
            <div className="w-[52mm] text-right text-[9.5px] font-bold leading-[1.55] text-white">
              <p className="whitespace-nowrap">
                {department}
              </p>
              <p className="whitespace-nowrap text-[#18a69a]">
                {office}
              </p>
              <p className="whitespace-nowrap">
                {schoolName}
              </p>
            </div>
          </div>
        </header>

        {/* عنوان التقرير في شريط الهوية السفلي */}
        <div className="absolute left-1/2 top-[32mm] z-40 flex h-[12mm] w-[98mm] -translate-x-1/2 items-center justify-center rounded-b-[4mm] border-x border-b border-[#148c9c] bg-[#073f4c] px-[7mm] text-center text-[10px] font-bold leading-5 text-white shadow-sm">
          {reportTitle}
        </div>

        {/* المحتوى */}
        <div className="absolute inset-x-[12mm] bottom-[11mm] top-[50mm] z-10 overflow-hidden">
          <ReportDesignSmartContent
            availableHeightMm={236}
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

        {/* الفوتر المتدرج بدون بيانات */}
        <footer
          className="absolute inset-x-0 bottom-0 z-30 h-[7mm] overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#168ac4] via-[#28aca7] to-[#35bd70]" />
        </footer>
      </div>
    </article>
  );
}
