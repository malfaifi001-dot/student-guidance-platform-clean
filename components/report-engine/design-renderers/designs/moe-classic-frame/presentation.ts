import type { ReportDesignPalette } from "../report-design-component-types";

export const palette = {
  subtleTextClass: "text-[#1687b8]",
  dotClass: "bg-[#1687b8]",
  iconClass: "bg-[#eaf5f8] text-[#0b718f]",
  badgeClass: "bg-[#eaf5f8] text-[#0b718f]",
  noticeClass: "border border-[#b7dce5] bg-[#f7fbfc] text-[#174b5a]",

  cardShellClass:
    "border-0 bg-transparent px-0 py-3 shadow-none",
  softShellClass:
    "border-0 bg-transparent px-0 py-3 shadow-none",
  highlightShellClass:
    "border-0 border-r-[3px] border-r-[#1687b8] bg-transparent px-4 py-3 shadow-none",
  outlineShellClass:
    "border border-[#7d979f] bg-white px-4 py-3 shadow-none",
  quoteShellClass:
    "border-0 border-r-[3px] border-r-[#27ae73] bg-transparent px-4 py-3 shadow-none",
  heroShellClass:
    "border-0 bg-transparent px-0 py-3 text-center shadow-none",

  detailsGridClassName: "grid grid-cols-1 gap-3",
} satisfies ReportDesignPalette;