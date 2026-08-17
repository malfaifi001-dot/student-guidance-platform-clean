"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { EllipsisVertical } from "lucide-react";

const MENU_EVENT = "teachix:expandable-action-menu-open";

type ExpandableActionMenuProps = {
  menuId: string;
  children: ReactNode;
  className?: string;
  stripClassName?: string;
  overlayStrip?: boolean;
};

export function ExpandableActionMenu({
  menuId,
  children,
  className = "",
  stripClassName = "",
  overlayStrip = false,
}: ExpandableActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeWhenAnotherOpens(event: Event) {
      if ((event as CustomEvent<string>).detail !== menuId) {
        setOpen(false);
      }
    }

    function closeWhenOutside(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener(MENU_EVENT, closeWhenAnotherOpens);
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener(MENU_EVENT, closeWhenAnotherOpens);
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuId]);

  function toggleMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: menuId }));
    }
  }

  return (
    <div
      ref={menuRef}
      className={`flex min-w-0 shrink-0 items-center gap-2 ${overlayStrip ? "relative" : ""} ${className}`}
      dir="ltr"
    >
      <div
        className={`${overlayStrip ? "absolute left-0 top-0 z-10 flex" : "flex"} min-w-0 overflow-hidden transition-all duration-200 ease-out ${
          open
            ? `${overlayStrip ? "max-w-[calc(100vw-2rem)]" : "max-w-[24rem]"} translate-x-0 gap-2 opacity-100`
            : "pointer-events-none max-w-0 translate-x-2 gap-0 opacity-0"
        } ${stripClassName}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        {children}
      </div>

      <button
        type="button"
        aria-label="إجراءات"
        aria-expanded={open}
        title="إجراءات"
        onClick={toggleMenu}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-700 dark:hover:bg-slate-900 dark:hover:text-sky-300"
      >
        <EllipsisVertical className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
