import { CurriculumDocumentFooter, CurriculumDocumentHeader } from "@/components/curriculum-distribution/curriculum-document-identity";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import type { ActivityPlanPrintEntry, ActivityPlanPrintWeek as ActivityPlanPrintWeekData } from "@/lib/activity-plan/activity-plan-print-data";
import { formatActivityPlanHijriDate } from "@/lib/activity-plan/activity-plan-date-format";
import { ActivityPlanPrintPage, ACTIVITY_PLAN_PRINT_SUBTITLE } from "@/components/activity-plan/activity-plan-print-shell";

const periods = [1, 2, 3, 4, 5, 6, 7];
const programKeys = ["citizenship-life", "science-technology", "culture-arts", "sports-health", "scouting", "events-occasions"];
const weeklyRows = ["البرنامج", "الصف والمادة", "اسم المعلم"] as const;

// These capacities deliberately leave a small safety buffer after the rendered
// header, compact context, table header, and protected footer area.
const INTERMEDIATE_TABLE_CAPACITY_MM = 138;
const FINAL_TABLE_CAPACITY_MM = 114;

// This entry-based document is server-rendered. Keep its legacy deterministic
// pagination local so it never imports the client-only physical paginator.
function paginateMeasuredPrintItems<T>(items: Array<{ item: T; heightMm: number }>, options: { intermediateCapacityMm: number; finalCapacityMm: number; reserveFinalPage?: boolean }) {
  const pages: T[][] = [];
  let page: T[] = [];
  let used = 0;
  for (const entry of items) {
    if (page.length && used + entry.heightMm > options.intermediateCapacityMm) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(entry.item);
    used += entry.heightMm;
  }
  if (page.length || !pages.length) pages.push(page);
  while (options.reserveFinalPage && pages.length) {
    const last = pages[pages.length - 1];
    const height = items.filter((entry) => last.includes(entry.item)).reduce((total, entry) => total + entry.heightMm, 0);
    if (height <= options.finalCapacityMm || last.length <= 1) break;
    const moved = last.pop();
    if (!moved) break;
    pages.push([moved]);
  }
  return pages;
}

type WeeklyRow = (typeof weeklyRows)[number];
type WeeklyBlock = {
  dayOfWeek: number;
  dayLabel: string;
  date: string;
  rows: WeeklyRow[];
  estimatedHeightMm: number;
};

type ActivityPlanPrintWeekProps = {
  week: ActivityPlanPrintWeekData;
  stage: string;
  academicYear?: string | null;
  schoolName: string;
  educationDepartment?: string | null;
  logoUrl?: string | null;
  activityLeaderName?: string | null;
  activityLeaderSignatureUrl?: string | null;
  principalName?: string | null;
  principalSignatureUrl?: string | null;
  includeSignatures?: boolean;
};

function formatDate(value: string) {
  return formatActivityPlanHijriDate(value);
}

function slotEntries(entriesBySlot: Map<string, ActivityPlanPrintEntry[]>, dayOfWeek: number, period: number) {
  return entriesBySlot.get(`${dayOfWeek}-${period}`) || [];
}

function entryValue(entry: ActivityPlanPrintEntry, row: WeeklyRow) {
  if (row === "البرنامج") return entry.displayTitle;
  if (row === "الصف والمادة") {
    return [
      entry.stage,
      entry.gradeLabel && `${entry.gradeLabel}${entry.section ? ` ${entry.section}` : ""}`,
      entry.subject && `${entry.subject} (${entry.materialType || "أساسية"})`,
    ].filter(Boolean).join("\n");
  }
  return entry.teacherName;
}

function estimateTextLines(value: string, charactersPerLine: number) {
  return String(value || "—")
    .split(/\r?\n/)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.trim().length / charactersPerLine)), 0);
}

function estimateCellHeightMm(entries: ActivityPlanPrintEntry[], row: WeeklyRow) {
  if (!entries.length) return 0;
  const charactersPerLine = row === "البرنامج" ? 14 : row === "الصف والمادة" ? 16 : 18;
  const entryHeight = entries.reduce(
    (total, entry) => total + (estimateTextLines(entryValue(entry, row), charactersPerLine) * 2.45) + 0.7,
    0,
  );
  return entryHeight + Math.max(0, entries.length - 1) * 0.35;
}

