type Props = {
  data: {
    studentName?: string;
    grade?: string;
    classroom?: string;
    serviceType?: string;
  };
};

export function ReportContextPanel({ data }: Props) {
  return (
    <aside className="h-full rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">بيانات الخدمة</h2>

      <div className="mt-5 space-y-4">
        <Info label="الطالب/الطالبة" value={data.studentName} />
        <Info label="الصف" value={data.grade} />
        <Info label="الشعبة" value={data.classroom} />
        <Info label="نوع الخدمة" value={data.serviceType} />
      </div>
    </aside>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}