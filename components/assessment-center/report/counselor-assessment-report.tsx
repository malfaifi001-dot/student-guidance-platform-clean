"use client";

import type { ReactNode } from "react";
import { SignatureImage } from "@/components/signatures/signature-image";
import type {
  CounselorAssessmentReportData,
  CounselorReportComparison,
  CounselorReportStudent,
  CounselorReportSubject,
} from "@/lib/assessment-center/counselor-assessment-report-data";
import type { CounselorAssessmentReportVisibilityOptions } from "@/lib/assessment-center/assessment-report-options";

type ReportPage = { id: string; title: string; content: ReactNode };

function formatPercent(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}%`
    : "—";
}

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups.length ? groups : [[]];
}

function EmptySection() {
  return <p className="counselor-report-empty">لا توجد بيانات كافية لهذا القسم.</p>;
}

function StudentsTable({ students }: { students: CounselorReportStudent[] }) {
  if (!students.length) return <EmptySection />;
  return <div className="counselor-report-table-wrap"><table className="counselor-report-table"><thead><tr><th>الترتيب</th><th>اسم الطالب/الطالبة</th><th>الصف</th><th>الفصل</th><th>النسبة / المتوسط</th></tr></thead><tbody>{students.map((student, index) => <tr key={`${student.studentName}-${student.grade || ""}-${student.classroom || ""}-${index}`}><td>{index + 1}</td><td>{student.studentName}</td><td>{student.grade || "—"}</td><td>{student.classroom || "—"}</td><td>{formatPercent(student.averagePercentage)}</td></tr>)}</tbody></table></div>;
}

function SubjectFocus({ subject, label }: { subject?: CounselorReportSubject; label: string }) {
  if (!subject) return <EmptySection />;
  return <div className="counselor-report-focus"><div><span>{label}</span><strong>{subject.subject}</strong></div><div><span>متوسط التحصيل</span><strong>{formatPercent(subject.averagePercentage)}</strong></div>{subject.totalRows ? <div><span>عدد السجلات</span><strong>{subject.totalRows}</strong></div> : null}{subject.riskCount !== undefined ? <div><span>حالات المتابعة</span><strong>{subject.riskCount}</strong></div> : null}</div>;
}

function ComparisonTable({ rows }: { rows: CounselorReportComparison[] }) {
  if (!rows.length) return <EmptySection />;
  return <div className="counselor-report-table-wrap"><table className="counselor-report-table"><thead><tr><th>البند</th><th>متوسط التحصيل</th><th>عدد السجلات</th><th>حالات المتابعة</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.label}-${index}`}><td>{row.label}</td><td>{formatPercent(row.averagePercentage)}</td><td>{row.totalRows ?? "—"}</td><td>{row.riskCount ?? "—"}</td></tr>)}</tbody></table></div>;
}

function RiskStudentsTable({ students }: { students: CounselorReportStudent[] }) {
  if (!students.length) return <EmptySection />;
  return <div className="counselor-report-table-wrap"><table className="counselor-report-table"><thead><tr><th>اسم الطالب/الطالبة</th><th>الصف</th><th>الفصل</th><th>المتوسط</th><th>المواد التي تحتاج متابعة</th></tr></thead><tbody>{students.map((student, index) => <tr key={`${student.studentName}-${student.grade || ""}-${student.classroom || ""}-${index}`}><td>{student.studentName}</td><td>{student.grade || "—"}</td><td>{student.classroom || "—"}</td><td>{formatPercent(student.averagePercentage)}</td><td>{student.weakSubjects?.join("، ") || "—"}</td></tr>)}</tbody></table></div>;
}

function ReportIdentity({ data }: { data: CounselorAssessmentReportData }) {
  return <>
    <header className="counselor-report-brand"><div className="counselor-report-vision"><img src="/uploads/school-logos/VISION2030.png" alt="رؤية السعودية 2030" /></div><div className="counselor-report-school"><strong>{data.school.name || "مدرسة Teachix"}</strong>{data.school.educationDepartment ? <span>{data.school.educationDepartment}</span> : null}{data.school.educationOffice ? <span>{data.school.educationOffice}</span> : null}</div><div className="counselor-report-ministry"><img src="/uploads/school-logos/MOE.png" alt="وزارة التعليم" /></div></header>
    <div className="counselor-report-title"><h1>{data.reportTitle}</h1><p>{data.analysisTitle}</p></div>
  </>;
}

