export type TimetableHistoryStackItem = {
  id: string;
  state: "ACTIVE" | "UNDONE" | "SUPERSEDED";
};

export function appendTimetableHistoryItem(
  items: TimetableHistoryStackItem[],
  item: TimetableHistoryStackItem,
) {
  return [
    ...items.map((entry) =>
      entry.state === "UNDONE"
        ? { ...entry, state: "SUPERSEDED" as const }
        : entry,
    ),
    { ...item, state: "ACTIVE" as const },
  ];
}

export function undoTimetableHistoryItem(items: TimetableHistoryStackItem[]) {
  const index = [...items]
    .map((entry, position) => ({ entry, position }))
    .reverse()
    .find(({ entry }) => entry.state === "ACTIVE")?.position;

  if (index === undefined) return { items, entry: null };

  const entry = items[index];
  return {
    entry,
    items: items.map((item, position) =>
      position === index
        ? { ...item, state: "UNDONE" as const }
        : item,
    ),
  };
}

export function redoTimetableHistoryItem(items: TimetableHistoryStackItem[]) {
  const index = items
    .map((entry, position) => ({ entry, position }))
    .find(({ entry }) => entry.state === "UNDONE")?.position;

  if (index === undefined) return { items, entry: null };

  const entry = items[index];
  return {
    entry,
    items: items.map((item, position) =>
      position === index
        ? { ...item, state: "ACTIVE" as const }
        : item,
    ),
  };
}

export function historyStateMatches(
  expected: unknown,
  actual: unknown,
) {
  return JSON.stringify(expected) === JSON.stringify(actual);
}
