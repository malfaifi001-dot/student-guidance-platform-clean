export function createReportDocumentId(prefix = "item") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrderBetween(
  previousOrder: number | null,
  nextOrder: number | null,
) {
  if (previousOrder === null && nextOrder === null) return 1000;
  if (previousOrder === null) return nextOrder! - 100;
  if (nextOrder === null) return previousOrder + 100;

  return (previousOrder + nextOrder) / 2;
}

export function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

export function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;

  return Math.max(0, Math.min(index, length - 1));
}