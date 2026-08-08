import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-violet-700",
dotClass: "bg-violet-700",
iconClass: "bg-violet-50 text-violet-700",
badgeClass: "bg-violet-50 text-violet-700",
noticeClass: "bg-violet-50 text-violet-700",
cardShellClass: "rounded-[28px] border border-violet-100 bg-white p-5 shadow-sm",
softShellClass: "rounded-[28px] border border-violet-100 bg-violet-50 p-5",
highlightShellClass: "rounded-[28px] border border-violet-200 bg-gradient-to-l from-violet-50 to-white p-5 shadow-sm",
outlineShellClass: "rounded-[28px] border border-dashed border-violet-300 bg-white p-5",
quoteShellClass: "rounded-[28px] border border-violet-100 bg-fuchsia-50 p-5",
heroShellClass: "rounded-[28px] border border-violet-100 bg-gradient-to-l from-violet-50 to-white p-5",
} satisfies ReportDesignPalette;
