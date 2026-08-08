import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-sky-700",
dotClass: "bg-sky-700",
iconClass: "bg-sky-50 text-sky-700",
badgeClass: "bg-sky-50 text-sky-700",
noticeClass: "bg-sky-50 text-sky-700",
cardShellClass: "rounded-3xl border border-sky-100 bg-white p-5 shadow-sm",
softShellClass: "rounded-3xl border border-sky-100 bg-sky-50 p-5",
highlightShellClass: "rounded-3xl border border-sky-200 bg-gradient-to-l from-sky-50 to-white p-5 shadow-sm",
outlineShellClass: "rounded-3xl border border-dashed border-sky-300 bg-white p-5",
quoteShellClass: "rounded-3xl border border-sky-100 bg-slate-50 p-5",
heroShellClass: "rounded-3xl border border-sky-100 bg-gradient-to-l from-sky-50 to-white p-5",
detailsGridClassName: "grid grid-cols-3 gap-2 print:grid-cols-3",
} satisfies ReportDesignPalette;
