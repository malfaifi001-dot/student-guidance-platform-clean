import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-cyan-700",
dotClass: "bg-cyan-700",
iconClass: "bg-cyan-50 text-cyan-700",
badgeClass: "bg-cyan-50 text-cyan-700",
noticeClass: "bg-cyan-50 text-cyan-700",
cardShellClass: "rounded-[28px] border border-cyan-100 bg-white p-5 shadow-sm",
softShellClass: "rounded-[28px] border border-cyan-100 bg-cyan-50 p-5",
highlightShellClass: "rounded-[28px] border border-cyan-200 bg-gradient-to-l from-cyan-50 to-white p-5 shadow-sm",
outlineShellClass: "rounded-[28px] border border-dashed border-cyan-300 bg-white p-5",
quoteShellClass: "rounded-[28px] border border-cyan-100 bg-blue-50 p-5",
heroShellClass: "rounded-[28px] border border-cyan-100 bg-gradient-to-l from-cyan-50 to-white p-5",
} satisfies ReportDesignPalette;
