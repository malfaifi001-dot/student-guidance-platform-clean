import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

type WorkflowHealthReportProps = {
  report: {
    score: number;
    status: string;
    errors: string[];
    warnings: string[];
    insights: string[];
    summary: {
      stepsCount: number;
      fieldsCount: number;
      optionsCount: number;
      requiredFields: number;
      dependentFields: number;
    };
  };
};

export function WorkflowHealthReport({ report }: WorkflowHealthReportProps) {
  const statusLabel =
    report.status === "READY"
      ? "جاهز للتشغيل"
      : report.status === "WARNING"
        ? "جاهز مع تحذيرات"
        : "يحتاج إصلاح";

  const statusClass =
    report.status === "READY"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : report.status === "WARNING"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-rose-50 text-rose-700 border-rose-100";

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-sky-700">Workflow Health</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            تقرير جودة الـ Workflow
          </h2>
        </div>

        <div className={`rounded-2xl border px-5 py-3 text-sm font-black ${statusClass}`}>
          {statusLabel} · {report.score}%
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        {[
          ["الخطوات", report.summary.stepsCount],
          ["الحقول", report.summary.fieldsCount],
          ["الخيارات", report.summary.optionsCount],
          ["المطلوبة", report.summary.requiredFields],
          ["التبعيات", report.summary.dependentFields],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
          <div className="mb-3 flex items-center gap-2 font-black text-rose-700">
            <ShieldAlert className="h-5 w-5" />
            أخطاء
          </div>

          <div className="space-y-2 text-sm leading-7 text-rose-700">
            {report.errors.length > 0 ? (
              report.errors.map((item) => <p key={item}>• {item}</p>)
            ) : (
              <p>لا توجد أخطاء حرجة.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <div className="mb-3 flex items-center gap-2 font-black text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            تحذيرات
          </div>

          <div className="space-y-2 text-sm leading-7 text-amber-700">
            {report.warnings.length > 0 ? (
              report.warnings.map((item) => <p key={item}>• {item}</p>)
            ) : (
              <p>لا توجد تحذيرات.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
          <div className="mb-3 flex items-center gap-2 font-black text-sky-700">
            <Info className="h-5 w-5" />
            قراءة ذكية
          </div>

          <div className="space-y-2 text-sm leading-7 text-sky-700">
            {report.insights.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
      </div>

      {report.status === "READY" ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          هذا الـ Workflow جاهز للاستخدام داخل Runtime.
        </div>
      ) : null}
    </section>
  );
}