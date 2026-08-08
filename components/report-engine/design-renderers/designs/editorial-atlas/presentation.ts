import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-[#0F9D94]",
dotClass: "bg-[#E07A5F]",
iconClass: "bg-[#EEF5F8] text-[#10243A]",
badgeClass: "bg-[#EEF5F8] text-[#10243A]",
noticeClass: "bg-[#EEF5F8] text-[#10243A]",
cardShellClass: "border-b border-slate-200 bg-white px-1 py-4",
softShellClass: "border-r-2 border-r-[#0F9D94] bg-[#EEF5F8] p-4",
highlightShellClass: "border-r-4 border-r-[#E07A5F] bg-[#EEF5F8]/60 p-5",
outlineShellClass: "border border-dashed border-[#10243A]/40 bg-white p-5",
quoteShellClass: "border-r-4 border-[#10243A] bg-[#EEF5F8] p-5",
heroShellClass: "border-b-2 border-[#E07A5F] bg-white px-1 py-5",
} satisfies ReportDesignPalette;
