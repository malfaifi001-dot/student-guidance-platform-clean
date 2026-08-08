import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
subtleTextClass: "text-zinc-800",
dotClass: "bg-zinc-800",
iconClass: "bg-zinc-100 text-zinc-800",
badgeClass: "bg-zinc-100 text-zinc-700",
noticeClass: "bg-zinc-100 text-zinc-800",
cardShellClass: "border-b border-zinc-300 bg-white px-1 py-4",
softShellClass: "border-b border-zinc-300 bg-zinc-50 px-4 py-4",
highlightShellClass: "border border-zinc-800 bg-zinc-50 p-5",
outlineShellClass: "border border-dashed border-zinc-500 bg-white p-5",
quoteShellClass: "border-r-4 border-zinc-800 bg-zinc-50 p-5",
heroShellClass: "border-b-2 border-zinc-800 bg-white px-1 py-5",
} satisfies ReportDesignPalette;
