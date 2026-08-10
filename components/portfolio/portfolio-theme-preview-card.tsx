"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { PortfolioThemeDefinition } from "@/lib/portfolio/portfolio-theme-registry";
import styles from "./portfolio-theme-preview-card.module.css";

export function PortfolioThemePreviewCard({ theme, selected, disabled, onSelect }: {
  theme: PortfolioThemeDefinition;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return <button
    type="button"
    aria-pressed={selected}
    disabled={disabled}
    onClick={onSelect}
    className={`w-full rounded-[1.5rem] border p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-100" : "border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50"}`}
  >
    <ThemeMiniature theme={theme} />
    <span className="mt-3 flex items-start justify-between gap-3">
      <strong className="block text-sm font-black text-slate-950">{theme.name}</strong>
      {selected ? <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-teal-600 bg-teal-600 text-white" title="التصميم الحالي"><Check className="h-3.5 w-3.5" /></span> : <span className="mt-0.5 shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-500">اختيار</span>}
    </span>
  </button>;
}

function ThemeMiniature({ theme }: { theme: PortfolioThemeDefinition }) {
  return <span
    aria-hidden="true"
    className={`${styles.miniature} ${styles[theme.previewClass]}`}
    style={{ "--mini-primary": theme.palette.primary, "--mini-secondary": theme.palette.secondary, "--mini-accent": theme.palette.accent, "--mini-muted": theme.palette.muted } as CSSProperties}
  >
    <i className={styles.ornament} /><i className={styles.title} /><i className={styles.subtitle} />
    <i className={`${styles.panel} ${styles.panelA}`} /><i className={`${styles.panel} ${styles.panelB}`} /><i className={`${styles.panel} ${styles.panelC}`} />
    <i className={styles.line} /><i className={styles.page} />
  </span>;
}
