"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical } from "lucide-react";

const MENU_EVENT = "teachix:expandable-action-menu-open";

type ExpandableActionMenuProps = {
  menuId: string;
  children: ReactNode;
  className?: string;
  stripClassName?: string;
  overlayStrip?: boolean;
  presentation?: "strip" | "popover";
  popoverAlign?: "start" | "end";
  popoverSide?: "left" | "right";
};

export function ExpandableActionMenu({
  menuId,
  children,
  className = "",
  stripClassName = "",
  overlayStrip = false,
  presentation = "strip",
  popoverAlign = "start",
  popoverSide,
}: ExpandableActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function updatePopoverPosition() {
    if (presentation !== "popover" || !triggerRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const padding = 12;
    const gap = 8;
    const width = Math.min(224, window.innerWidth - padding * 2);
    const estimatedHeight = 260;
    const prefersRight = popoverSide === "right" || (!popoverSide && popoverAlign === "end");
    const preferredLeft = prefersRight ? trigger.right + gap : trigger.left - width - gap;
    const fallbackLeft = prefersRight ? trigger.left - width - gap : trigger.right + gap;
    const left = preferredLeft >= padding && preferredLeft + width <= window.innerWidth - padding
      ? preferredLeft
      : fallbackLeft >= padding && fallbackLeft + width <= window.innerWidth - padding
        ? fallbackLeft
        : Math.min(Math.max(padding, preferredLeft), window.innerWidth - width - padding);
    const preferredTop = trigger.bottom + gap;
    const top = preferredTop + estimatedHeight <= window.innerHeight - padding
      ? preferredTop
      : Math.max(padding, trigger.top - estimatedHeight - gap);

    setPopoverPosition({ left, top });
  }

  useEffect(() => {
    function closeWhenAnotherOpens(event: Event) {
      if ((event as CustomEvent<string>).detail !== menuId) {
        setOpen(false);
      }
    }

    function closeWhenOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
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

  useEffect(() => {
    if (!open || presentation !== "popover") return;

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open, presentation, popoverAlign, popoverSide]);

  function toggleMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      updatePopoverPosition();
      window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: menuId }));
    }
  }

  return (
    <div
      ref={menuRef}
      className={`flex min-w-0 shrink-0 items-center gap-2 ${overlayStrip || presentation === "popover" ? "relative" : ""} ${className}`}
      dir="ltr"
    >
      {presentation === "popover" && open && popoverPosition && typeof document !== "undefined"
        ? createPortal(
          <div ref={popoverRef} className={`fixed z-[100] flex w-56 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 ${stripClassName}`} style={popoverPosition} dir="rtl">
            {children}
          </div>,
          document.body,
        )
        : null}
      {presentation !== "popover" ? <div className={`${overlayStrip ? "absolute left-0 top-0 z-10 flex" : "flex"} min-w-0 overflow-hidden transition-all duration-200 ease-out ${open ? `${overlayStrip ? "max-w-[calc(100vw-2rem)]" : "max-w-[24rem]"} translate-x-0 gap-2 opacity-100` : "pointer-events-none max-w-0 translate-x-2 gap-0 opacity-0"} ${stripClassName}`} aria-hidden={!open}>{children}</div> : null}

      <button
        ref={triggerRef}
        type="button"
        aria-label="إجراءات"
        aria-expanded={open}
        title="إجراءات"
        onClick={toggleMenu}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 shadow-none transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:h-9 sm:w-9 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-700 dark:hover:bg-slate-800 dark:hover:text-sky-300"
      >
        <EllipsisVertical className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
