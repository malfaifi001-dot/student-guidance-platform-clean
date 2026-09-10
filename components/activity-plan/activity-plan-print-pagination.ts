export type MeasuredPrintItem<T> = {
  item: T;
  heightMm: number;
};

export function paginateMeasuredPrintItems<T>(
  items: MeasuredPrintItem<T>[],
  options: {
    intermediateCapacityMm: number;
    finalCapacityMm: number;
    reserveFinalPage?: boolean;
  },
) {
  const pages: MeasuredPrintItem<T>[][] = [];
  let current: MeasuredPrintItem<T>[] = [];
  let usedHeight = 0;

  for (const item of items) {
    if (current.length && usedHeight + item.heightMm > options.intermediateCapacityMm) {
      pages.push(current);
      current = [];
      usedHeight = 0;
    }
    current.push(item);
    usedHeight += item.heightMm;
  }
  if (current.length || !pages.length) pages.push(current);

  // Continuation pages can use the full table area. The last page must also
  // retain enough room for the shared signature block and footer.
  while (options.reserveFinalPage !== false && pages.length) {
    const lastPage = pages[pages.length - 1];
    const lastHeight = lastPage.reduce((total, item) => total + item.heightMm, 0);
    if (lastHeight <= options.finalCapacityMm || lastPage.length <= 1) break;

    const moved = lastPage.pop();
    if (!moved) break;
    pages.push([moved]);
  }

  return pages.map((page) => page.map(({ item }) => item));
}
