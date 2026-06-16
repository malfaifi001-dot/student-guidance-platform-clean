import Link from "next/link";

import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { listReportTwoSnapshots } from "@/lib/report-2/report-snapshot-service";

function formatDate(value: string | null | undefined) {
  if (!value) return "غير محدد";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export async function ReportTwoHome() {
  const context = await requireDashboardPageContext();
  const snapshots = await listReportTwoSnapshots(context);

  return (
    <main className="min-h-screen bg-[#eef3ef] px-6 py-10" dir="rtl">
      <section className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-7 shadow-sm">
          <p className="text-sm font-black text-emerald-700">report-2</p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            التقارير المعتمدة
          </h1>

          <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
            أرشيف ثابت للتقارير التي تم اعتمادها من مسار report-2. تعرض هذه
            الصفحة النسخ المعتمدة فقط.
          </p>
        </div>

        {snapshots.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {snapshots.map((snapshot) => (
              <article
                key={snapshot.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-emerald-700">
                      {snapshot.serviceName ||
                        snapshot.serviceSlug ||
                        "خدمة غير محددة"}
                    </p>

                    <h2 className="mt-2 text-xl font-black leading-8 text-slate-950">
                      {snapshot.reportTitle}
                    </h2>

                    <p className="mt-2 text-xs font-bold text-slate-500" dir="ltr">
                      {snapshot.caseEntryId}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                    تم اعتماد التقرير
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4 text-xs font-bold text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="font-black text-slate-400">تاريخ الاعتماد</dt>
                    <dd className="mt-1 text-slate-800">
                      {formatDate(snapshot.approvedAt)}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-black text-slate-400">اعتمد بواسطة</dt>
                    <dd className="mt-1 text-slate-800">
                      {snapshot.approvedByName || "غير محدد"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/report-2/snapshots/${snapshot.id}/preview`}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800"
                  >
                    معاينة التقرير
                  </Link>

                  <Link
                    href={
                      snapshot.pdfUrl ||
                      `/dashboard/report-2/snapshots/${snapshot.id}/preview?print=1`
                    }
                    className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-xs font-black text-white transition hover:bg-sky-800"
                  >
                    تحميل PDF
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              لا توجد تقارير معتمدة بعد
            </h2>

            <p className="mt-3 text-sm font-bold text-slate-500">
              ستظهر هنا التقارير بعد اعتمادها من استوديو report-2.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
