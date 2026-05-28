import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CasesPage() {
  const cases = await prisma.caseEntry.findMany({
    include: {
      student: true,
      service: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-sky-100">Cases Center</p>

        <h1 className="mt-3 text-4xl font-black">
          الحالات والسجلات
        </h1>

        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          جميع الحالات المحفوظة من الـ Runtime تظهر هنا بشكل موحد.
        </p>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white card-shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">العنوان</th>
                <th className="p-4">الخدمة</th>
                <th className="p-4">الطالب</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {cases.map((caseItem) => (
                <tr
                  key={caseItem.id}
                  className="border-t border-slate-100"
                >
                  <td className="p-4 font-bold text-slate-900">
                    {caseItem.title}
                  </td>

                  <td className="p-4 text-slate-500">
                    {caseItem.service.name}
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
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/cases/${caseItem.id}`}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        عرض
                      </Link>

                      <Link
                        href={`/dashboard/cases/${caseItem.id}/edit`}
                        className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700"
                      >
                        متابعة
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {cases.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-slate-400"
                  >
                    لا توجد حالات محفوظة بعد.
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