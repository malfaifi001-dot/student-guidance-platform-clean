import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-orange-700",
dotClass: "bg-orange-500",
iconClass: "bg-orange-50 text-orange-700",
badgeClass: "bg-orange-50 text-orange-700",
noticeClass: "bg-orange-50 text-orange-700",
cardShellClass: "rounded-[30px] border border-orange-100 bg-white p-5 shadow-sm",
softShellClass: "rounded-[30px] border border-orange-100 bg-orange-50 p-5",
highlightShellClass: "rounded-[30px] border border-orange-200 bg-gradient-to-l from-orange-50 to-cyan-50 p-5 shadow-sm",
outlineShellClass: "rounded-[30px] border border-dashed border-orange-300 bg-white p-5",
quoteShellClass: "rounded-[30px] border border-orange-100 bg-amber-50 p-5",
heroShellClass: "rounded-[30px] border border-orange-100 bg-gradient-to-l from-orange-50 to-white p-5",
} satisfies ReportDesignPalette;
