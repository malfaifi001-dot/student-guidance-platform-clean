import { ReportSmartA4ContentRegion } from "../../smart-layout/report-smart-a4-layout";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";

export function CounselingCaseFileReportDesign({
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
  const designId = "counseling-case-file" as const;

  return (
      <article className="pdf-report-page mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-[22px] border border-teal-100 bg-teal-50 p-[8mm] shadow-xl">
        <div className="grid min-h-[279mm] grid-cols-[48mm_1fr] overflow-hidden rounded-[18px] bg-white">
          <aside className="bg-teal-900 p-5 text-white">
            <img src={getDesignLogoSrc(context)} alt="شعار وزارة التعليم" className="h-14 w-auto object-contain brightness-0 invert" />
            <h2 className="mt-8 text-lg font-black leading-8">ملف حالة إرشادية</h2>
            <div className="mt-8 space-y-3">
              <SideMeta label="الطالب/ـة" value={context["student.name"]} />
              <SideMeta label="الصف" value={context["student.grade"]} />
              <SideMeta label="الخدمة" value={context["service.name"]} />
              <SideMeta label="الشواهد" value={context["evidence.count"]} />
            </div>
          </aside>

          <div className="relative p-[11mm]">
            <header className="report-design-header border-b border-teal-100 pb-5">
              <p className="text-xs font-black text-teal-700">التوجيه الطلابي · ملف متابعة</p>
              <h1 className="mt-2 text-2xl font-black text-slate-950">{context["case.title"] || pageLabel}</h1>
            </header>
            <ReportSmartA4ContentRegion
              heightMm={200}
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
            <DesignFooter text="ملف حالة إرشادية" barClass="from-teal-900 to-teal-200" />
          </div>
        </div>
      </article>
  );
}

