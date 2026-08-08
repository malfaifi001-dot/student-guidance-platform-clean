import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-stone-600",
dotClass: "bg-stone-500",
iconClass: "bg-stone-100 text-stone-700",
badgeClass: "bg-stone-100 text-stone-700",
noticeClass: "bg-stone-100 text-stone-700",
cardShellClass: "rounded-2xl border border-stone-200 bg-white p-5",
softShellClass: "rounded-2xl border border-stone-200 bg-stone-50 p-5",
highlightShellClass: "rounded-2xl border border-stone-200 bg-gradient-to-l from-stone-50 to-white p-5",
outlineShellClass: "rounded-2xl border border-dashed border-stone-300 bg-white p-5",
quoteShellClass: "rounded-2xl border border-stone-200 bg-stone-50 p-5",
heroShellClass: "rounded-2xl border border-stone-200 bg-white p-5",
} satisfies ReportDesignPalette;
