import Link from "next/link";
import {
  ArrowUpLeft,
  ClipboardList,
  FilePlus2,
  FileText,
  Layers3,
} from "lucide-react";

type ServiceWorkspaceProps = {
  service: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  };
  stats: {
    totalCases: number;
    draftCases: number;
    submittedCases: number;
  };
  latestCases: Array<{
    id: string;
    title: string | null;
    status: string;
    createdAt: Date;
    student: {
      fullName: string;
    } | null;
  }>;
};

export function ServiceWorkspace({
  service,
  stats,
  latestCases,
}: ServiceWorkspaceProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-sky-100">Service Workspace</p>

        <h1 className="mt-3 text-4xl font-black">{service.name}</h1>

        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          {service.description ||
            "مساحة عمل موحدة للخدمة تعرض النماذج، المسودات، السجلات، والإحصائيات."}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/${service.slug}/new`}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-50"
          >
            <FilePlus2 className="h-4 w-4" />
            إنشاء سجل جديد
          </Link>

          <Link
            href="/dashboard/cases"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-6 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            <Layers3 className="h-4 w-4" />
            مركز الحالات العام
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <ClipboardList className="mb-4 h-6 w-6 text-sky-600" />
          <p className="text-sm text-slate-500">إجمالي سجلات الخدمة</p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {stats.totalCases}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <FileText className="mb-4 h-6 w-6 text-amber-600" />
          <p className="text-sm text-slate-500">المسودات</p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {stats.draftCases}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <FileText className="mb-4 h-6 w-6 text-emerald-600" />
          <p className="text-sm text-slate-500">المرسلة نهائيًا</p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {stats.submittedCases}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white card-shadow">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-2xl font-black text-slate-900">
            سجلات هذه الخدمة
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            هذه السجلات تخص هذه الخدمة فقط، بينما مركز الحالات العام يجمع كل الخدمات.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">العنوان</th>
                <th className="p-4">الطالب</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">الإجراء</th>
              </tr>
            </thead>

            <tbody>
              {latestCases.map((caseItem) => (
                <tr key={caseItem.id} className="border-t border-slate-100">
                  <td className="p-4 font-bold text-slate-900">
                    {caseItem.title || "بدون عنوان"}
                  </td>

                  <td className="p-4 text-slate-500">
                    {caseItem.student?.fullName || "بدون طالب"}
                  </td>

                  <td className="p-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {caseItem.status}
                    </span>
                  </td>

                  <td className="p-4 text-slate-500">
                    {new Date(caseItem.createdAt).toLocaleDateString("ar-SA")}
                  </td>

                  <td className="p-4">
                    <Link
                      href={`/dashboard/cases/${caseItem.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      عرض
                      <ArrowUpLeft className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}

              {latestCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    لا توجد سجلات لهذه الخدمة بعد.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}