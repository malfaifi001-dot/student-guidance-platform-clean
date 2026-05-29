"use client";

type Template = {
  id: string;
  title: string;
  content: string;
};

type Props = {
  templates: Template[];
  onInsert: (content: string) => void;
};

export function ReportTemplateSidebar({ templates, onInsert }: Props) {
  return (
    <aside className="h-full rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">النصوص المقترحة</h2>

        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
          Templates
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onInsert(template.content)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right transition hover:border-blue-300 hover:bg-blue-50"
          >
            <p className="font-black text-slate-900">{template.title}</p>

            <p className="mt-2 line-clamp-4 text-sm leading-7 text-slate-500">
              {template.content}
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}