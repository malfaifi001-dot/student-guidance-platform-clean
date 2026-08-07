export type DayTimePeriod = {
  id: string;
  label: string;
  order: number;
  isBreak: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export type DayTimeTeachingSpec = {
  id: string;
  label: string;
};

export type DayTimeBreakSpec = {
  id: string;
  label: string;
  afterTeachingIndex: number;
  durationMinutes: number;
};

export type PeriodReferenceSource = {
  periods: Array<{ periodId: string }>;
  slots: Array<{ dayId: string; periodId: string }>;
};

export type PeriodReferenceInfo = {
  periodId: string;
  count: number;
};

export function parseClockTime(
  value: string | null | undefined,
): number {
  if (!value) {
    return -1;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return -1;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return -1;
  }

  return hours * 60 + minutes;
}

export function formatClockTime(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));

  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function durationBetweenTimes(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): number {
  const start = parseClockTime(startTime);
  const end = parseClockTime(endTime);

  if (start < 0 || end < 0 || end <= start) {
    return -1;
  }

  return end - start;
}

export function clampInt(
  value: number | string | null | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value ?? NaN);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function extractTeachingSpecs(
  periods: DayTimePeriod[],
): DayTimeTeachingSpec[] {
  return periods
    .filter((period) => !period.isBreak)
    .sort((a, b) => a.order - b.order)
    .map((period) => ({
      id: period.id,
      label: period.label,
    }));
}

export function extractBreakSpecs(
  periods: DayTimePeriod[],
  fallbackMinutes = 20,
): DayTimeBreakSpec[] {
  const sorted = [...periods].sort((a, b) => a.order - b.order);

  const result: DayTimeBreakSpec[] = [];

  let teachingIndex = -1;

  for (const period of sorted) {
    if (!period.isBreak) {
      teachingIndex += 1;
      continue;
    }

    const duration = durationBetweenTimes(period.startTime, period.endTime);

    result.push({
      id: period.id,
      label: period.label || "فسحة",
      afterTeachingIndex: teachingIndex < 0 ? 0 : teachingIndex,
      durationMinutes: duration > 0 ? duration : fallbackMinutes,
    });
  }

  return result;
}

export function generateTeachingSpecs(
  count: number,
  existing: DayTimeTeachingSpec[],
): DayTimeTeachingSpec[] {
  const used = new Set(existing.map((spec) => spec.id));

  return Array.from({ length: count }, (_, index) => {
    const base = existing[index];

    if (base) {
      return base;
    }

    let id = `PERIOD_${index + 1}`;

    if (used.has(id)) {
      id = `PERIOD_${Date.now()}_${index + 1}`;
    }

    used.add(id);

    return {
      id,
      label: `الحصة ${index + 1}`,
    };
  });
}

export function buildDayTimelineUniform({
  teaching,
  breaks,
  firstStartMinutes,
  lessonDurationMinutes,
  transitionMinutes,
}: {
  teaching: DayTimeTeachingSpec[];
  breaks: DayTimeBreakSpec[];
  firstStartMinutes: number;
  lessonDurationMinutes: number;
  transitionMinutes: number;
}): DayTimePeriod[] {
  const breakByAfter = new Map<number, DayTimeBreakSpec[]>();

  for (const breakSpec of breaks) {
    const list = breakByAfter.get(breakSpec.afterTeachingIndex) ?? [];

    list.push(breakSpec);

    breakByAfter.set(breakSpec.afterTeachingIndex, list);
  }

  const items: DayTimePeriod[] = [];

  let cursor = firstStartMinutes;

  teaching.forEach((spec, index) => {
    const start = cursor;
    const end = start + lessonDurationMinutes;

    items.push({
      id: spec.id,
      label: spec.label,
      order: items.length + 1,
      isBreak: false,
      startTime: formatClockTime(start),
      endTime: formatClockTime(end),
    });

    cursor = end + transitionMinutes;

    const after = breakByAfter.get(index) ?? [];

    for (const breakSpec of after) {
      const breakStart = end;
      const breakEnd = breakStart + breakSpec.durationMinutes;

      items.push({
        id: breakSpec.id,
        label: breakSpec.label,
        order: items.length + 1,
        isBreak: true,
        startTime: formatClockTime(breakStart),
        endTime: formatClockTime(breakEnd),
      });

      cursor = breakEnd + transitionMinutes;
    }
  });

  return items;
}

function normalizeOrders(
  items: DayTimePeriod[],
): DayTimePeriod[] {
  return items.map((item, index) => ({
    ...item,
    order: index + 1,
  }));
}

function shiftMinutes(
  value: string | null | undefined,
  delta: number,
): string | null | undefined {
  const minutes = parseClockTime(value);

  if (minutes < 0) {
    return value;
  }

  return formatClockTime(minutes + delta);
}

