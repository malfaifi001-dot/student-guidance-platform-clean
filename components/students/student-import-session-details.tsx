type Props = {
  session?: {
    id: string;
    title?: string | null;
    status?: string | null;
    totalRows?: number | null;
    validRows?: number | null;
    invalidRows?: number | null;
    createdCount?: number | null;
    updatedCount?: number | null;
    skippedCount?: number | null;
  } | null;
};

export function StudentImportSessionDetails({ session }: Props) {
  if (!session) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          لا توجد جلسة استيراد محددة.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">
        تفاصيل جلسة الاستيراد
      </h2>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Info label="العنوان" value={session.title || session.id} />
        <Info label="الحالة" value={session.status || "-"} />
        <Info label="إجمالي الصفوف" value={session.totalRows ?? 0} />
        <Info label="الصفوف الصحيحة" value={session.validRows ?? 0} />
        <Info label="الصفوف غير الصحيحة" value={session.invalidRows ?? 0} />
        <Info label="تم إنشاؤها" value={session.createdCount ?? 0} />
        <Info label="تم تحديثها" value={session.updatedCount ?? 0} />
        <Info label="تم تجاوزها" value={session.skippedCount ?? 0} />
      </div>
    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}