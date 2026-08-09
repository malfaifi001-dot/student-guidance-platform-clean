import type { LogicalReportBlock } from "./report-smart-table-pagination";

const FALLBACK_TEXT_CHUNK_LENGTH = 700;

function text(value: unknown) {
  return String(value ?? "");
}

function getSourceBlockId(block: LogicalReportBlock) {
  return (
    String(block.sourceBlockId || "").trim() ||
    String(block.id || "").trim() ||
    String(block.kind || "report-block").trim()
  );
}

function splitLongTextChunk(
  value: string,
  maxLength = FALLBACK_TEXT_CHUNK_LENGTH,
) {
  const source = value.trim();

  if (!source) {
    return [];
  }

  if (source.length <= maxLength) {
    return [source];
  }

  const result: string[] = [];
  let remaining = source;

  while (remaining.length > maxLength) {
    const candidate = remaining.slice(0, maxLength);

    const preferredBreak = Math.max(
      candidate.lastIndexOf("."),
      candidate.lastIndexOf("!"),
      candidate.lastIndexOf("?"),
      candidate.lastIndexOf(":"),
      candidate.lastIndexOf(";"),
      candidate.lastIndexOf(","),
      candidate.lastIndexOf(" "),
    );

    const splitAt =
      preferredBreak >= Math.floor(maxLength * 0.55)
        ? preferredBreak + 1
        : maxLength;

    const part = remaining.slice(0, splitAt).trim();

    if (part) {
      result.push(part);
    }

    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    result.push(remaining);
  }

  return result;
}

function splitParagraphContent(value: string) {
  const paragraphs = text(value)
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  return paragraphs.flatMap((paragraph) =>
    splitLongTextChunk(paragraph),
  );
}

function splitBulletContent(value: string) {
  return text(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((line) => splitLongTextChunk(line));
}

function buildContinuationBlocks(
  block: LogicalReportBlock,
  parts: string[],
): LogicalReportBlock[] {
  if (parts.length <= 1) {
    return [block];
  }

  const sourceBlockId = getSourceBlockId(block);

  return parts.map((part, index) => ({
    ...block,
    id:
      index === 0
        ? block.id
        : `${sourceBlockId}-part-${index + 1}`,
    sourceBlockId,
    content: part,
    showTitle: index === 0 ? block.showTitle : false,
    continuationIndex: index,
    continuationCount: parts.length,
  }));
}

/**
 * Split only a block that the real A4 measurement has already proven
 * cannot fit by itself on one physical page.
 *
 * This function never creates physical pages.
 * SmartPhysicalReportComposer remains responsible for measured A4 packing.
 */
export function splitOversizedReportBlock(
  block: LogicalReportBlock,
): LogicalReportBlock[] {
  const kind = String(block.kind || "").trim();

  if (kind === "multi-paragraph") {
    return buildContinuationBlocks(
      block,
      splitParagraphContent(text(block.content)),
    );
  }

  if (kind === "bullet-list") {
    return buildContinuationBlocks(
      block,
      splitBulletContent(text(block.content)),
    );
  }

  return [block];
}