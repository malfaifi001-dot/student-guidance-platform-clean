import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-teal-700",
dotClass: "bg-teal-700",
iconClass: "bg-teal-50 text-teal-700",
badgeClass: "bg-teal-50 text-teal-700",
noticeClass: "bg-teal-50 text-teal-700",
cardShellClass: "rounded-3xl border border-teal-100 bg-white p-5 shadow-sm",
softShellClass: "rounded-3xl border border-teal-100 bg-teal-50 p-5",
highlightShellClass: "rounded-3xl border border-teal-200 bg-gradient-to-l from-teal-50 to-white p-5 shadow-sm",
outlineShellClass: "rounded-3xl border border-dashed border-teal-300 bg-white p-5",
quoteShellClass: "rounded-3xl border border-teal-100 bg-slate-50 p-5",
heroShellClass: "rounded-3xl border border-teal-100 bg-gradient-to-l from-teal-50 to-white p-5",
} satisfies ReportDesignPalette;
