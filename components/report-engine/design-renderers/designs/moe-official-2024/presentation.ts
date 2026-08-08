import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-[#15445A]",
dotClass: "bg-[#07A869]",
iconClass: "bg-[#F5F7F6] text-[#15445A]",
badgeClass: "bg-emerald-50 text-[#15445A]",
noticeClass: "bg-[#F5F7F6] text-[#15445A]",
cardShellClass: "border-y border-slate-100 bg-white px-1 py-4",
softShellClass: "border border-slate-100 bg-[#F5F7F6] p-4",
highlightShellClass: "border-r-4 border-r-[#07A869] border-y border-l border-slate-100 bg-white p-4",
outlineShellClass: "border border-dashed border-[#0DA9A6] bg-white p-4",
quoteShellClass: "border-r-4 border-[#15445A] bg-[#F5F7F6] p-4",
heroShellClass: "border-b-2 border-[#15445A] bg-white px-1 py-5",
} satisfies ReportDesignPalette;
