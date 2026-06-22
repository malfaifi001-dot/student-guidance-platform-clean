import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type {
  AssessmentAnalysisSummary,
  AssessmentGradeBand,
  AssessmentResultRow,
  AssessmentStudentPerformanceSummary,
  AssessmentSubjectSummary,
} from "./assessment-center-types";
import {
  buildAssessmentAnalysisSummary,
  getGradeBandLabel,
} from "./assessment-analysis-summary";

type PdfAnalysis = {
  title: string;
  sourceFile?: string | null;
  totalStudents: number;
  totalRows: number;
  totalSubjects: number;
  averagePercentage?: number | null;
  createdAt: Date;
};

type SchoolProfileInfo = {
  schoolName?: string | null;
  educationDepartment?: string | null;
  educationOffice?: string | null;
  academicYear?: string | null;
  currentSemester?: string | null;
};

const gradeBandOrder: AssessmentGradeBand[] = [
  "EXCELLENT",
  "VERY_GOOD",
  "GOOD",
  "ACCEPTABLE",
  "WEAK",
  "UNKNOWN",
];

const bandColor: Record<AssessmentGradeBand, string> = {
  EXCELLENT: "#155e75",
  VERY_GOOD: "#15803d",
  GOOD: "#2563eb",
  ACCEPTABLE: "#b45309",
  WEAK: "#b91c1c",
  UNKNOWN: "#94a3b8",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function percent(value: unknown) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function short(value: unknown, max = 46) {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  );
}

