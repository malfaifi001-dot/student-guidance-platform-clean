import type { OcrBlock } from "./timetable-import-types";

export type GeometryBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

export type DetectedDay = {
  label: string;
  centerX: number;
  confidence: number;
};

export type DetectedPeriodColumn = {
  day: string;
  period: number;
  centerX: number;
  confidence: number;
};

export type DetectedTeacherRow = {
  teacherName: string;
  centerY: number;
  confidence: number;
};

export type TimetableGridDetection = {
  days: DetectedDay[];
  periods: DetectedPeriodColumn[];
  teacherRows: DetectedTeacherRow[];
  warnings: string[];
};

const DAY_LABELS = [
  { label: "الأحد", keys: ["الاحد", "الأحد", "احد"] },
  { label: "الاثنين", keys: ["الاثنين", "الإثنين", "اثنين"] },
  { label: "الثلاثاء", keys: ["الثلاثاء", "ثلاثاء"] },
  { label: "الأربعاء", keys: ["الاربعاء", "الأربعاء", "اربعاء"] },
  { label: "الخميس", keys: ["الخميس", "خميس"] },
];

function textOf(block: OcrBlock) {
  return String(block.text || "").replace(/\s+/g, " ").trim();
}

export function blockBounds(block: OcrBlock): GeometryBounds | null {
  if (!Array.isArray(block.box) || block.box.length === 0) return null;
  const points = block.box
    .filter((point): point is number[] =>
      Array.isArray(point) && point.length >= 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])),
    )
    .map((point) => [Number(point[0]), Number(point[1])] as const);
  if (!points.length) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return { left, top, right, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
}

function normalizedArabic(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\u0600-\u06ff\d\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeDayLabel(value: string) {
  const normalized = normalizedArabic(value);
  return DAY_LABELS.find((day) => day.keys.some((key) => normalized.includes(normalizedArabic(key))))?.label || null;
}

function arabicDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function periodFromText(value: string) {
  const normalized = arabicDigits(normalizedArabic(value));
  const match = normalized.match(/(^|\s)([1-7])($|\s)/) || normalized.match(/[1-7]/);
  return match ? Number(match[2] || match[0]) : null;
}

function confidenceOf(block: OcrBlock) {
  return typeof block.confidence === "number" && Number.isFinite(block.confidence)
    ? Math.max(0, Math.min(1, block.confidence))
    : 0.5;
}

function isLikelyTeacherName(text: string) {
  const normalized = normalizedArabic(text);
  return normalized.length >= 3 && /[\u0600-\u06ff]/.test(normalized) && !normalizeDayLabel(text) && periodFromText(text) === null;
}

export function detectTimetableGrid(blocks: OcrBlock[]): TimetableGridDetection {
  const measured = blocks
    .map((block) => ({ block, bounds: blockBounds(block), text: textOf(block) }))
    .filter((item): item is typeof item & { bounds: GeometryBounds } => Boolean(item.bounds && item.text));
  const warnings: string[] = [];

  const dayBlocks = measured.filter((item) => normalizeDayLabel(item.text));
  const dayMap = new Map<string, DetectedDay>();
  dayBlocks.forEach((item) => {
    const label = normalizeDayLabel(item.text)!;
    const current = dayMap.get(label);
    const candidate = { label, centerX: item.bounds.centerX, confidence: confidenceOf(item.block) };
    if (!current || candidate.confidence > current.confidence) dayMap.set(label, candidate);
  });
  const days = [...dayMap.values()].sort((a, b) => a.centerX - b.centerX);

  if (!days.length) warnings.push("لم يتم اكتشاف عناوين أيام الأسبوع من هندسة OCR.");

  const dayBoundaries = days.map((day, index) => ({
    day,
    left: index === 0 ? -Infinity : (days[index - 1].centerX + day.centerX) / 2,
    right: index === days.length - 1 ? Infinity : (day.centerX + days[index + 1].centerX) / 2,
  }));
  const periodBlocks = measured.filter((item) => periodFromText(item.text) !== null);
  const periods: DetectedPeriodColumn[] = [];
  dayBoundaries.forEach(({ day, left, right }) => {
    const candidates = periodBlocks
      .filter((item) => item.bounds.centerX >= left && item.bounds.centerX <= right)
      .map((item) => ({
        period: periodFromText(item.text)!,
        centerX: item.bounds.centerX,
        confidence: confidenceOf(item.block),
      }));
    const byPeriod = new Map<number, DetectedPeriodColumn>();
    candidates.forEach((candidate) => {
      const current = byPeriod.get(candidate.period);
      const next = { ...candidate, day: day.label };
      if (!current || candidate.confidence > current.confidence) byPeriod.set(candidate.period, next);
    });
    periods.push(...[...byPeriod.values()].sort((a, b) => a.period - b.period));
  });
  if (!periods.length) warnings.push("لم يتم اكتشاف أعمدة الحصص من هندسة OCR.");

  const minDayX = days.length ? Math.min(...days.map((day) => day.centerX)) : 0;
  const maxDayX = days.length ? Math.max(...days.map((day) => day.centerX)) : 0;
  const outsideGrid = measured.filter((item) => item.bounds.centerX < minDayX || item.bounds.centerX > maxDayX);
  const nameHeader = outsideGrid.find((item) => normalizedArabic(item.text).includes("الاسم") || normalizedArabic(item.text).includes("المعلم"));
  const teacherCandidates = outsideGrid
    .filter((item) => isLikelyTeacherName(item.text) && (!nameHeader || Math.abs(item.bounds.centerX - nameHeader.bounds.centerX) < 300))
    .sort((a, b) => a.bounds.centerY - b.bounds.centerY);
  const teacherRows: DetectedTeacherRow[] = [];
  teacherCandidates.forEach((item) => {
    const current = teacherRows.find((row) => Math.abs(row.centerY - item.bounds.centerY) < Math.max(12, (item.bounds.bottom - item.bounds.top) * 1.5));
    if (current) {
      if (confidenceOf(item.block) > current.confidence) {
        current.teacherName = item.text;
        current.confidence = confidenceOf(item.block);
      }
    } else {
      teacherRows.push({ teacherName: item.text, centerY: item.bounds.centerY, confidence: confidenceOf(item.block) });
    }
  });
  if (!teacherRows.length) warnings.push("لم يتم اكتشاف صفوف المعلمين من العمود الجانبي.");

  return { days, periods, teacherRows, warnings };
}
