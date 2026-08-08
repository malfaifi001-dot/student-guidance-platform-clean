import type { ReportDesignPageComponentProps } from "../report-design-component-types";
import { ReportDesignSmartContent } from "../../smart-layout/report-design-smart-content";

export function MinistryFormReportDesign({
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
  const designId = "ministry-form" as const;
  const schoolName = String(context["identity.schoolName"] || "").trim();

  return (
    <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden border border-slate-200 bg-white shadow-xl">
      <div className="relative min-h-[297mm] bg-white p-[12mm] pt-[56mm]">
        <header className="report-design-header absolute left-0 right-0 top-0 z-10 rounded-b-[46px] bg-[#1d343f] px-[18mm] py-[13mm] text-white">
          <div className="grid grid-cols-[1.25fr_0.9fr_1fr] items-center gap-5">
            <div className="text-right text-sm font-bold leading-7 text-slate-100">
              <p className="mb-0.5" style={{ textAlign: getDesignHeaderAlign(context, "identity.ministryName", "center") }}>المملكة العربية السعودية</p><p style={{ textAlign: getDesignHeaderAlign(context, "identity.ministryName", "center") }}>{getDesignHeaderText(context, "identity.ministryName", "وزارة التعليم")}</p><p style={{ textAlign: getDesignHeaderAlign(context, "identity.educationDepartment", "center") }}>{getDesignHeaderText(context, "identity.educationDepartment", "الإدارة العامة للتعليم")}</p>{schoolName ? <p className="mt-1" style={{ textAlign: getDesignHeaderAlign(context, "identity.schoolName", "center") }}>{schoolName}</p> : null}
            </div>
            <div className="text-center">
              <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="mx-auto h-[80px] w-[132px] object-contain brightness-0 invert" />
            </div>
            <div className="text-left text-sm font-bold leading-7 text-slate-100">
              <p style={{ textAlign: getDesignHeaderAlign(context, "case.createdAt", "center") }}>{getDesignHeaderText(context, "case.createdAt", context["case.createdAt"] || "")}</p><p style={{ textAlign: getDesignHeaderAlign(context, "service.name", "center") }}>{getDesignHeaderText(context, "service.name", context["service.name"] || "")}</p>
            </div>
          </div>
        </header>

        <div className="pointer-events-none absolute inset-[8mm] border border-slate-100" />
        <ReportDesignSmartContent
          availableHeightMm={205}
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
        <DesignFooter text="نموذج الوزارة الرسمي" barClass="from-slate-900 to-emerald-300" />
      </div>
    </article>
  );
}

