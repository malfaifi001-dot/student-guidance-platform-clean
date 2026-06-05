import type { ReactNode } from "react";
import {
  Bell,
  ClipboardList,
  FileText,
  ImageIcon,
} from "lucide-react";

type Props = {
  casesCount: number;
  reportsCount: number;
  evidencesCount: number;
  remindersCount: number;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

export function StudentRecordSummaryCards({
  casesCount,
  reportsCount,
  evidencesCount,
  remindersCount,
}: Props) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        icon={<ClipboardList className="h-5 w-5" />}
        label="الحالات"
        value={formatCount(casesCount)}
        helper="كل ما تم تسجيله للطالب"
      />

      <SummaryCard
        icon={<FileText className="h-5 w-5" />}
        label="التقارير"
        value={formatCount(reportsCount)}
        helper="تقارير صادرة أو محفوظة"
      />

      <SummaryCard
        icon={<ImageIcon className="h-5 w-5" />}
        label="الشواهد"
        value={formatCount(evidencesCount)}
        helper="ملفات وصور مرتبطة"
      />

      <SummaryCard
        icon={<Bell className="h-5 w-5" />}
        label="التنبيهات"
        value={formatCount(remindersCount)}
        helper="تنبيهات مرتبطة بالطالب"
      />
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            {helper}
          </p>
        </div>
      </div>
    </article>
  );
}
