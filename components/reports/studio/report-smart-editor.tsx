"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function ReportSmartEditor({ value, onChange }: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-xl font-black text-slate-900">محرر التقرير</h2>

        <p className="mt-2 text-sm text-slate-500">
          يمكنك تعديل التقرير مباشرة قبل الاعتماد النهائي.
        </p>
      </div>

      <div className="p-6">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[850px] w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 p-8 text-lg leading-[2.6rem] text-slate-800 outline-none focus:border-blue-400"
          placeholder="ابدأ بكتابة التقرير..."
        />
      </div>
    </section>
  );
}