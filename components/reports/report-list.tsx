import Link from "next/link";
import { ReportActions } from "./report-actions";

type Props = {
  reports: Array<{
    id: string;
    title: string;
    serviceSlug: string;
    status: string;
    createdAt: Date;
    caseEntry: {
      service: {
        name: string;
      };
      student: {
        fullName: string;
      } | null;
    };
  }>;
};

export function ReportList({ reports }: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-8 py-6">
        <h2 className="text-3xl font-black text-slate-900">التقارير المحفوظة</h2>
        <p className="mt-2 text-sm text-slate-500">
          يمكنك فتح التقرير، تعديله، معاينته، اعتماده أو حذفه.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          لا توجد تقارير محفوظة حتى الآن.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">العنوان</th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">الخدمة</th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">المستفيد</th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">التاريخ</th>
                <th className="px-6 py-4 text-right text-sm font-black text-slate-700">الإجراء</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t border-slate-100">
                  <td className="px-6 py-5 font-black text-slate-900">
                    {report.title}
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-600">
                    {report.caseEntry.service.name}
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-600">
                    {report.caseEntry.student?.fullName || "-"}
                  </td>

                  <td className="px-6 py-5">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {report.status}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-500">
                    {new Date(report.createdAt).toLocaleDateString("ar-SA")}
                  </td>

                  <td className="px-6 py-5">
                    <ReportActions reportId={report.id} status={report.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}