"use client";

import {
  useEffect,
  useRef,
} from "react";

import Link from "next/link";

import {
  PrintExportPopCard,
} from "@/components/print-export/print-export-pop-card";

import {
  usePrintExportAction,
} from "@/components/print-export/use-print-export-action";

export type StatisticsReportViewData = {
  id: string;
  title: string;

  serviceSlug: string;
  serviceName: string;

  dateFrom: string;
  dateTo: string;

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
    name: string;
    jobTitle: string;
  };
};

type Props = {
  data: StatisticsReportViewData;
  autoPrint: boolean;
};

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "ar-SA",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  ).format(new Date(value));
}

export function StatisticsReportView({
  data,
  autoPrint,
}: Props) {
  const printedRef =
    useRef(false);

  const {
    status: printExportStatus,
    modal: printExportModal,
    runPrintExport,
    openFallbackPrintUrl,
    closeModal,
  } = usePrintExportAction();

  useEffect(() => {
    if (
      !autoPrint ||
      printedRef.current
    ) {
      return;
    }

    printedRef.current = true;

    const timeout = setTimeout(
      () => {
        window.print();
      },
      500,
    );

    return () =>
      clearTimeout(timeout);
  }, [autoPrint]);

  async function openPrintReport() {
    await runPrintExport({
      printUrl:
        `/dashboard/statistics/${data.id}?print=1`,

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
      {!autoPrint ? (
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

      <article className="statistics-report-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden bg-white shadow-xl print:min-h-0 print:max-w-none print:shadow-none">
        <header className="border-b-[3px] border-cyan-800 px-[14mm] pb-6 pt-[12mm]">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              {data.school.logoUrl ? (
                <img
                  src={
                    data.school.logoUrl
                  }
                  alt="شعار المدرسة"
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-center text-xs font-black text-slate-500">
                  شعار
                  <br />
                  المدرسة
                </div>
              )}

              <div>
                <p className="text-sm font-bold text-slate-500">
                  المملكة العربية السعودية
                </p>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  وزارة التعليم
                </p>

                {data.school
                  .educationDepartment ? (
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {
                      data.school
                        .educationDepartment
                    }
                  </p>
                ) : null}

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  {data.school.name}
                </h2>
              </div>
            </div>

            <div className="text-left text-xs font-bold leading-6 text-slate-500">
              {data.school
                .academicYear ? (
                <p>
                  العام الدراسي:{" "}
                  {
                    data.school
                      .academicYear
                  }
                </p>
              ) : null}

              {data.school
                .currentSemester ? (
                <p>
                  الفصل:{" "}
                  {
                    data.school
                      .currentSemester
                  }
                </p>
              ) : null}

              <p>
                تاريخ الإنشاء:{" "}
                {formatDate(
                  data.createdAt,
                )}
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm font-black tracking-wide text-cyan-700">
              تقرير رسمي
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              تقرير إحصائي
            </h1>

            <p className="mt-3 text-lg font-bold text-slate-600">
              {data.serviceName}
            </p>
          </div>
        </header>

        <div className="space-y-7 px-[14mm] py-[10mm]">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs font-bold text-slate-500">
                الحالات المؤهلة
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {
                  data.sourceCaseCount
                }
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs font-bold text-slate-500">
                التقارير الصادرة
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {
                  data.sourceReportCount
                }
              </p>
            </div>

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

          <section className="break-inside-avoid">
            <h2 className="border-r-4 border-cyan-700 pr-3 text-xl font-black text-slate-950">
              الوصف التنفيذي
            </h2>

            <p className="mt-4 whitespace-pre-wrap text-justify text-[14px] font-semibold leading-8 text-slate-700">
              {
                data.executiveDescription
              }
            </p>
          </section>


          {data.insights.length ? (
            <section className="break-inside-avoid">
              <h2 className="border-r-4 border-cyan-700 pr-3 text-xl font-black text-slate-950">
                أبرز الاستنتاجات
              </h2>

              <ol className="mt-4 space-y-3">
                {data.insights.map(
                  (
                    insight,
                    index,
                  ) => (
                    <li
                      key={`${index}-${insight}`}
                      className="flex gap-3 text-sm font-semibold leading-7 text-slate-700"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-black text-cyan-800">
                        {index + 1}
                      </span>

                      <span>
                        {insight}
                      </span>
                    </li>
                  ),
                )}
              </ol>
            </section>
          ) : null}

          {data.recommendations
            .length ? (
            <section className="break-inside-avoid">
              <h2 className="border-r-4 border-cyan-700 pr-3 text-xl font-black text-slate-950">
                التوصيات
              </h2>

              <ol className="mt-4 space-y-3">
                {data.recommendations.map(
                  (
                    recommendation,
                    index,
                  ) => (
                    <li
                      key={`${index}-${recommendation}`}
                      className="flex gap-3 text-sm font-semibold leading-7 text-slate-700"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-800">
                        {index + 1}
                      </span>

                      <span>
                        {
                          recommendation
                        }
                      </span>
                    </li>
                  ),
                )}
              </ol>
            </section>
          ) : null}

          <section className="break-inside-avoid rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-black text-slate-950">
              منهجية التقرير
            </h2>

            <p className="mt-3 text-xs font-semibold leading-6 text-slate-600">
              تم احتساب كل حالة مرة واحدة
              لكل قيمة مختارة، واقتصر
              المصدر على الحالات المرتبطة
              بتقارير صادرة ضمن الفترة
              المحددة. تمت صياغة النص
              التنفيذي بعد اكتمال الحساب
              الرقمي، ولم تدخل الشواهد أو
              البيانات الشخصية في التحليل.
            </p>
          </section>
        </div>

        <footer className="mt-auto border-t border-slate-200 px-[14mm] py-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold text-slate-500">
                أعد التقرير
              </p>

              <p className="mt-2 font-black text-slate-950">
                {data.creator.name}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-500">
                {data.creator.jobTitle}
              </p>
            </div>

            <div className="text-left text-xs font-bold leading-6 text-slate-500">
              <p>
                رقم التقرير:
              </p>

              <p className="font-mono text-[10px]">
                {data.id}
              </p>
            </div>
          </div>
        </footer>
      </article>

      <PrintExportPopCard
        modal={printExportModal}
        onClose={closeModal}
        onOpenFallback={
          openFallbackPrintUrl
        }
      />

      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .statistics-print-controls {
            display: none !important;
          }

          .statistics-report-sheet {
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          .statistics-report-sheet section,
          .statistics-report-sheet table,
          .statistics-report-sheet tr {
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}