"use client";

import Link from "next/link";

import {
  PrintExportPopCard,
} from "@/components/print-export/print-export-pop-card";

import {
  usePrintExportAction,
} from "@/components/print-export/use-print-export-action";

import {
  StatisticsPrintController,
} from "@/components/statistics/statistics-print-controller";
import { getReportPreparedByLabel } from "@/lib/statistics/statistics-report-copy";

export type StatisticsReportViewData = {
  id: string;
  title: string;

  serviceSlug: string;
  serviceName: string;
  serviceNames: string[];

  dateFrom: string | null;
  dateTo: string | null;

  sourceCaseCount: number;
  sourceReportCount: number;

  analysisMode: string;
  createdAt: string;

  metrics: Array<{
    metricId: string;
    fieldLabel: string;
    valueLabel: string;
    caseCount: number;
  }>;

  executiveDescription: string;
  insights: string[];
  recommendations: string[];

  school: {
    name: string;
    educationDepartment: string;
    educationOffice: string;
    city: string;
    stage: string;
    academicYear: string;
    currentSemester: string;
    logoUrl: string;
  };

  creator: {
    gender: string;
    name: string;
    jobTitle: string;
  };
};

type Props = {
  data: StatisticsReportViewData;
  autoPrint: boolean;
  showControls?: boolean;
};

const MINISTRY_OF_EDUCATION_LOGO_SRC = "/uploads/school-logos/MOE.png";

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "جميع الفترات";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Riyadh",
    },
  ).format(new Date(value)).replaceAll("/", "-");
}

function formatEducationDepartmentLine(input: {
  educationDepartment: string;
  educationOffice: string;
}) {
  const rawValue = (
    input.educationDepartment ||
    input.educationOffice
  )
    .replace(/\s+/g, " ")
    .trim();

  if (!rawValue) return "";

  const location = rawValue
    .replace(/^مكتب\s+(?:ال)?تعليم\s*/u, "")
    .replace(/^مكتب\s+التعليم\s*/u, "")
    .replace(/^الإدارة\s+العامة\s+للتعليم\s*(?:بمنطقة)?\s*/u, "")
    .replace(/^الإدارة\s+التعليمية\s*(?:بمنطقة)?\s*/u, "")
    .replace(/^إدارة\s+(?:ال)?تعليم\s*(?:بمنطقة)?\s*/u, "")
    .replace(/^تعليم\s+منطقة\s*/u, "")
    .replace(/^ب?منطقة\s*/u, "")
    .trim();

  return location
    ? `الإدارة التعليمية بمنطقة ${location}`
    : "الإدارة التعليمية";
}

