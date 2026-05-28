import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function StudentImportSessionPage({ params }: PageProps) {
  const { sessionId } = await params;

  const session = await prisma.studentImportSession.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      files: true,
      rows: {
        orderBy: {
          rowIndex: "asc",
        },
        take: 100,
      },
    },
  });

  if (!session) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-sky-100">Import Session</p>
        <h1 className="mt-3 text-4xl font-black">تفاصيل دفعة الاستيراد</h1>
        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          هذه الصفحة تعرض الدفعة بعد تحليل ملف نور، وقبل اعتمادها النهائي داخل بيانات الطلاب.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <p className="text-sm text-slate-500">الحالة</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{session.status}</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <p className="text-sm text-slate-500">إجمالي الصفوف</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{session.totalRows}</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <p className="text-sm text-slate-500">الصفوف الصالحة</p>
          <p className="mt-2 text-2xl font-black text-emerald-700">{session.validRows}</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 card-shadow">
          <p className="text-sm text-slate-500">الصفوف غير الصالحة</p>
          <p className="mt-2 text-2xl font-black text-rose-700">{session.invalidRows}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white card-shadow">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">معاينة أول 100 صف</h2>
            <p className="mt-1 text-sm text-slate-500">
              الاعتماد النهائي سيتم إضافته في الخطوة التالية.
            </p>
          </div>

          <Link
            href="/dashboard/student-import"
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            العودة
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">#</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">الاسم</th>
                <th className="p-4">الهوية</th>
                <th className="p-4">الجنس</th>
                <th className="p-4">المرحلة</th>
                <th className="p-4">الصف</th>
                <th className="p-4">الفصل</th>
                <th className="p-4">ولي الأمر</th>
                <th className="p-4">الجوال</th>
              </tr>
            </thead>

            <tbody>
              {session.rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="p-4 text-slate-500">{row.rowIndex}</td>
                  <td className="p-4 font-bold text-slate-700">{row.status}</td>
                  <td className="p-4 font-bold text-slate-900">{row.fullName}</td>
                  <td className="p-4 text-slate-500">{row.nationalId || "—"}</td>
                  <td className="p-4 text-slate-500">
                    {row.gender === "FEMALE"
                      ? "طالبة"
                      : row.gender === "MALE"
                        ? "طالب"
                        : "غير محدد"}
                  </td>
                  <td className="p-4 text-slate-500">{row.stage || "—"}</td>
                  <td className="p-4 text-slate-500">{row.grade || "—"}</td>
                  <td className="p-4 text-slate-500">{row.classroom || "—"}</td>
                  <td className="p-4 text-slate-500">{row.guardianName || "—"}</td>
                  <td className="p-4 text-slate-500">{row.guardianPhone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}