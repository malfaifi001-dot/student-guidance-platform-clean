import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function StudentGuidanceServicesPage() {
  const totalCases = await prisma.caseEntry.count({
    where: {
      service: {
        slug: "student-guidance-services",
      },
    },
  });

  const draftCases = await prisma.caseEntry.count({
    where: {
      service: {
        slug: "student-guidance-services",
      },
      status: "DRAFT",
    },
  });

  const submittedCases = await prisma.caseEntry.count({
    where: {
      service: {
        slug: "student-guidance-services",
      },
      status: "SUBMITTED",
    },
  });

  const recentCases = await prisma.caseEntry.findMany({
    where: {
      service: {
        slug: "student-guidance-services",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-100">
          Workflow Runtime
        </p>

        <h1 className="mt-4 text-5xl font-black">
          الخدمات التوجيهية المقدمة للطلاب
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-sky-50">
          إدارة الخدمات التوجيهية من خلال Workflow مستقل، مع دعم الإرشاد الفردي والجماعي والتوجيه الجمعي حسب إعدادات النموذج.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard/student-guidance-services/new"
            className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-50"
          >
            إنشاء خدمة جديدة
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
        <Card title="إجمالي السجلات" value={totalCases} />
        <Card title="المسودات" value={draftCases} />
        <Card title="المرسلة نهائيًا" value={submittedCases} />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-8 py-6">
          <h2 className="text-3xl font-black text-slate-900">
            سجلات هذه الخدمة
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            هذه السجلات تخص خدمة الخدمات التوجيهية المقدمة للطلاب فقط.
          </p>
        </div>

        {recentCases.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            لا توجد سجلات حتى الآن.
          </div>
        ) : (
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
                    <td className="px-6 py-5 font-black text-slate-900">
                      {item.title || "خدمة توجيهية"}
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {item.status}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString("ar-SA")}
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
        )}
      </section>
    </main>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">
        {title}
      </p>

      <p className="mt-4 text-5xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}