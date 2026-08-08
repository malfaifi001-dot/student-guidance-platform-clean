import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-amber-700",
dotClass: "bg-amber-700",
iconClass: "bg-amber-50 text-amber-700",
badgeClass: "bg-amber-50 text-amber-700",
noticeClass: "bg-amber-50 text-amber-700",
cardShellClass: "rounded-3xl border border-amber-100 bg-white p-5 shadow-sm",
softShellClass: "rounded-3xl border border-amber-100 bg-amber-50 p-5",
highlightShellClass: "rounded-3xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white p-5 shadow-sm",
outlineShellClass: "rounded-3xl border border-dashed border-amber-300 bg-white p-5",
quoteShellClass: "rounded-3xl border border-amber-100 bg-orange-50 p-5",
heroShellClass: "rounded-3xl border border-amber-100 bg-gradient-to-l from-amber-50 to-white p-5",
} satisfies ReportDesignPalette;
