import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-fuchsia-700",
dotClass: "bg-fuchsia-700",
iconClass: "bg-fuchsia-50 text-fuchsia-700",
badgeClass: "bg-fuchsia-50 text-fuchsia-700",
noticeClass: "bg-fuchsia-50 text-fuchsia-700",
cardShellClass: "rounded-[28px] border border-fuchsia-100 bg-white p-5 shadow-sm",
softShellClass: "rounded-[28px] border border-fuchsia-100 bg-fuchsia-50 p-5",
highlightShellClass: "rounded-[28px] border border-fuchsia-200 bg-gradient-to-l from-fuchsia-50 to-white p-5 shadow-sm",
outlineShellClass: "rounded-[28px] border border-dashed border-fuchsia-300 bg-white p-5",
quoteShellClass: "rounded-[28px] border border-fuchsia-100 bg-rose-50 p-5",
heroShellClass: "rounded-[28px] border border-fuchsia-100 bg-gradient-to-l from-fuchsia-50 to-white p-5",
} satisfies ReportDesignPalette;
