"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/components/theme/theme-provider";

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useThemeMode();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      <span className="grid h-7 w-7 place-items-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-sky-50 group-hover:text-sky-600 dark:bg-slate-800 dark:text-slate-200">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>

      <span className="hidden sm:inline">
        {isDark ? "فاتح" : "داكن"}
      </span>
    </button>
  );
}
