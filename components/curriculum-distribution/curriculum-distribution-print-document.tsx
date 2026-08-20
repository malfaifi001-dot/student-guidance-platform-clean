import { getDesignLogoSrc } from "@/components/report-engine/design-renderers/shared/report-logo";
import type { CurriculumDistribution } from "@/lib/curriculum-distribution/types";
import { getCurriculumCalendarItems } from "@/lib/curriculum-distribution/calendar";
import { CurriculumDistributionPrintTable } from "./curriculum-distribution-print-table";

type PrintDocumentProps = {
  distribution: CurriculumDistribution;
  schoolName: string;
  educationDepartment?: string | null;
  educationOffice?: string | null;
  academicYear?: string | null;
  logoUrl?: string | null;
  teacherName: string;
  teacherSignatureUrl?: string | null;
  principalName?: string | null;
  principalSignatureUrl?: string | null;
};

function SummarySegment({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return <div className="curriculum-print-summary-segment"><span>{label}</span><strong>{value}</strong></div>;
}

export function CurriculumDistributionPrintDocument(props: PrintDocumentProps) {
  const { distribution } = props;
  const calendarItems = getCurriculumCalendarItems(distribution.weeks);
  const logoSrc = getDesignLogoSrc({ "report.logoUrl": props.logoUrl || "" });
  return (
    <main className="curriculum-print-root" dir="rtl">
      <div className="curriculum-print-paper">
        <div className="curriculum-print-top-line" />
        <header className="curriculum-print-header">
          <div className="curriculum-print-identity">
            <img src={logoSrc} alt="شعار وزارة التعليم" />
            <span className="curriculum-print-identity-divider" />
            <div>
              <p>المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              {props.educationDepartment ? <p>{props.educationDepartment}</p> : null}
              <p>{props.schoolName || ""}</p>
            </div>
          </div>
          <div className="curriculum-print-title-block">
            <h1>توزيع المنهج</h1>
          </div>
        </header>

        <section className="curriculum-print-summary-strip" aria-label="ملخص توزيع المنهج">
          <SummarySegment label="المادة" value={distribution.subject.name} />
          <SummarySegment label="المرحلة" value={distribution.stage.name} />
          <SummarySegment label="المسار" value={distribution.track?.name} />
          <SummarySegment label="الصف / السنة" value={distribution.grade.name} />
          <SummarySegment label="الفصل الدراسي" value={distribution.semester.name} />
        </section>

        <section className="curriculum-print-body" aria-label="توزيع الأسابيع">
          <CurriculumDistributionPrintTable items={calendarItems} />
        </section>

        <footer className="curriculum-print-footer">
          <div className="curriculum-print-signature-row">
            <div className="curriculum-print-signature">
              <strong>معلم المادة</strong>
              <span>{props.teacherName || ""}</span>
              {props.teacherSignatureUrl ? <img className="curriculum-print-signature-image" src={props.teacherSignatureUrl} alt="توقيع معلم المادة" /> : <small>التوقيع: ____________________</small>}
            </div>
            <div className="curriculum-print-signature">
              <strong>مدير المدرسة</strong>
              <span>{props.principalName || ""}</span>
              {props.principalSignatureUrl ? <img className="curriculum-print-signature-image" src={props.principalSignatureUrl} alt="توقيع مدير المدرسة" /> : <small>التوقيع: ____________________</small>}
            </div>
          </div>
          <div className="curriculum-print-footer-line" aria-hidden="true" />
        </footer>
      </div>
    </main>
  );
}
