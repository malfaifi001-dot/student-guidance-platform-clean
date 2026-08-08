import { ReportSmartA4ContentRegion } from "../../smart-layout/report-smart-a4-layout";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function FormalMemoReportDesign({
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
  const designId = "formal-memo" as const;

  return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden border border-slate-200 bg-white p-[12mm] shadow-xl">
        <div className="relative min-h-[273mm] border-2 border-slate-800 p-[8mm]">
          <header className="report-design-header border-b-2 border-slate-800 pb-5">
            <div className="grid grid-cols-[110px_1fr_110px] items-center gap-4">
              <div className="text-right text-xs font-bold leading-6 text-slate-700">
                <p style={{ textAlign: getDesignHeaderAlign(context, "identity.ministryName", "center") }}>{getDesignHeaderText(context, "identity.ministryName", "وزارة التعليم")}</p><p style={{ textAlign: getDesignHeaderAlign(context, "identity.educationDepartment", "center") }}>{getDesignHeaderText(context, "identity.educationDepartment", "الإدارة العامة للتعليم")}</p><p>مكتب التعليم</p>
              </div>
              <div className="text-center">
                <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="mx-auto h-14 w-auto object-contain" />
                <h1 className="mt-3 text-xl font-black text-slate-950">{pageLabel}</h1>
              </div>
              <div className="text-left text-xs font-bold leading-6 text-slate-700">
                <p>رقم الحالة</p><p>{context["case.id"]}</p><p>{context["case.createdAt"]}</p>
              </div>
            </div>
          </header>

          <main className="mt-8">
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
          </main>

          <div className="absolute bottom-[10mm] left-[8mm] right-[8mm] grid grid-cols-2 gap-5 text-sm font-black text-slate-800">
            <div className="border-t border-slate-700 pt-3">الموجه/الموجهة الطلابية</div>
            <div className="border-t border-slate-700 pt-3">مدير/مديرة المدرسة</div>
          </div>
        </div>
      </article>
  );
}

