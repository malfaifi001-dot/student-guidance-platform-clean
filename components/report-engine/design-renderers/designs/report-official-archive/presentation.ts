import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-slate-900",
dotClass: "bg-slate-900",
iconClass: "bg-slate-100 text-slate-900",
badgeClass: "bg-slate-100 text-slate-800",
noticeClass: "bg-slate-100 text-slate-800",
cardShellClass: "border-b border-slate-300 bg-white px-1 py-4",
softShellClass: "border border-slate-300 bg-slate-50 p-4",
highlightShellClass: "border-2 border-slate-900 bg-slate-50 p-5",
outlineShellClass: "border border-dashed border-slate-500 bg-white p-5",
quoteShellClass: "border-r-4 border-slate-900 bg-slate-50 p-5",
heroShellClass: "border-b-2 border-slate-900 bg-white px-1 py-5",
detailsGridClassName: "grid grid-cols-3 gap-2 print:grid-cols-3",
} satisfies ReportDesignPalette;
