import Image from "next/image";
import type { CSSProperties } from "react";

import { TEACHIX_TAGLINE } from "@/lib/constants/brand";

import styles from "./brand-loader.module.css";

export type BrandLoaderVariant = "fullscreen" | "page" | "section" | "inline" | "button";

type BrandLoaderProps = {
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
  label?: string | null;
  variant?: BrandLoaderVariant;
  className?: string;
};

const sizeMap = { xs: 18, sm: 24, md: 48, lg: 72, xl: 96 } as const;
const variantClasses: Record<BrandLoaderVariant, string> = {
  fullscreen: "fixed inset-0 z-[120] min-h-screen bg-white/95 backdrop-blur-sm",
  page: "min-h-[65vh] w-full bg-slate-50/70",
  section: "min-h-48 w-full rounded-3xl border border-slate-200 bg-white",
  inline: "inline-flex min-h-8",
  button: "inline-flex",
};

export function BrandLoader({ size = "md", label = TEACHIX_TAGLINE, variant = "section", className = "" }: BrandLoaderProps) {
  const pixels = typeof size === "number" ? Math.max(16, Math.min(size, 160)) : sizeMap[size];
  const compact = variant === "inline" || variant === "button";
  const style = { "--teachix-loader-size": `${pixels}px` } as CSSProperties;

  return (
    <div className={[styles.loader, variantClasses[variant], "items-center justify-center text-center", compact ? "gap-2" : "flex flex-col gap-4", className].join(" ")} style={style} dir="rtl" role="status" aria-live="polite" aria-label={label ?? "جاري التحميل"}>
      <span className={styles.visual} aria-hidden="true">
        <span className={styles.glow} />
        <span className={styles.ring} />
        <Image src="/brand/teachix-loader.svg" alt="" width={pixels} height={pixels} loading="eager" className={styles.mark} />
      </span>
      {label ? <span className={compact ? "text-xs font-black text-current" : "text-sm font-black text-slate-600"}>{label}</span> : null}
    </div>
  );
}
