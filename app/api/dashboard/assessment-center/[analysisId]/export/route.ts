import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import type {
  AssessmentAnalysisSummary,
  AssessmentResultRow,
} from "@/lib/assessment-center/assessment-center-types";
import { buildAssessmentSmartNarrative } from "@/lib/assessment-center/assessment-center-insights";
import { buildAssessmentPdfHtml } from "@/lib/assessment-center/assessment-pdf-report";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    analysisId: string;
  }>;
};

function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function asSummary(value: unknown): AssessmentAnalysisSummary | null {
  if (!value || typeof value !== "object") return null;
  return value as AssessmentAnalysisSummary;
}

function asRows(value: unknown): AssessmentResultRow[] {
  if (!Array.isArray(value)) return [];
  return value as AssessmentResultRow[];
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildAttachmentContentDisposition(
  fileBaseName: string,
  extension: "pdf" | "xlsx"
) {
  const encodedFileName = encodeURIComponent(`${fileBaseName}.${extension}`);

  return `attachment; filename="assessment-analysis.${extension}"; filename*=UTF-8''${encodedFileName}`;
}

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

function shouldAutoPrint(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("print") === "1";
}

function injectPrintScript(html: string) {
  const printScript = `
<script>
window.addEventListener("load", async () => {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {}

  window.setTimeout(() => window.print(), 500);
});
</script>`;

  return html.includes("</body>")
    ? html.replace("</body>", `${printScript}\n</body>`)
    : `${html}${printScript}`;
}

function buildExcelBuffer({
  analysis,
  summary,
  rows,
}: {
  analysis: {
    title: string;
    sourceFile?: string | null;
    totalStudents: number;
    totalRows: number;
    totalSubjects: number;
    averagePercentage?: number | null;
    createdAt: Date;
  };
  summary: AssessmentAnalysisSummary | null;
  rows: AssessmentResultRow[];
}) {
  const workbook = XLSX.utils.book_new();
  const smartNarrative = buildAssessmentSmartNarrative(summary);

  const overviewRows = [
    ["العنوان", analysis.title],
    ["الملف", analysis.sourceFile || ""],
    ["تاريخ التحليل", analysis.createdAt.toLocaleDateString("ar-SA")],
    ["عدد الطلاب", analysis.totalStudents],
    ["عدد النتائج", analysis.totalRows],
    ["عدد المواد", analysis.totalSubjects],
    ["المتوسط العام", `${Math.round(Number(analysis.averagePercentage || 0))}%`],
    ["الطلاب المحتاجون متابعة", summary?.riskStudentsCount || 0],
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(overviewRows),
    "ملخص التحليل"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      smartNarrative.insights.map((item, index) => ({
        "#": index + 1,
        "الملخص الذكي": item,
      }))
    ),
    "الملخص الذكي"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      smartNarrative.recommendations.map((item, index) => ({
        "#": index + 1,
        "التوصية العلاجية": item,
      }))
    ),
    "التوصيات العلاجية"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      smartNarrative.interventions.map((item, index) => ({
        "#": index + 1,
        "عنوان التدخل": item.title,
        "الوصف": item.description,
        "النوع": item.target,
        "الإجراء المستقبلي": item.futureAction,
      }))
    ),
    "التدخلات المقترحة"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        "اسم الطالب": row.studentName,
        "رقم الهوية": row.nationalId || "",
        "الصف": row.grade || "",
        "الفصل": row.classroom || "",
        "المادة": row.subject,
        "الدرجة": row.score ?? "",
        "الدرجة الكلية": row.maxScore ?? "",
        "النسبة": row.percentage ?? "",
        "الحالة": row.status || "",
        "الفصل الدراسي": row.semester || "",
        "العام الدراسي": row.academicYear || "",
      }))
    ),
    "نتائج الطلاب"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(summary?.subjectAverages || []),
    "متوسط المواد"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(summary?.classroomAverages || []),
    "متوسط الفصول"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(summary?.gradeAverages || []),
    "متوسط الصفوف"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(summary?.riskStudents || []),
    "طلاب يحتاجون متابعة"
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
}

function renderList(items: string[], emptyText: string) {
  if (!items.length) {
    return `<div class="empty">${escapeHtml(emptyText)}</div>`;
  }

  return items
    .map((item) => `<div class="note">${escapeHtml(item)}</div>`)
    .join("");
}

