"use client";

type Props = {
  defaultName?: string;
  defaultContent?: string;
  onSubmit?: (data: { name: string; content: string }) => void;
};

export function ReportTemplateForm({
  defaultName = "",
  defaultContent = "",
  onSubmit,
}: Props) {
  return (
    <form
      className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        onSubmit?.({
          name: String(formData.get("name") || ""),
          content: String(formData.get("content") || ""),
        });
      }}
    >
      <div>
        <label className="text-sm font-black text-slate-700">
          اسم التامبلت
        </label>

        <input
          name="name"
          defaultValue={defaultName}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-sky-400"
          placeholder="مثال: تقرير جلسة فردية"
        />
      </div>

      <div>
        <label className="text-sm font-black text-slate-700">
          نص التامبلت
        </label>

        <textarea
          name="content"
          defaultValue={defaultContent}
          className="mt-2 min-h-[320px] w-full rounded-2xl border border-slate-200 p-4 text-sm leading-7 outline-none focus:border-sky-400"
          placeholder="اكتب نص التامبلت هنا..."
        />
      </div>

      <button
        type="submit"
        className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
      >
        حفظ التامبلت
      </button>
    </form>
  );
}