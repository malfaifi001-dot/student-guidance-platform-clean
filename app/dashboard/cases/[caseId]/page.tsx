import { notFound } from "next/navigation";
import { getCaseById } from "@/engine/cases/case-runtime-engine";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function CaseDetailsPage({
  params,
}: PageProps) {
  const { caseId } = await params;

  try {
    const caseEntry = await getCaseById(caseId);

    return (
      <div className="space-y-8">
        <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
          <p className="text-sm font-semibold text-sky-100">
            Case Viewer
          </p>

          <h1 className="mt-3 text-4xl font-black">
            {caseEntry.title}
          </h1>

          <p className="mt-4 max-w-3xl leading-8 text-sky-50">
            عرض كامل للحالة المحفوظة داخل Runtime Persistence Layer.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
            <p className="text-sm text-slate-500">الخدمة</p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {caseEntry.service.name}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
            <p className="text-sm text-slate-500">الطالب</p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {caseEntry.student?.fullName || "بدون طالب"}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
            <p className="text-sm text-slate-500">الحالة</p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {caseEntry.status}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
            <p className="text-sm text-slate-500">التاريخ</p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {new Date(caseEntry.createdAt).toLocaleDateString("ar-SA")}
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
          <h2 className="text-2xl font-black text-slate-900">
            القيم المحفوظة
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {caseEntry.values.map((value) => (
              <div
                key={value.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <p className="text-xs font-bold text-slate-400">
                  {value.fieldKey}
                </p>

                <pre className="mt-3 overflow-auto whitespace-pre-wrap text-sm text-slate-700">
                  {JSON.stringify(
                    value.jsonValue ?? value.value,
                    null,
                    2
                  )}
                </pre>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  } catch {
    notFound();
  }
}