function estimateRowHeightMm(entriesBySlot: Map<string, ActivityPlanPrintEntry[]>, dayOfWeek: number, row: WeeklyRow) {
  const highestCell = Math.max(
    ...periods.map((period) => estimateCellHeightMm(slotEntries(entriesBySlot, dayOfWeek, period), row)),
    0,
  );
  return Math.max(6.4, highestCell + 1.5);
}

function buildBlocks(week: ActivityPlanPrintWeekData, entriesBySlot: Map<string, ActivityPlanPrintEntry[]>) {
  return week.dates.flatMap((day) => {
    const rowHeights = weeklyRows.map((row) => ({ row, height: estimateRowHeightMm(entriesBySlot, day.dayOfWeek, row) }));
    const wholeDayHeight = rowHeights.reduce((total, item) => total + item.height, 0);
    const base = { dayOfWeek: day.dayOfWeek, dayLabel: day.label, date: day.date };

    // Keep a complete day together whenever it fits. Only a genuinely oversized
    // day is split into its three semantic rows, each with a repeated day label.
    if (wholeDayHeight <= FINAL_TABLE_CAPACITY_MM) {
      return [{ ...base, rows: [...weeklyRows], estimatedHeightMm: wholeDayHeight }];
    }

    return rowHeights.map(({ row, height }) => ({ ...base, rows: [row], estimatedHeightMm: height }));
  });
}

