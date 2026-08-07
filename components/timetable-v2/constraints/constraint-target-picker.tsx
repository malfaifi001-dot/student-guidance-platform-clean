"use client";

type TargetPickerItem = {
  id: string;
  name: string;
};

type Props = {
  title: string;
  hint?: string;
  items: TargetPickerItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
};

export function ConstraintTargetPicker({
  title,
  hint,
  items,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: Props) {
  const allSelected =
    items.length > 0 &&
    items.every((item) =>
      selected.includes(item.id),
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-black text-slate-900">
            {title}
          </div>

          {hint ? (
            <div className="mt-0.5 text-[11px] text-slate-500">
              {hint}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-100 px-3 py-1 text-[11px] font-black text-teal-700">
            {selected.length} من{" "}
            {items.length} محدد
          </span>

          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-[11px] font-black text-teal-700 transition hover:bg-teal-50"
          >
            {allSelected
              ? "محدد الكل"
              : "تحديد الكل"}
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={selected.length === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            مسح التحديد
          </button>
        </div>
      </div>

      <div className="mt-3 flex max-h-44 flex-wrap gap-2 overflow-y-auto">
        {items.map((item) => {
          const active = selected.includes(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={[
                "rounded-xl border px-3 py-2 text-xs font-black transition",
                active
                  ? "border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-300",
              ].join(" ")}
            >
              {item.name}
            </button>
          );
        })}

        {items.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            لا توجد عناصر متاحة.
          </div>
        ) : null}
      </div>
    </div>
  );
}
