import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-slate-800",
dotClass: "bg-slate-800",
iconClass: "bg-slate-100 text-slate-800",
badgeClass: "bg-slate-100 text-slate-700",
noticeClass: "bg-slate-100 text-slate-800",
cardShellClass: "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
softShellClass: "rounded-3xl border border-slate-200 bg-slate-50 p-5",
highlightShellClass: "rounded-3xl border border-slate-300 bg-gradient-to-l from-slate-100 to-white p-5 shadow-sm",
outlineShellClass: "rounded-3xl border border-dashed border-slate-400 bg-white p-5",
quoteShellClass: "rounded-3xl border border-slate-200 bg-slate-50 p-5",
heroShellClass: "rounded-3xl border border-slate-200 bg-gradient-to-l from-slate-50 to-white p-5",
detailsGridClassName: "grid grid-cols-3 gap-2 print:grid-cols-3",
} satisfies ReportDesignPalette;
