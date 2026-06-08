import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import type {
  AssessmentAnalysisSummary,
  AssessmentResultRow,
} from "@/lib/assessment-center/assessment-center-types";

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
    XLSX.utils.json_to_sheet(summary?.riskStudents || []),
    "طلاب يحتاجون متابعة"
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
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
  const subjectRows = (summary?.subjectAverages || [])
    .slice(0, 8)
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
      padding: 32px;
      font-family: Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      direction: rtl;
    }
    .page {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 28px;
    }
    .hero {
      background: linear-gradient(135deg, #0891b2, #2563eb);
      color: white;
      border-radius: 24px;
      padding: 28px;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 900;
    }
    .muted {
      color: #64748b;
      font-size: 13px;
      line-height: 1.8;
    }
    .hero .muted { color: #e0f2fe; }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 20px 0;
    }
    .kpi {
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 16px;
      background: #f8fafc;
    }
    .kpi-label {
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
    }
    .kpi-value {
      margin-top: 8px;
      font-size: 26px;
      font-weight: 900;
      color: #0f172a;
    }
    h2 {
      font-size: 20px;
      margin: 26px 0 12px;
      font-weight: 900;
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
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <h1>${escapeHtml(analysis.title)}</h1>
      <p class="muted">
        مركز التحليل والاختبارات — مصدر الملف: ${escapeHtml(analysis.sourceFile || "غير محدد")}
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
      منصة التوجيه الطلابي — تقرير صادر من مركز التحليل والاختبارات
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
      schoolAccountId: auth.schoolAccountId,
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
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(
        buildPdfHtml({
          analysis,
          summary,
          rows,
        }),
        { waitUntil: "load" }
      );

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "12mm",
          right: "10mm",
          bottom: "12mm",
          left: "10mm",
        },
      });

      return new Response(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileBaseName}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  }

  const excelBuffer = buildExcelBuffer({
    analysis,
    summary,
    rows,
  });

  return new Response(excelBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileBaseName}.xlsx"`,
    },
  });
}