function buildPdfHtml({
  analysis,
  summary,
  rows,
}: {
  analysis: {
    title: string;
    sourceFile?: string | null;
    totalStudents: number;
    totalRows: number;
    totalSubjects: number;
    averagePercentage?: number | null;
    createdAt: Date;
  };
  summary: AssessmentAnalysisSummary | null;
  rows: AssessmentResultRow[];
}) {
  const smartNarrative = buildAssessmentSmartNarrative(summary);

  const subjectRows = (summary?.subjectAverages || [])
    .slice(0, 10)
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.subject)}</td>
          <td>${item.averagePercentage}%</td>
          <td>${item.totalRows}</td>
          <td>${item.riskCount}</td>
        </tr>
      `
    )
    .join("");

  const riskRows = (summary?.riskStudents || [])
    .slice(0, 12)
    .map(
      (student) => `
        <tr>
          <td>${escapeHtml(student.studentName)}</td>
          <td>${escapeHtml(student.grade || "-")}</td>
          <td>${escapeHtml(student.classroom || "-")}</td>
          <td>${student.averagePercentage}%</td>
          <td>${escapeHtml(student.weakSubjects.join("، ") || "-")}</td>
        </tr>
      `
    )
    .join("");

  const interventionRows = smartNarrative.interventions
    .slice(0, 8)
    .map(
      (item) => `
        <div class="intervention">
          <div class="intervention-title">${escapeHtml(item.title)}</div>
          <div class="intervention-desc">${escapeHtml(item.description)}</div>
          <div class="future-action">لاحقًا: ${escapeHtml(item.futureAction)}</div>
        </div>
      `
    )
    .join("");

  const resultRows = rows
    .slice(0, 35)
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.studentName)}</td>
          <td>${escapeHtml(row.grade || "-")}</td>
          <td>${escapeHtml(row.classroom || "-")}</td>
          <td>${escapeHtml(row.subject)}</td>
          <td>${escapeHtml(row.score ?? "-")} / ${escapeHtml(row.maxScore ?? "-")}</td>
          <td>${escapeHtml(row.percentage ?? "-")}%</td>
        </tr>
      `
    )
    .join("");

  return `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      font-family: Arial, "Tahoma", sans-serif;
      color: #0f172a;
      background: #eef2f7;
      direction: rtl;
    }
    .page {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 28px;
      padding: 28px;
    }
    .header {
      background: linear-gradient(135deg, #0e7490, #2563eb);
      color: white;
      border-radius: 26px;
      padding: 30px;
      margin-bottom: 22px;
      position: relative;
      overflow: hidden;
    }
    .header:before {
      content: "";
      position: absolute;
      width: 260px;
      height: 260px;
      background: rgba(255,255,255,0.12);
      border-radius: 999px;
      left: -80px;
      top: -100px;
    }
    .label {
      display: inline-block;
      background: rgba(255,255,255,0.16);
      border: 1px solid rgba(255,255,255,0.22);
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 14px;
    }
    h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 900;
      line-height: 1.5;
    }
    .muted {
      color: #64748b;
      font-size: 13px;
      line-height: 1.9;
    }
    .header .muted { color: #e0f2fe; }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 18px 0 22px;
    }
    .kpi {
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 16px;
      background: #f8fafc;
    }
    .kpi-label {
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
    }
    .kpi-value {
      margin-top: 8px;
      font-size: 26px;
      font-weight: 900;
      color: #0f172a;
    }
    h2 {
      font-size: 21px;
      margin: 28px 0 12px;
      font-weight: 900;
      color: #0f172a;
    }
    .section {
      border: 1px solid #e2e8f0;
      border-radius: 22px;
      padding: 18px;
      margin-bottom: 18px;
      background: #ffffff;
    }
    .note {
      background: #ecfeff;
      border: 1px solid #cffafe;
      color: #155e75;
      border-radius: 16px;
      padding: 12px 14px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.9;
      margin-bottom: 8px;
    }
    .recommendation {
      background: #ecfdf5;
      border-color: #d1fae5;
      color: #065f46;
    }
    .intervention {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 10px;
    }
    .intervention-title {
      font-weight: 900;
      color: #0f172a;
      font-size: 14px;
    }
    .intervention-desc {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.8;
      color: #92400e;
      font-weight: 700;
    }
    .future-action {
      margin-top: 8px;
      background: rgba(255,255,255,0.7);
      border-radius: 12px;
      padding: 8px;
      font-size: 11px;
      color: #92400e;
      font-weight: 900;
    }
    .empty {
      background: #f8fafc;
      color: #64748b;
      border-radius: 14px;
      padding: 12px;
      font-size: 13px;
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 16px;
      font-size: 12px;
      margin-bottom: 18px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      text-align: right;
      padding: 10px;
      font-weight: 900;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      font-weight: 700;
    }
    .footer {
      margin-top: 26px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 12px;
      text-align: center;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="header">
      <div class="label">مركز التحليل والاختبارات</div>
      <h1>${escapeHtml(analysis.title)}</h1>
      <p class="muted">
        مصدر الملف: ${escapeHtml(analysis.sourceFile || "غير محدد")}
        <br />
        تاريخ التحليل: ${analysis.createdAt.toLocaleDateString("ar-SA")}
      </p>
    </section>

    <section class="kpis">
      <div class="kpi"><div class="kpi-label">عدد الطلاب</div><div class="kpi-value">${analysis.totalStudents}</div></div>
      <div class="kpi"><div class="kpi-label">عدد النتائج</div><div class="kpi-value">${analysis.totalRows}</div></div>
      <div class="kpi"><div class="kpi-label">عدد المواد</div><div class="kpi-value">${analysis.totalSubjects}</div></div>
      <div class="kpi"><div class="kpi-label">المتوسط</div><div class="kpi-value">${Math.round(Number(analysis.averagePercentage || 0))}%</div></div>
    </section>

    <section class="section">
      <h2>الملخص الذكي</h2>
      ${renderList(smartNarrative.insights, "لا يوجد ملخص ذكي لهذا التحليل.")}
    </section>

    <section class="section">
      <h2>التوصيات العلاجية</h2>
      ${smartNarrative.recommendations.length ? smartNarrative.recommendations.map((item) => `<div class="note recommendation">${escapeHtml(item)}</div>`).join("") : '<div class="empty">لا توجد توصيات علاجية.</div>'}
    </section>

    <section class="section">
      <h2>التدخلات المقترحة مستقبلًا</h2>
      ${interventionRows || '<div class="empty">لا توجد تدخلات مقترحة في هذا التحليل.</div>'}
    </section>

    <h2>متوسط المواد</h2>
    <table>
      <thead>
        <tr>
          <th>المادة</th>
          <th>المتوسط</th>
          <th>عدد النتائج</th>
          <th>حالات الخطر</th>
        </tr>
      </thead>
      <tbody>${subjectRows || "<tr><td colspan='4'>لا توجد بيانات.</td></tr>"}</tbody>
    </table>

    <h2>الطلاب المحتاجون متابعة</h2>
    <table>
      <thead>
        <tr>
          <th>الطالب</th>
          <th>الصف</th>
          <th>الفصل</th>
          <th>المتوسط</th>
          <th>مواد تحتاج متابعة</th>
        </tr>
      </thead>
      <tbody>${riskRows || "<tr><td colspan='5'>لا توجد بيانات.</td></tr>"}</tbody>
    </table>

    <h2>عينة النتائج</h2>
    <table>
      <thead>
        <tr>
          <th>الطالب</th>
          <th>الصف</th>
          <th>الفصل</th>
          <th>المادة</th>
          <th>الدرجة</th>
          <th>النسبة</th>
        </tr>
      </thead>
      <tbody>${resultRows || "<tr><td colspan='6'>لا توجد بيانات.</td></tr>"}</tbody>
    </table>

    <div class="footer">
      Teachix
      <br />
      تقرير صادر من مركز التحليل والاختبارات
    </div>
  </div>
</body>
</html>
`;
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) {
    return auth;
  }

  const serviceGuard = await requireServiceAccessApi("assessment-center");
  if (serviceGuard) return serviceGuard;

  const { analysisId } = await context.params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "excel";

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: {
      id: analysisId,
      ...assessmentAnalysisOwnershipWhere(auth.schoolAccountId, auth.user.id, { historicalPersonalRead: true }),
    },
  });

  if (!analysis) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم العثور على التحليل.",
      },
      { status: 404 }
    );
  }

  const summary = asSummary(analysis.summaryJson);
  const rows = asRows(analysis.rowsJson);
  const fileBaseName = safeFileName(analysis.title || "assessment-analysis");

  if (format === "pdf") {
    const schoolProfile = analysis.schoolAccountId
      ? await prisma.schoolProfile
          .findFirst({
            where: {
              schoolAccountId: analysis.schoolAccountId,
            },
          })
          .catch(() => null)
      : null;

    const html = buildAssessmentPdfHtml({
      analysis,
      summary,
      rows,
      schoolProfile,
    });

    const responseHtml = shouldAutoPrint(request) ? injectPrintScript(html) : html;

    return new NextResponse(responseHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  const excelBuffer = buildExcelBuffer({
    analysis,
    summary,
    rows,
  });

  return new Response(toArrayBuffer(excelBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": buildAttachmentContentDisposition(fileBaseName, "xlsx"),
    },
  });
}
