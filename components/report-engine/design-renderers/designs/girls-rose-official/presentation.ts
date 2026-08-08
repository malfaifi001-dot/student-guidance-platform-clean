import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-rose-700",
dotClass: "bg-rose-600",
iconClass: "bg-rose-50 text-rose-600",
badgeClass: "bg-rose-50 text-rose-700",
noticeClass: "bg-rose-50 text-rose-700",
cardShellClass: "rounded-[28px] border border-rose-100 bg-white p-5 shadow-sm",
softShellClass: "rounded-[28px] border border-rose-100 bg-rose-50 p-5",
highlightShellClass: "rounded-[28px] border border-rose-200 bg-gradient-to-l from-rose-50 to-white p-5 shadow-sm",
outlineShellClass: "rounded-[28px] border border-dashed border-rose-300 bg-white p-5",
quoteShellClass: "rounded-[28px] border border-rose-100 bg-pink-50 p-5",
heroShellClass: "rounded-[28px] border border-rose-100 bg-gradient-to-l from-rose-50 to-white p-5",
} satisfies ReportDesignPalette;
