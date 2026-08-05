"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { PortfolioThemeDefinition } from "@/lib/portfolio/portfolio-theme-registry";
import styles from "./portfolio-theme-preview-card.module.css";

export function PortfolioThemePreviewCard({ theme }: {
  theme: PortfolioThemeDefinition;
}) {
  return <div className="rounded-[1.5rem] border border-teal-600 bg-teal-50/60 p-3 text-right ring-2 ring-teal-100">
    <ThemeMiniature theme={theme} />
    <span className="mt-3 flex items-start justify-between gap-3">
      <span><strong className="block text-sm font-black text-slate-950">{theme.name}</strong><span className="mt-1 block text-xs font-bold leading-5 text-slate-500">{theme.shortDescription}</span></span>
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-teal-600 bg-teal-600 text-white" title="التصميم الحالي"><Check className="h-3.5 w-3.5" /></span>
    </span>
  </div>;
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