export function StatisticsReportView({
  data,
  autoPrint,
  showControls = true,
}: Props) {
  const educationDepartmentLine = formatEducationDepartmentLine({
    educationOffice: data.school.educationOffice,
    educationDepartment: data.school.educationDepartment,
  });

  const {
    status: printExportStatus,
    modal: printExportModal,
    runPrintExport,
    openFallbackPrintUrl,
    closeModal,
  } = usePrintExportAction();

  async function openPrintReport() {
    await runPrintExport({
      printUrl:
        `/print/statistics/${encodeURIComponent(data.id)}?print=1`,

      blockedTitle:
        "معاينة طباعة التقرير الإحصائي",

      blockedMessage:
        "تم حظر فتح معاينة الطباعة تلقائيًا. استخدم الزر أدناه لفتح التقرير في تبويب جديد.",

      errorTitle:
        "طباعة التقرير الإحصائي",

      errorMessage:
        "تعذر فتح التقرير للطباعة. حاول مرة أخرى.",
    });
  }

  return (
    <main
      className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0"
      dir="rtl"
    >
      <StatisticsPrintController
        enabled={autoPrint}
      />

      {showControls && !autoPrint ? (
        <section className="statistics-print-controls mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Link
            href="/dashboard/statistics"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            العودة إلى الإحصائيات
          </Link>

          <button
            type="button"
            onClick={
              openPrintReport
            }
            disabled={
              printExportStatus ===
              "loading"
            }
            className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-cyan-800 disabled:opacity-50"
          >
            {printExportStatus ===
            "loading"
              ? "جارٍ فتح الطباعة..."
              : "طباعة / حفظ PDF"}
          </button>
        </section>
      ) : null}

      <div className="statistics-a4-preview w-full overflow-x-auto pb-2">
      <article className="statistics-report-sheet mx-auto flex min-h-[297mm] w-[210mm] min-w-[210mm] flex-col bg-white shadow-xl print:shadow-none">
        <header className="break-inside-avoid border-b-2 border-cyan-700 px-[14mm] pb-[6mm] pt-[8mm]">
          <div className="grid min-h-[34mm] grid-cols-[repeat(3,minmax(0,1fr))] items-center gap-[6mm]">
            <div className="flex min-h-[34mm] flex-col items-center justify-center space-y-0.5 text-center text-sm font-bold leading-6 text-slate-600">
              <p>المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              {educationDepartmentLine ? <p>{educationDepartmentLine}</p> : null}
              {data.school.name ? <p>{data.school.name}</p> : null}
            </div>

            <div className="flex min-h-[34mm] min-w-0 flex-col items-center justify-center text-center">
              <img
                src={MINISTRY_OF_EDUCATION_LOGO_SRC}
                alt="شعار وزارة التعليم"
                data-statistics-ministry-logo="true"
                className="h-[20.25mm] w-auto max-w-[47.25mm] object-contain"
              />
            </div>

            <div className="flex min-h-[34mm] flex-col items-center justify-center space-y-0.5 text-center text-sm font-bold leading-6 text-slate-600">
              <p>تاريخ الإنشاء: {formatDate(data.createdAt)}</p>
            </div>
          </div>

          <div className="mt-[5mm] text-center">
            <h1 className="text-3xl font-black text-slate-950">
              تقرير إحصائي
            </h1>
          </div>
        </header>

        <div className="statistics-report-content flex-1 space-y-7 px-[14mm] py-[10mm]">
          <section className="mx-auto grid w-full max-w-[120mm] break-inside-avoid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs font-bold text-slate-500">
                بداية الفترة
              </p>

              <p className="mt-2 text-sm font-black text-slate-950">
                {formatDate(
                  data.dateFrom,
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs font-bold text-slate-500">
                نهاية الفترة
              </p>

              <p className="mt-2 text-sm font-black text-slate-950">
                {formatDate(
                  data.dateTo,
                )}
              </p>
            </div>
          </section>

          <section>
            <h2 className="break-after-avoid border-r-4 border-cyan-700 pr-3 text-xl font-black text-slate-950">
              وصف التقرير الإحصائي
            </h2>

            <p className="mt-4 whitespace-pre-wrap text-justify text-[14px] font-semibold leading-8 text-slate-700">
              {
                data.executiveDescription
              }
            </p>
          </section>
        </div>

        <footer className="mt-auto break-inside-avoid border-t border-slate-200 px-[14mm] py-6">
          <div className="flex items-end justify-start">
            <div>
              <p className="text-xs font-bold text-slate-500">
                {getReportPreparedByLabel(data.creator.gender)}
              </p>

              <p className="mt-2 font-black text-slate-950">
                {data.creator.name}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-500">
                {data.creator.jobTitle}
              </p>
            </div>
          </div>
        </footer>
      </article>
      </div>

      {showControls ? (
        <PrintExportPopCard
          modal={printExportModal}
          onClose={closeModal}
          onOpenFallback={openFallbackPrintUrl}
        />
      ) : null}

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        .statistics-report-sheet {
          box-sizing: border-box;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .statistics-print-controls {
            display: none !important;
          }

          .statistics-a4-preview {
            overflow: visible !important;
            padding: 0 !important;
          }

          .statistics-report-sheet {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          .statistics-report-sheet table,
          .statistics-report-sheet tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .statistics-report-sheet header,
          .statistics-report-sheet footer {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
