import { filterValidReportEvidenceItems } from "@/lib/report-engine/report-evidence-utils";
import type { PreviewCaseData } from "./report-types";
import { getEvidencePresentationMode } from "@/lib/evidence/evidence-presentation";

const REPORT_DESIGN_IMAGE_EVIDENCE_EXTENSION_PATTERN =
  /\.(png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i;

function hasReportDesignImageEvidenceExtension(value: unknown) {
  const text = String(value || "").trim().replaceAll("\\", "/");

  if (!text) return false;

  return REPORT_DESIGN_IMAGE_EVIDENCE_EXTENSION_PATTERN.test(text);
}

function isReportDesignImageEvidence(
  evidence: NonNullable<PreviewCaseData["evidences"]>[number] | undefined,
) {
  if (!evidence) return false;
  if (String(evidence.type || "").trim().toUpperCase() === "IMAGE") return true;
  if (String(evidence.mimeType || "").toLowerCase().startsWith("image/")) return true;

  return [
    evidence.imageUrl,
    evidence.url,
    evidence.fileUrl,
    evidence.publicUrl,
    evidence.storagePath,
  ].some((value) => hasReportDesignImageEvidenceExtension(value));
}

export function getReportDesignEvidenceImageUrl(
  evidence: NonNullable<PreviewCaseData["evidences"]>[number] | undefined,
) {
  if (!evidence || getEvidencePresentationMode(evidence) !== "IMAGE" || !isReportDesignImageEvidence(evidence)) return "";

  return String(
    evidence.imageUrl ||
      evidence.url ||
      evidence.fileUrl ||
      evidence.publicUrl ||
      evidence.storagePath ||
      "",
  ).trim();
}

export function getValidPreviewEvidences(previewCase: PreviewCaseData | null) {
  const hasSelectedCase = Boolean(previewCase?.caseId);

  return filterValidReportEvidenceItems(previewCase?.evidences || [], {
    allowSampleEvidence: !hasSelectedCase,
  });
}

export function getEvidenceStartIndex(block: any) {
  const startIndex = Number(block.evidenceStartIndex || 0);

  if (!Number.isFinite(startIndex) || startIndex < 0) {
    return 0;
  }

  return Math.floor(startIndex);
}

export function getEvidencePerPage(block: any) {
  const explicitLimit = Number(block.evidenceLimit || 0);

  if (Number.isFinite(explicitLimit) && explicitLimit > 0) {
    return Math.max(1, Math.floor(explicitLimit));
  }
  return getSmartEvidencePerPage(block);
}

export function getSmartEvidencePerPage(block: any) {
  const layout = String(block?.evidenceLayout || "TWO_PER_PAGE");
  const ratio = String(block?.evidenceAspectRatio || "LANDSCAPE_4_3");
  const fit = String(block?.evidenceFit || "contain");

  if (layout === "ATTACHMENT_LIST") return 10;
  if (layout === "ONE_PER_PAGE") return 1;
  if (layout === "TWO_PER_PAGE") return 2;

  /*
    GRID_2X2 is a maximum capacity, not a forced capacity.
    The system must keep every evidence card inside the A4 frame.
    Portrait images are tall, so 4 cards can overflow the page.
  */
  if (layout === "GRID_2X2") {
    if (ratio === "PORTRAIT_3_4") return 2;
    if (ratio === "SQUARE_1_1" && fit === "cover") return 4;
    if (ratio === "SQUARE_1_1") return 4;
    if (ratio === "LANDSCAPE_16_9") return 4;
    return 4;
  }

  return 2;
}

export function createEvidencePlaceholders(count: number, startIndex: number) {
  return Array.from({ length: count }).map((_, index) => ({
    id: `placeholder-evidence-${startIndex + index + 1}`,
    title: `شاهد تجريبي ${startIndex + index + 1}`,
    caption: "مكان الشاهد داخل التقارير",
    fileUrl: "",
    imageUrl: "",
  }));
}

export function getEvidenceGridClass(block: any) {
  const perPage = getEvidencePerPage(block);

  if (block.evidenceLayout === "ATTACHMENT_LIST") {
    return "grid gap-2";
  }

  if (perPage <= 1) {
    return "grid gap-3";
  }

  return "grid gap-3 md:grid-cols-2";
}

export function getEvidenceImageHeightClass(block: any) {
  const perPage = getEvidencePerPage(block);
  const ratio = block.evidenceAspectRatio || "LANDSCAPE_4_3";

  /*
    Fixed heights are intentional:
    they keep evidence inside the printable A4 area.
    Extra evidence must go to a new Evidence Page instead of stretching A4.
  */
  if (perPage <= 1) {
    switch (ratio) {
      case "PORTRAIT_3_4":
        return "h-[185mm]";
      case "SQUARE_1_1":
        return "h-[160mm]";
      case "LANDSCAPE_16_9":
        return "h-[122mm]";
      case "LANDSCAPE_4_3":
      default:
        return "h-[138mm]";
    }
  }

  if (perPage === 2) {
    switch (ratio) {
      case "PORTRAIT_3_4":
        return "h-[92mm]";
      case "SQUARE_1_1":
        return "h-[82mm]";
      case "LANDSCAPE_16_9":
        return "h-[58mm]";
      case "LANDSCAPE_4_3":
      default:
        return "h-[66mm]";
    }
  }

  switch (ratio) {
    case "SQUARE_1_1":
      return "h-[56mm]";
    case "LANDSCAPE_16_9":
      return "h-[42mm]";
    case "PORTRAIT_3_4":
      return "h-[82mm]";
    case "LANDSCAPE_4_3":
    default:
      return "h-[48mm]";
  }
}

export function getEvidenceImageClass(block: any) {
  const fit = block.evidenceFit === "cover" ? "object-cover" : "object-contain";
  return `${getEvidenceImageHeightClass(block)} w-full ${fit}`;
}

export function getEvidenceGridStyle(block: any) {
  const perPage = getEvidencePerPage(block);
  const gapMm = Number(block.evidenceGapMm || 0);

  const style: Record<string, string> = {};

  if (gapMm > 0) {
    style.gap = `${Math.min(Math.max(gapMm, 2), 12)}mm`;
  }

  if (block.evidenceLayout !== "ATTACHMENT_LIST") {
    style.gridTemplateColumns =
      perPage <= 1 ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))";
  }

  return style;
}

export function getEvidenceFigureStyle(block: any) {
  const perPage = getEvidencePerPage(block);
  const widthMm = Number(block.evidenceImageWidthMm || 0);

  if (!widthMm || perPage > 1) {
    return {};
  }

  return {
    maxWidth: `${Math.min(Math.max(widthMm, 40), 180)}mm`,
    marginInline: "auto",
  };
}

export function getEvidenceImageStyle(block: any) {
  const heightMm = Number(block.evidenceImageHeightMm || 0);
  const widthMm = Number(block.evidenceImageWidthMm || 0);
  const perPage = getEvidencePerPage(block);

  const style: Record<string, string> = {
    objectFit: block.evidenceFit === "cover" ? "cover" : "contain",
  };

  if (heightMm > 0) {
    style.height = `${Math.min(Math.max(heightMm, 35), 190)}mm`;
  }

  if (widthMm > 0 && perPage <= 1) {
    style.width = `${Math.min(Math.max(widthMm, 40), 180)}mm`;
  }

  return style;
}


