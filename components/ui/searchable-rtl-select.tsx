"use client";

import { useMemo, useState } from "react";

type SearchableRtlSelectProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
};

export function SearchableRtlSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "اختر من القائمة",
  searchPlaceholder = "ابحث...",
  required = false,
}: SearchableRtlSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim();
    return normalizedQuery
      ? options.filter((option) => option.includes(normalizedQuery))
      : options;
  }, [options, query]);

  return (
    <label className="relative block space-y-2 text-sm font-bold text-slate-700" dir="rtl">
      <span>
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right outline-none transition focus:border-blue-500"
      >
        <span className={value ? "text-slate-950" : "text-slate-400"}>
          {value || placeholder}
        </span>
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full z-40 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-right outline-none focus:border-blue-500"
          />
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full whitespace-normal rounded-xl px-3 py-2 text-right text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                {option}
              </button>
            ))}
            {!filteredOptions.length ? (
              <p className="px-3 py-4 text-center text-xs font-bold text-slate-500">
                لا توجد نتائج مطابقة.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </label>
  );
}
