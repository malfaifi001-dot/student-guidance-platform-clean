import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-[#6C5CE7]",
dotClass: "bg-[#F4B942]",
iconClass: "bg-indigo-50 text-[#25316D]",
badgeClass: "bg-violet-50 text-[#25316D]",
noticeClass: "bg-[#F4F2ED] text-[#25316D]",
cardShellClass: "border-r-4 border-r-[#6C5CE7] border-y border-l border-indigo-100 bg-white p-4",
softShellClass: "border border-indigo-100 bg-[#F4F2ED] p-4",
highlightShellClass: "border-r-4 border-r-[#F4B942] bg-indigo-50/50 p-5",
outlineShellClass: "border border-dashed border-[#6C5CE7]/50 bg-white p-5",
quoteShellClass: "border-r-4 border-[#25316D] bg-[#F4F2ED] p-5",
heroShellClass: "border-r-[6px] border-r-[#25316D] bg-gradient-to-l from-indigo-50 to-white p-5",
} satisfies ReportDesignPalette;
