import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function GuidanceProgramsPage() {
  const totalCases = await prisma.caseEntry.count({
    where: {
      service: {
        slug: "guidance-programs",
      },
    },
  });

  const draftCases = await prisma.caseEntry.count({
    where: {
      service: {
        slug: "guidance-programs",
      },
      status: "DRAFT",
    },
  });

  const submittedCases = await prisma.caseEntry.count({
    where: {
      service: {
        slug: "guidance-programs",
      },
      status: "SUBMITTED",
    },
  });

  const recentCases = await prisma.caseEntry.findMany({
    where: {
      service: {
        slug: "guidance-programs",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-cyan-500 to-sky-600 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-cyan-100">
          Guidance Programs Workspace
        </p>

        <h1 className="mt-4 text-5xl font-black">
          البرامج الإرشادية
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-cyan-50">
          إدارة البرامج الإرشادية الأسبوعية والفصلية، وربط التنفيذ
          بالشواهد والمستفيدين ومؤشرات الأداء ضمن Runtime موحد.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard/guidance-programs/new"
            className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-50"
          >
            إنشاء برنامج جديد
          </Link>

          <Link
            href="/dashboard/cases"
            className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-white/20"
          >
            مركز الحالات العام
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">
            إجمالي البرامج
          </p>

          <p className="mt-4 text-5xl font-black text-slate-900">
            {totalCases}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">
            المسودات
          </p>

          <p className="mt-4 text-5xl font-black text-amber-500">
            {draftCases}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">
            البرامج المعتمدة
          </p>

          <p className="mt-4 text-5xl font-black text-emerald-600">
            {submittedCases}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-8 py-6">
          <h2 className="text-3xl font-black text-slate-900">
            أحدث البرامج
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            جميع البرامج مرتبطة لاحقًا بمحرك التنفيذ الديناميكي.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  العنوان
                </th>

                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  الحالة
                </th>

                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  التاريخ
                </th>

                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                  الإجراء
                </th>
              </tr>
            </thead>

            <tbody>
              {recentCases.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-6 py-5 font-bold text-slate-900">
                    {item.title}
                  </td>

                  <td className="px-6 py-5">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {item.status}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString(
                      "ar-SA"
                    )}
                  </td>

                  <td className="px-6 py-5">
                    <Link
                      href={`/dashboard/cases/${item.id}`}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}