function dateText(date: Date) {
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function logoDataUri() {
  const path = join(process.cwd(), "public", "uploads", "school-logos", "MOE.png");
  if (!existsSync(path)) return null;

  try {
    return `data:image/png;base64,${readFileSync(path).toString("base64")}`;
  } catch {
    return null;
  }
}

function getScope(rows: AssessmentResultRow[]) {
  const grades = unique(rows.map((row) => row.grade));
  const classrooms = unique(rows.map((row) => row.classroom));
  const semesters = unique(rows.map((row) => row.semester));
  const years = unique(rows.map((row) => row.academicYear));

  return {
    grade: grades.length === 1 ? grades[0] : grades.length > 1 ? "متعدد" : "-",
    classroom:
      classrooms.length === 1 ? classrooms[0] : classrooms.length > 1 ? "متعدد" : "-",
    semester: semesters.length === 1 ? semesters[0] : semesters.length > 1 ? "متعدد" : "-",
    year: years.length === 1 ? years[0] : years.length > 1 ? "متعدد" : "-",
  };
}

function getSummary(summary: AssessmentAnalysisSummary | null, rows: AssessmentResultRow[]) {
  if (rows.length) return buildAssessmentAnalysisSummary(rows);
  return summary;
}

function getBandItems(summary: AssessmentAnalysisSummary | null) {
  const source = summary?.gradeBandSummary || [];

  return gradeBandOrder.map((band) => {
    const found = source.find((item) => item.band === band);
    return {
      band,
      label: getGradeBandLabel(band),
      count: found?.count || 0,
      percentage: found?.percentage || 0,
    };
  });
}

function donutGradient(summary: AssessmentAnalysisSummary | null) {
  const items = getBandItems(summary).filter((item) => item.count > 0);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (!total) return "conic-gradient(#e2e8f0 0deg 360deg)";

  let start = 0;
  const parts = items.map((item) => {
    const size = (item.count / total) * 360;
    const end = start + size;
    const part = `${bandColor[item.band]} ${start}deg ${end}deg`;
    start = end;
    return part;
  });

  return `conic-gradient(${parts.join(", ")})`;
}

function renderBandLegend(summary: AssessmentAnalysisSummary | null) {
  return getBandItems(summary)
    .filter((item) => item.band !== "UNKNOWN" || item.count > 0)
    .map(
      (item) => `
        <div class="legend-row">
          <span class="dot" style="background:${bandColor[item.band]}"></span>
          <span>${escapeHtml(item.label)}</span>
          <b>${item.count}</b>
        </div>
      `,
    )
    .join("");
}

function renderMetric(label: string, value: string | number, hint?: string) {
  return `
    <div class="metric">
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </div>
  `;
}

function renderSubjectBars(subjects: AssessmentSubjectSummary[]) {
  if (!subjects.length) return `<div class="empty">لا توجد بيانات مواد.</div>`;

  return subjects
    .slice(0, 5)
    .map((item) => {
      const value = percent(item.averagePercentage);

      return `
        <div class="bar-row">
          <div class="bar-line">
            <span>${escapeHtml(short(item.subject, 36))}</span>
            <b>${value}%</b>
          </div>
          <div class="track">
            <div class="fill" style="width:${Math.max(value, 4)}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderTopStudents(students: AssessmentStudentPerformanceSummary[]) {
  if (!students.length) return `<div class="empty">لا توجد بيانات.</div>`;

  return students
    .slice(0, 5)
    .map(
      (student, index) => `
        <div class="student-row">
          <span>${index + 1}</span>
          <strong>${escapeHtml(short(student.studentName, 34))}</strong>
          <b>${percent(student.averagePercentage)}%</b>
        </div>
      `,
    )
    .join("");
}

function renderFollowStudents(students: AssessmentStudentPerformanceSummary[]) {
  if (!students.length) {
    return `<div class="empty">لا يوجد طلاب يحتاجون متابعة مباشرة.</div>`;
  }

  return students
    .slice(0, 5)
    .map(
      (student) => `
        <div class="follow-row">
          <strong>${escapeHtml(short(student.studentName, 34))}</strong>
          <span>${escapeHtml(short(student.weakSubjects?.slice(0, 2).join("، ") || "متابعة عامة", 40))}</span>
          <b>${percent(student.averagePercentage)}%</b>
        </div>
      `,
    )
    .join("");
}
function executiveText(average: number, weakestSubjects: AssessmentSubjectSummary[]) {
  const weakest = weakestSubjects.slice(0, 2).map((item) => item.subject).join(" و ");

  if (average >= 90) {
    return `المؤشر العام مرتفع، ويوصى بالتركيز على الحالات الفردية والمواد الأقل متوسطًا${weakest ? ` مثل ${weakest}` : ""}.`;
  }

  if (average >= 70) {
    return "المؤشر العام جيد، ويوصى بخطة متابعة قصيرة للمواد الأقل أداءً والطلاب متوسطي المستوى.";
  }

  return "المؤشر العام يحتاج تدخلًا عاجلًا، ويوصى بخطة علاجية مباشرة للمواد والطلاب الأقل أداءً.";
}

export function buildAssessmentPdfHtml({
  analysis,
  summary,
  rows,
  schoolProfile,
}: {
  analysis: PdfAnalysis;
  summary: AssessmentAnalysisSummary | null;
  rows: AssessmentResultRow[];
  schoolProfile?: SchoolProfileInfo | null;
}) {
  const reportSummary = getSummary(summary, rows);
  const scope = getScope(rows);
  const logo = logoDataUri();

  const average = percent(reportSummary?.averagePercentage ?? analysis.averagePercentage ?? 0);
  const subjects = [...(reportSummary?.subjectAverages || [])].sort(
    (a, b) => a.averagePercentage - b.averagePercentage,
  );
  const weakestSubjects =
    reportSummary?.weakestSubjects?.length ? reportSummary.weakestSubjects : subjects.slice(0, 5);

  const topStudents = reportSummary?.topFiveStudents || [];
  const followStudents =
    (reportSummary?.weakStudents?.length
      ? reportSummary.weakStudents
      : reportSummary?.riskStudents || []) as AssessmentStudentPerformanceSummary[];

  const excellentCount =
    reportSummary?.excellentStudentsList?.length ?? reportSummary?.excellentStudents ?? 0;
  const followCount =
    reportSummary?.weakStudents?.length ?? reportSummary?.riskStudentsCount ?? 0;

  return `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
      direction: rtl;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Tahoma, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 210mm;
      height: 297mm;
      padding: 11mm 10mm;
      overflow: hidden;
      background: #ffffff;
    }
    .official-header {
      height: 32mm;
      border: 1px solid #cbd5e1;
      border-bottom: 3px solid #0f172a;
      border-radius: 18px;
      display: grid;
      grid-template-columns: 50mm 1fr 50mm;
      align-items: center;
      overflow: hidden;
      background: #ffffff;
    }
    .header-side {
      height: 100%;
      padding: 6mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      font-size: 9px;
      line-height: 1.7;
      color: #334155;
      font-weight: 800;
    }
    .header-center {
      height: 100%;
      padding: 5mm 4mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      border-right: 1px solid #cbd5e1;
      border-left: 1px solid #cbd5e1;
      text-align: center;
    }
    .header-center span {
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      padding: 1.5mm 5mm;
      font-size: 8px;
      font-weight: 900;
      color: #334155;
      margin-bottom: 2mm;
    }
    .header-center h1 {
      margin: 0;
      font-size: 17px;
      line-height: 1.45;
      color: #0f172a;
      font-weight: 900;
    }
    .logo-row {
      display: flex;
      align-items: center;
      gap: 3mm;
      justify-content: flex-start;
    }
    .logo-row img {
      width: 20mm;
      height: 20mm;
      object-fit: contain;
    }
    .moe-text {
      font-size: 10px;
      font-weight: 900;
      line-height: 1.6;
      color: #334155;
    }
    .summary-strip {
      margin-top: 7mm;
      border: 1px solid #dbe4ef;
      border-radius: 18px;
      padding: 5mm;
      display: grid;
      grid-template-columns: 38mm 1fr;
      gap: 5mm;
      align-items: center;
      background: #ffffff;
    }
    .score {
      width: 32mm;
      height: 32mm;
      border-radius: 999px;
      background: conic-gradient(#155e75 0deg ${average * 3.6}deg, #e2e8f0 ${average * 3.6}deg 360deg);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: auto;
    }
    .score-inner {
      width: 23mm;
      height: 23mm;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .score-inner b {
      font-size: 19px;
      line-height: 1;
      font-weight: 900;
      color: #0f172a;
    }
    .score-inner small {
      margin-top: 1.5mm;
      font-size: 7px;
      color: #64748b;
      font-weight: 900;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 3mm;
    }
    .metric {
      border: 1px solid #e2e8f0;
      border-radius: 13px;
      background: #f8fafc;
      padding: 3.5mm;
      min-height: 18mm;
      text-align: center;
    }
    .metric span {
      display: block;
      color: #64748b;
      font-size: 8px;
      font-weight: 900;
    }
    .metric b {
      display: block;
      margin-top: 2mm;
      color: #0f172a;
      font-size: 17px;
      line-height: 1;
      font-weight: 900;
    }
    .metric small {
      display: block;
      margin-top: 1mm;
      color: #64748b;
      font-size: 7px;
      font-weight: 700;
    }
    .section-title {
      margin-top: 7mm;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 2.5mm 5mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #0f172a;
      font-size: 12px;
      font-weight: 900;
      background: #ffffff;
    }
    .section-title span {
      font-size: 8px;
      color: #64748b;
    }
    .grid {
      margin-top: 4mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
    }
    .card {
      min-height: 51mm;
      border: 1px solid #dbe4ef;
      border-radius: 16px;
      padding: 4.5mm;
      background: #ffffff;
    }
    .card h2 {
      margin: 0 0 3.5mm;
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
    }
    .card-label {
      display: block;
      margin-bottom: 1mm;
      color: #155e75;
      font-size: 8px;
      font-weight: 900;
    }
    .donut-area {
      display: grid;
      grid-template-columns: 34mm 1fr;
      gap: 4mm;
      align-items: center;
    }
    .donut {
      width: 30mm;
      height: 30mm;
      border-radius: 999px;
      background: ${donutGradient(reportSummary)};
      position: relative;
      margin: auto;
    }
    .donut:after {
      content: "";
      position: absolute;
      inset: 7mm;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .legend-row {
      display: grid;
      grid-template-columns: 3mm 1fr 9mm;
      gap: 2mm;
      align-items: center;
      font-size: 8.5px;
      font-weight: 800;
      color: #334155;
      margin-bottom: 2mm;
    }
    .dot {
      width: 2.5mm;
      height: 2.5mm;
      border-radius: 999px;
      display: block;
    }
    .bar-row {
      margin-bottom: 2.8mm;
    }
    .bar-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3mm;
      font-size: 8.5px;
      font-weight: 900;
      color: #334155;
      margin-bottom: 1.2mm;
    }
    .track {
      height: 3mm;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #155e75, #22c55e);
    }
    .student-row {
      display: grid;
      grid-template-columns: 8mm 1fr 12mm;
      gap: 2mm;
      align-items: center;
      border: 1px solid #eef2f7;
      border-radius: 10px;
      background: #f8fafc;
      padding: 2.2mm;
      margin-bottom: 2mm;
      font-size: 8.5px;
    }
    .student-row span {
      width: 7mm;
      height: 7mm;
      border-radius: 999px;
      background: #e0f2fe;
      color: #155e75;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
    }
    .student-row strong {
      color: #111827;
      font-weight: 900;
      line-height: 1.4;
    }
    .student-row b {
      text-align: left;
      color: #0f172a;
      font-weight: 900;
    }
    .follow-row {
      display: grid;
      grid-template-columns: 1fr 26mm 12mm;
      gap: 2mm;
      align-items: center;
      border: 1px solid #fed7aa;
      border-radius: 10px;
      background: #fff7ed;
      padding: 2.2mm;
      margin-bottom: 2mm;
      font-size: 8px;
    }
    .follow-row strong {
      color: #111827;
      font-weight: 900;
    }
    .follow-row span {
      color: #9a3412;
      font-weight: 800;
      line-height: 1.35;
    }
    .follow-row b {
      color: #0f172a;
      text-align: left;
      font-weight: 900;
    }
    .executive {
      grid-column: 1 / -1;
      min-height: 35mm;
    }
    .executive-box {
      border: 1px solid #bae6fd;
      border-radius: 13px;
      background: #ecfeff;
      padding: 4mm;
      color: #155e75;
      font-size: 10px;
      line-height: 1.8;
      font-weight: 900;
    }
    .actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3mm;
      margin-top: 3mm;
    }
    .action {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      padding: 3mm;
      text-align: center;
      color: #334155;
      font-size: 8.5px;
      line-height: 1.6;
      font-weight: 900;
    }
    .empty {
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
      padding: 5mm;
      text-align: center;
      color: #64748b;
      font-size: 8.5px;
      font-weight: 900;
    }
    .footer {
      margin-top: 4mm;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 2mm 5mm;
      text-align: center;
      color: #64748b;
      font-size: 7.8px;
      font-weight: 800;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="official-header">
      <div class="header-side">
        <b>اسم المدرسة</b>
        ${escapeHtml(schoolProfile?.schoolName || "-")}
        <br />
        <b>تاريخ التقرير</b>
        ${escapeHtml(dateText(analysis.createdAt))}
      </div>

      <div class="header-center">
        <span>تقرير رسمي لتحليل النتائج</span>
        <h1>تقرير تحليل نتائج الاختبارات</h1>
      </div>

      <div class="header-side">
        <div class="logo-row">
          ${
            logo
              ? `<img src="${logo}" alt="شعار وزارة التعليم" />`
              : `<div class="moe-text">وزارة<br />التعليم</div>`
          }
          <div class="moe-text">
            وزارة التعليم
            <br />
            ${escapeHtml(schoolProfile?.educationDepartment || "إدارة التعليم")}
            <br />
            ${escapeHtml(schoolProfile?.educationOffice || "مكتب التعليم")}
          </div>
        </div>
      </div>
    </section>

    <section class="summary-strip">
      <div class="score">
        <div class="score-inner">
          <b>${average}%</b>
          <small>المتوسط العام</small>
        </div>
      </div>

      <div class="metrics">
        ${renderMetric("عدد الطلاب", reportSummary?.totalStudents ?? analysis.totalStudents)}
        ${renderMetric("عدد المواد", reportSummary?.totalSubjects ?? analysis.totalSubjects)}
        ${renderMetric("عدد النتائج", reportSummary?.totalRows ?? analysis.totalRows)}
        ${renderMetric("متفوقون", excellentCount)}
        ${renderMetric("يحتاجون متابعة", followCount)}
      </div>
    </section>

    <div class="section-title">
      <strong>لوحة مؤشرات التحليل</strong>
      <span>
        الصف: ${escapeHtml(scope.grade)} · الفصل: ${escapeHtml(scope.classroom)} · الفصل الدراسي: ${escapeHtml(scope.semester)}
      </span>
    </div>

    <section class="grid">
      <div class="card">
        <span class="card-label">التوزيع العام</span>
        <h2>توزيع التقديرات</h2>
        <div class="donut-area">
          <div class="donut"></div>
          <div>${renderBandLegend(reportSummary)}</div>
        </div>
      </div>

      <div class="card">
        <span class="card-label">الأولوية التعليمية</span>
        <h2>أضعف المواد</h2>
        ${renderSubjectBars(weakestSubjects)}
      </div>

      <div class="card">
        <span class="card-label">التميز</span>
        <h2>الخمسة الأوائل</h2>
        ${renderTopStudents(topStudents)}
      </div>

      <div class="card">
        <span class="card-label">المتابعة</span>
        <h2>طلاب يحتاجون متابعة</h2>
        ${renderFollowStudents(followStudents)}
      </div>

      <div class="card executive">
        <span class="card-label">القراءة التحليلية</span>
        <h2>الخلاصة والتوصية</h2>
        <div class="executive-box">
          ${escapeHtml(executiveText(average, weakestSubjects))}
        </div>
        <div class="actions">
          <div class="action">متابعة الطلاب الأقل أداءً.</div>
          <div class="action">خطة قصيرة لأضعف مادتين.</div>
          <div class="action">إعادة القياس بعد المعالجة.</div>
        </div>
      </div>
    </section>

    <div class="footer">
      تم إنشاء هذا التقرير من مركز التحليل والاختبارات في منصة التوجيه الطلابي · صفحة واحدة رسمية قابلة للأرشفة والطباعة
    </div>
  </main>
</body>
</html>
`;
}