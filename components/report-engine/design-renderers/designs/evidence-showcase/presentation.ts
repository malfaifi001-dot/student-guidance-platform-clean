import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-emerald-700",
dotClass: "bg-emerald-700",
iconClass: "bg-emerald-50 text-emerald-700",
badgeClass: "bg-emerald-50 text-emerald-700",
noticeClass: "bg-emerald-50 text-emerald-700",
cardShellClass: "rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm",
softShellClass: "rounded-[28px] border border-emerald-100 bg-emerald-50 p-5",
highlightShellClass: "rounded-[28px] border border-emerald-200 bg-gradient-to-l from-emerald-50 to-white p-5 shadow-sm",
outlineShellClass: "rounded-[28px] border border-dashed border-emerald-300 bg-white p-5",
quoteShellClass: "rounded-[28px] border border-emerald-100 bg-teal-50 p-5",
heroShellClass: "rounded-[28px] border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-5",
} satisfies ReportDesignPalette;