function CounselorSignatureBox({ label, name, imageUrl }: { label: string; name?: string | null; imageUrl?: string | null }) {
  return <div className="counselor-report-signature-box"><div className="counselor-report-signature-image">{imageUrl ? <SignatureImage src={imageUrl} alt={`توقيع ${name || label}`} maxWidth="155px" maxHeight="55px" strokeBoost={1} /> : <span />}</div><strong>{name || ""}</strong><small>{label}</small></div>;
}

function CounselorSignatures({ data }: { data: CounselorAssessmentReportData }) {
  return <div className="counselor-report-signatures"><CounselorSignatureBox label="المرشد/ة الطلابي/ة" name={data.school.counselorName} imageUrl={data.school.counselorSignatureUrl} /><CounselorSignatureBox label="مدير / مديرة المدرسة" name={data.school.principalName} imageUrl={data.school.principalSignatureUrl} /></div>;
}

function ReportPageShell({ data, page, pageNumber, isLast }: { data: CounselorAssessmentReportData; page: ReportPage; pageNumber: number; isLast: boolean }) {
  return <section className="report-page counselor-report-page" dir="rtl"><ReportIdentity data={data} /><div className="counselor-report-section"><div className="counselor-report-section-title"><span /><h2>{page.title}</h2></div>{page.content}</div>{isLast ? <CounselorSignatures data={data} /> : null}<footer className="counselor-report-footer"><span>Teachix</span><strong>{pageNumber}</strong></footer></section>;
}

