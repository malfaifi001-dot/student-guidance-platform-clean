"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SearchableRtlSelectProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
};

type MenuPosition = {
  left: number;
  width: number;
  maxHeight: number;
  placement: "top" | "bottom";
  offset: number;
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
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim();
    return normalizedQuery
      ? options.filter((option) => option.includes(normalizedQuery))
      : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const gap = 8;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
      const availableAbove = rect.top - viewportPadding;
      const placement = availableBelow >= 240 || availableBelow >= availableAbove
        ? "bottom"
        : "top";
      const availableHeight = placement === "bottom" ? availableBelow : availableAbove;
      const maxHeight = Math.max(150, Math.min(360, availableHeight - gap));
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - viewportPadding - width,
      );

      setMenuPosition({
        left,
        width,
        maxHeight,
        placement,
        offset: placement === "bottom" ? rect.bottom + gap : window.innerHeight - rect.top + gap,
      });
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <label className="block space-y-2 text-sm font-bold text-slate-700" dir="rtl">
      <span>
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right outline-none transition focus:border-blue-500"
      >
        <span className={value ? "text-slate-950" : "text-slate-400"}>
          {value || placeholder}
        </span>
      </button>
      {open && menuPosition && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
          dir="rtl"
          style={{
            left: menuPosition.left,
            width: menuPosition.width,
            maxHeight: menuPosition.maxHeight,
            ...(menuPosition.placement === "bottom"
              ? { top: menuPosition.offset }
              : { bottom: menuPosition.offset }),
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-right outline-none focus:border-blue-500"
          />
          <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
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
        </div>,
        document.body,
      ) : null}
    </label>
  );
}
