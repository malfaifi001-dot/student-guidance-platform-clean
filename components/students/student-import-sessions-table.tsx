import Link from "next/link";

type ImportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type StudentImportSessionRow = {
  id: string;
  fileName: string;
  status: ImportStatus;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  createdAt: string | Date;
  createdBy?: string | null;
};

type StudentImportSessionsTableProps = {
  sessions?: StudentImportSessionRow[];
};

const statusLabels: Record<ImportStatus, string> = {
  PENDING: "بانتظار المعالجة",
  PROCESSING: "قيد المعالجة",
  COMPLETED: "مكتمل",
  FAILED: "فشل الاستيراد",
};

export function StudentImportSessionsTable({
  sessions = [],
}: StudentImportSessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-900">
          لا توجد عمليات استيراد حتى الآن
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          عند رفع ملف طلاب من نظام نور ستظهر جلسات الاستيراد هنا.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-right text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">اسم الملف</th>
            <th className="px-4 py-3 font-semibold">الحالة</th>
            <th className="px-4 py-3 font-semibold">الإجمالي</th>
            <th className="px-4 py-3 font-semibold">المستوردة</th>
            <th className="px-4 py-3 font-semibold">الأخطاء</th>
            <th className="px-4 py-3 font-semibold">تاريخ الرفع</th>
            <th className="px-4 py-3 font-semibold">الإجراء</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <tr key={session.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                {session.fileName}
              </td>

              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {statusLabels[session.status]}
                </span>
              </td>

              <td className="px-4 py-3 text-slate-700">{session.totalRows}</td>
              <td className="px-4 py-3 text-slate-700">
                {session.importedRows}
              </td>
              <td className="px-4 py-3 text-slate-700">{session.failedRows}</td>

              <td className="px-4 py-3 text-slate-500">
                {new Date(session.createdAt).toLocaleDateString("ar-SA")}
              </td>

              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/admin/students/import-sessions/${session.id}`}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                >
                  عرض التفاصيل
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}