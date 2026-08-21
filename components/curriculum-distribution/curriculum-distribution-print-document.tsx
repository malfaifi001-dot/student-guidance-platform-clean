import type { CurriculumDistribution } from "@/lib/curriculum-distribution/types";
import { getCurriculumCalendarItems } from "@/lib/curriculum-distribution/calendar";
import { CurriculumDistributionPrintTable } from "./curriculum-distribution-print-table";
import { CurriculumDocumentFooter, CurriculumDocumentHeader } from "./curriculum-document-identity";

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
  const calendarItems = getCurriculumCalendarItems(props.distribution.weeks);

  return (
    <main className="curriculum-print-root" dir="rtl">
      <div className="curriculum-print-paper">
        <CurriculumDocumentHeader title="توزيع المنهج" schoolName={props.schoolName} educationDepartment={props.educationDepartment} logoUrl={props.logoUrl} />
        <section className="curriculum-print-summary-strip" aria-label="ملخص توزيع المنهج">
          <SummarySegment label="المادة" value={props.distribution.subject.name} />
          <SummarySegment label="المرحلة" value={props.distribution.stage.name} />
          <SummarySegment label="المسار" value={props.distribution.track?.name} />
          <SummarySegment label="الصف / السنة" value={props.distribution.grade.name} />
          <SummarySegment label="الفصل الدراسي" value={props.distribution.semester.name} />
        </section>
        <section className="curriculum-print-body" aria-label="توزيع الأسابيع">
          <CurriculumDistributionPrintTable items={calendarItems} />
        </section>
        <CurriculumDocumentFooter primaryRoleLabel="معلم المادة" primaryName={props.teacherName} primarySignatureUrl={props.teacherSignatureUrl} primarySignatureAlt="توقيع معلم المادة" principalName={props.principalName} principalSignatureUrl={props.principalSignatureUrl} />
      </div>
    </main>
  );
}