export function CounselorAssessmentReport({ data, visibilityOptions }: { data: CounselorAssessmentReportData; visibilityOptions: CounselorAssessmentReportVisibilityOptions }) {
  const pages: ReportPage[] = [];
  const addStudentPages = (id: string, title: string, students: CounselorReportStudent[], risk = false) => {
    chunk(students, 12).forEach((group, index) => pages.push({ id: `${id}-${index}`, title: index ? `${title} (تابع)` : title, content: risk ? <RiskStudentsTable students={group} /> : <StudentsTable students={group} /> }));
  };
  if (visibilityOptions.topTenStudents) addStudentPages("top-ten", "العشرة الأوائل", data.topTenStudents);
  if (visibilityOptions.bottomTenStudents) addStudentPages("bottom-ten", "العشرة الأقل أداءً", data.bottomTenStudents);
  if (visibilityOptions.bestSubject) pages.push({ id: "best-subject", title: "أفضل مادة", content: <SubjectFocus label="أفضل مادة" subject={data.bestSubject} /> });
  if (visibilityOptions.weakestSubject) pages.push({ id: "weakest-subject", title: "أضعف مادة", content: <SubjectFocus label="أضعف مادة" subject={data.weakestSubject} /> });
  if (visibilityOptions.riskStudents) addStudentPages("risk-students", "الطلاب المحتاجون متابعة", data.riskStudents, true);
  if (visibilityOptions.subjectComparison) chunk(data.subjectComparison, 14).forEach((group, index) => pages.push({ id: `subject-comparison-${index}`, title: index ? "مقارنة المواد (تابع)" : "مقارنة المواد", content: <ComparisonTable rows={group} /> }));
  if (visibilityOptions.classroomComparison) chunk(data.classroomComparison, 14).forEach((group, index) => pages.push({ id: `classroom-comparison-${index}`, title: index ? "مقارنة الفصول (تابع)" : "مقارنة الفصول", content: <ComparisonTable rows={group} /> }));
  if (!pages.length) pages.push({ id: "no-sections", title: "الأقسام التحليلية", content: <p className="counselor-report-empty">لم يتم اختيار أي قسم تحليلي لهذا التقرير.</p> });

  return <div className="counselor-assessment-report">{pages.map((page, index) => <ReportPageShell key={page.id} data={data} page={page} pageNumber={index + 1} isLast={index === pages.length - 1} />)}<style jsx global>{`
    @page { size: A4 portrait; margin: 0; }
    .counselor-assessment-report { direction: rtl; color: #183247; font-family: var(--font-cairo), "Cairo", Tahoma, Arial, sans-serif; }
    .counselor-report-page { width: 210mm; min-height: 297mm; margin: 0 auto 10mm; padding: 13mm 14mm 15mm; position: relative; overflow: hidden; background: #fff; box-shadow: 0 2px 14px rgba(18,57,86,.12); display: flex; flex-direction: column; }
    .counselor-report-brand { min-height: 22mm; display: grid; grid-template-columns: 42mm 1fr 42mm; direction: ltr; align-items: center; border-bottom: 1px solid #cddbe6; padding-bottom: 4mm; }
    .counselor-report-brand img { width: 32mm; height: 14mm; object-fit: contain; }
    .counselor-report-vision { text-align: left; }.counselor-report-ministry { text-align: right; }.counselor-report-school { direction: rtl; text-align: center; display: grid; gap: 1mm; }.counselor-report-school strong { color: #123956; font-size: 14px; }.counselor-report-school span { color: #62748a; font-size: 9px; font-weight: 700; }
    .counselor-report-title { margin: 6mm 0 6mm; text-align: center; }.counselor-report-title h1 { margin: 0 0 2mm; color: #123956; font-size: 23px; line-height: 1.25; }.counselor-report-title p { margin: 0; color: #62748a; font-size: 11px; font-weight: 700; }
    .counselor-report-section { flex: 1; }.counselor-report-section-title { display: flex; align-items: center; gap: 3mm; margin: 2mm 0 4mm; }.counselor-report-section-title > span { display: block; width: 4mm; height: 4mm; border-radius: 50%; background: #12b4ae; }.counselor-report-section-title h2 { margin: 0; color: #123956; font-size: 17px; }
    .counselor-report-table-wrap { border: 1px solid #cddbe6; border-radius: 4mm; overflow: hidden; }.counselor-report-table { width: 100%; border-collapse: collapse; font-size: 10px; }.counselor-report-table th { background: #123956; color: #fff; padding: 3mm 2.5mm; font-size: 9px; }.counselor-report-table td { padding: 3mm 2.5mm; border-bottom: 1px solid #e5edf3; text-align: center; font-weight: 700; }.counselor-report-table tbody tr:nth-child(even) { background: #f8fbfd; }.counselor-report-table tbody tr:last-child td { border-bottom: 0; }
    .counselor-report-focus { display: grid; grid-template-columns: repeat(auto-fit, minmax(36mm, 1fr)); gap: 3mm; }.counselor-report-focus > div { border: 1px solid #cddbe6; border-radius: 4mm; background: #f6f9fc; padding: 5mm; display: grid; gap: 1mm; }.counselor-report-focus span { color: #62748a; font-size: 9px; font-weight: 800; }.counselor-report-focus strong { color: #123956; font-size: 15px; }
    .counselor-report-empty { margin: 0; padding: 5mm; border: 1px dashed #cddbe6; border-radius: 4mm; color: #62748a; background: #f6f9fc; text-align: center; font-size: 11px; font-weight: 700; }.counselor-report-signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18mm; margin: 12mm 8mm 7mm; text-align: center; }.counselor-report-signature-box { min-height: 28mm; border-top: 1px dashed #91a8b8; padding-top: 3mm; }.counselor-report-signature-image { height: 14mm; display: grid; place-items: center; }.counselor-report-signature-image > span { width: 38mm; border-bottom: 1px solid #7992a3; }.counselor-report-signature-box strong { display: block; color: #123956; font-size: 10px; font-weight: 900; }.counselor-report-signature-box small { display: block; color: #40596e; font-size: 9px; font-weight: 800; }.counselor-report-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 5mm; color: #62748a; border-top: 1px solid #cddbe6; font-size: 8px; font-weight: 700; }.counselor-report-footer strong { color: #123956; font-size: 10px; }
    @media print { html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .counselor-report-page { margin: 0 !important; box-shadow: none !important; break-after: page; page-break-after: always; } .counselor-report-page:last-child { break-after: auto; page-break-after: auto; } }
    @media screen and (max-width: 760px) { .counselor-report-page { transform-origin: top center; } }
  `}</style></div>;
}