function sortByOrder(
  items: DayTimePeriod[],
): DayTimePeriod[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function insertBreakIntoDay(
  periods: DayTimePeriod[],
  breakSpec: DayTimeBreakSpec,
): DayTimePeriod[] {
  const sorted = sortByOrder(periods);

  let teachingIndex = -1;

  let anchorIndex = -1;

  for (let index = 0; index < sorted.length; index += 1) {
    if (sorted[index].isBreak) {
      continue;
    }

    teachingIndex += 1;

    if (teachingIndex === breakSpec.afterTeachingIndex) {
      anchorIndex = index;

      break;
    }
  }

  if (anchorIndex < 0) {
    return periods;
  }

  const anchor = sorted[anchorIndex];

  const anchorEnd = parseClockTime(anchor.endTime);

  const newBreak: DayTimePeriod = {
    id: breakSpec.id,
    label: breakSpec.label,
    order: anchor.order + 1,
    isBreak: true,
    startTime:
      anchorEnd >= 0 ? formatClockTime(anchorEnd) : null,
    endTime:
      anchorEnd >= 0
        ? formatClockTime(anchorEnd + breakSpec.durationMinutes)
        : null,
  };

  const inserted = [...sorted];

  inserted.splice(anchorIndex + 1, 0, newBreak);

  const insertedIndex = anchorIndex + 1;

  const shifted = inserted.map((item, index) => {
    if (index <= insertedIndex) {
      return item;
    }

    return {
      ...item,
      startTime: shiftMinutes(item.startTime, breakSpec.durationMinutes),
      endTime: shiftMinutes(item.endTime, breakSpec.durationMinutes),
    };
  });

  return normalizeOrders(shifted);
}

export function removeBreakFromDay(
  periods: DayTimePeriod[],
  breakId: string,
): DayTimePeriod[] {
  const sorted = sortByOrder(periods);

  const breakIndex = sorted.findIndex(
    (period) => period.isBreak && period.id === breakId,
  );

  if (breakIndex < 0) {
    return periods;
  }

  const removed = sorted[breakIndex];

  const duration = durationBetweenTimes(
    removed.startTime,
    removed.endTime,
  );

  const result: DayTimePeriod[] = [];

  sorted.forEach((item, index) => {
    if (item.isBreak && item.id === breakId) {
      return;
    }

    if (index > breakIndex && duration > 0) {
      result.push({
        ...item,
        startTime: shiftMinutes(item.startTime, -duration),
        endTime: shiftMinutes(item.endTime, -duration),
      });

      return;
    }

    result.push(item);
  });

  return normalizeOrders(result);
}

export function updateBreakInDay(
  periods: DayTimePeriod[],
  breakId: string,
  patch: {
    label?: string;
    durationMinutes?: number;
  },
): DayTimePeriod[] {
  const sorted = sortByOrder(periods);

  const breakIndex = sorted.findIndex(
    (period) => period.isBreak && period.id === breakId,
  );

  if (breakIndex < 0) {
    return periods;
  }

  const target = sorted[breakIndex];

  const oldDuration = durationBetweenTimes(target.startTime, target.endTime);

  const newDuration =
    patch.durationMinutes !== undefined &&
    Number.isFinite(patch.durationMinutes) &&
    patch.durationMinutes > 0
      ? patch.durationMinutes
      : oldDuration;

  const label =
    patch.label?.trim() || target.label;

  const delta = newDuration > 0 && oldDuration > 0 ? newDuration - oldDuration : 0;

  const start = parseClockTime(target.startTime);

  const result: DayTimePeriod[] = [];

  sorted.forEach((item, index) => {
    if (item.isBreak && item.id === breakId) {
      result.push({
        ...item,
        label,
        endTime:
          start >= 0 && newDuration > 0
            ? formatClockTime(start + newDuration)
            : item.endTime,
      });

      return;
    }

    if (index > breakIndex && delta !== 0) {
      result.push({
        ...item,
        startTime: shiftMinutes(item.startTime, delta),
        endTime: shiftMinutes(item.endTime, delta),
      });

      return;
    }

    result.push(item);
  });

  return normalizeOrders(result);
}

export function findPeriodReferences(
  constraints: PeriodReferenceSource[],
  periodIds: string[],
): PeriodReferenceInfo[] {
  const result: PeriodReferenceInfo[] = [];

  for (const periodId of periodIds) {
    const count = constraints.filter(
      (constraint) =>
        constraint.periods.some((link) => link.periodId === periodId) ||
        constraint.slots.some((slot) => slot.periodId === periodId),
    ).length;

    if (count > 0) {
      result.push({
        periodId,
        count,
      });
    }
  }

  return result;
}