function WeeklyContextRow({ stage, weekNumber }: { stage: string; weekNumber: number }) {
  return <section className="activity-plan-print-context" aria-label="بيانات الخطة الأسبوعية">
    <span className="activity-plan-print-context-item"><strong>المرحلة:</strong> {stage}</span>
    <span className="activity-plan-print-context-item"><strong>الأسبوع:</strong> {new Intl.NumberFormat("ar-SA").format(weekNumber)}</span>
    <span className="activity-plan-print-context-domains"><strong>مجالات النشاط:</strong>{programKeys.map((key) => {
      const program = getActivityPlanProgramByKey(key);
      return program ? <i key={key} style={{ backgroundColor: program.backgroundColor, color: "#ffffff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{program.title}</i> : null;
    })}</span>
  </section>;
}

function WeeklyTable({ blocks, entriesBySlot, weekNumber }: { blocks: WeeklyBlock[]; entriesBySlot: Map<string, ActivityPlanPrintEntry[]>; weekNumber: number }) {
  return <table className="activity-plan-print-table activity-plan-print-table--paginated">
    <caption className="sr-only">خطة النشاط الطلابي للأسبوع {weekNumber}</caption>
    <thead><tr><th className="activity-plan-print-day-head">اليوم والتاريخ</th><th className="activity-plan-print-label-head">البيان</th>{periods.map((period) => <th key={period}>الحصة {new Intl.NumberFormat("ar-SA").format(period)}</th>)}</tr></thead>
    <tbody>{blocks.map((block, blockIndex) => block.rows.map((row, rowIndex) => <tr key={`${block.dayOfWeek}-${row}-${blockIndex}`}>
      {rowIndex === 0 ? <th className="activity-plan-print-day" rowSpan={block.rows.length}><span>{block.dayLabel}</span><small>{formatDate(block.date)}</small></th> : null}
      <th className="activity-plan-print-row-label">{row}</th>
      {periods.map((period) => {
        const entries = slotEntries(entriesBySlot, block.dayOfWeek, period);
        const hasProgram = row === "البرنامج" && entries.some((entry) => Boolean(entry.displayTitle));
        return <td key={`${row}-${period}`} className={hasProgram ? "activity-plan-program-cell" : ""} style={row === "الصف والمادة" ? { whiteSpace: "pre-line" } : undefined}>{entries.length ? <div className="activity-plan-print-entry-stack">{entries.map((entry, entryIndex) => {
          const domainProgram = entry.domainKey ? getActivityPlanProgramByKey(entry.domainKey) : null;
          const isProgram = row === "البرنامج" && Boolean(entry.displayTitle);
          return <div key={`${entry.programKey}-${entryIndex}`} className={isProgram ? "activity-plan-print-entry activity-plan-print-entry--program" : "activity-plan-print-entry"} style={isProgram && domainProgram ? { backgroundColor: domainProgram.backgroundColor, color: "#ffffff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } : undefined}>{entryValue(entry, row)}</div>;
        })}</div> : null}</td>;
      })}
    </tr>))}</tbody>
  </table>;
}

const weeklyPrintPaginationStyles = `
.activity-plan-print-context{display:flex;align-items:center;gap:1.4mm;min-height:8mm;margin:1.4mm 0 1.6mm;padding:1mm 1.3mm;border:.25mm solid #aab9b4;background:#f7faf9;color:#254b43;font-size:7.4pt;font-weight:800;overflow:hidden}.activity-plan-print-context-item{white-space:nowrap}.activity-plan-print-context-item strong,.activity-plan-print-context-domains>strong{color:#0f5f55}.activity-plan-print-context-domains{display:flex;min-width:0;align-items:center;gap:.75mm;white-space:nowrap}.activity-plan-print-context-domains i{display:inline-flex;align-items:center;justify-content:center;min-width:15mm;padding:.55mm .85mm;border-radius:.8mm;font-style:normal;font-size:6.3pt;font-weight:900;line-height:1.05;text-align:center}.activity-plan-print-table--paginated{margin:0}.activity-plan-print-table--paginated tbody{break-inside:avoid-page;page-break-inside:avoid}@media print{.activity-plan-print-context{margin-top:1.4mm}.activity-plan-print-context-domains i{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

export function ActivityPlanPrintWeek({ week, stage, academicYear, schoolName, educationDepartment, logoUrl, activityLeaderName, activityLeaderSignatureUrl, principalName, principalSignatureUrl, includeSignatures = true }: ActivityPlanPrintWeekProps) {
  const entriesBySlot = new Map<string, ActivityPlanPrintEntry[]>();
  for (const entry of week.entries) {
    const key = `${entry.dayOfWeek}-${entry.periodNumber}`;
    entriesBySlot.set(key, [...(entriesBySlot.get(key) || []), entry]);
  }

  const pages = paginateMeasuredPrintItems(
    buildBlocks(week, entriesBySlot).map((block) => ({ item: block, heightMm: block.estimatedHeightMm })),
    { intermediateCapacityMm: INTERMEDIATE_TABLE_CAPACITY_MM, finalCapacityMm: FINAL_TABLE_CAPACITY_MM, reserveFinalPage: includeSignatures },
  );

  return <><style>{weeklyPrintPaginationStyles}</style>{pages.map((blocks, pageIndex) => {
    const isSignaturePage = includeSignatures && pageIndex === pages.length - 1;
    return <ActivityPlanPrintPage key={`${week.weekNumber}-${pageIndex}`} className={`activity-plan-print-page--physical${isSignaturePage ? "" : " activity-plan-print-page--compact-footer"}`} footer={<CurriculumDocumentFooter primaryRoleLabel="رائد النشاط" primaryName={activityLeaderName} primarySignatureUrl={activityLeaderSignatureUrl} primarySignatureAlt="توقيع رائد النشاط" principalName={principalName} principalSignatureUrl={principalSignatureUrl} includeSignatures={isSignaturePage} signatureOrder="image-first" />}>
      <CurriculumDocumentHeader title="خطة النشاط الطلابي" subtitle={ACTIVITY_PLAN_PRINT_SUBTITLE} schoolName={schoolName} educationDepartment={educationDepartment} logoUrl={logoUrl} academicYear={academicYear} />
      <WeeklyContextRow stage={stage} weekNumber={week.weekNumber} />
      <WeeklyTable blocks={blocks} entriesBySlot={entriesBySlot} weekNumber={week.weekNumber} />
    </ActivityPlanPrintPage>;
  })}</>;
}
