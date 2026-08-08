import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-teal-700",
dotClass: "bg-emerald-500",
iconClass: "bg-teal-50 text-teal-800",
badgeClass: "bg-emerald-50 text-teal-800",
noticeClass: "bg-teal-50 text-teal-800",
cardShellClass: "rounded-xl border border-teal-100 bg-white p-4",
softShellClass: "rounded-xl border border-teal-100 bg-[#eef7f6] p-4",
highlightShellClass: "rounded-xl border-r-4 border-r-emerald-500 border-y border-l border-teal-100 bg-white p-4",
outlineShellClass: "rounded-xl border border-dashed border-teal-300 bg-white p-4",
quoteShellClass: "border-r-4 border-teal-700 bg-[#eef7f6] p-4",
heroShellClass: "rounded-xl border border-teal-100 bg-gradient-to-l from-[#eef7f6] to-white p-5",
} satisfies ReportDesignPalette;
