"use client";

import { useState, type ReactNode } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Loader2 } from "lucide-react";

type DocumentPdfDownloadButtonProps = {
  targetId: string;
  fileName: string;
  disabled?: boolean;
  children?: ReactNode;
  onBeforeDownload?: () => boolean | Promise<boolean>;
  onAfterDownload?: () => void | Promise<void>;
};

const UNSUPPORTED_COLOR_RE = /\b(oklch|lab|lch|color-mix)\(/i;

const COPIED_STYLE_PROPS = [
  "box-sizing",
  "display",
  "position",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-decoration",
  "direction",
  "white-space",
  "vertical-align",
  "overflow",
  "overflow-wrap",
  "word-break",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "justify-content",
  "gap",
  "row-gap",
  "column-gap",
  "grid-template-columns",
  "grid-template-rows",
] as const;

const COLOR_STYLE_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "caret-color",
] as const;

export function DocumentPdfDownloadButton({
  targetId,
  fileName,
  disabled = false,
  children,
  onBeforeDownload,
  onAfterDownload,
}: DocumentPdfDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function downloadPdf() {
    if (disabled || isDownloading) return;

    setIsDownloading(true);

    let safeContainer: HTMLDivElement | null = null;

    try {
      const canContinue = onBeforeDownload ? await onBeforeDownload() : true;

      if (!canContinue) return;

      const target = document.getElementById(targetId);

      if (!target) {
        alert("لم يتم العثور على منطقة الخطاب المراد تحميلها.");
        return;
      }

      const scanResult = scanUnsupportedColors(target);

      if (scanResult.length) {
        console.group("PDF export color diagnostics");
        console.warn("تم العثور على ألوان غير مدعومة داخل منطقة التصدير:");
        console.table(scanResult);
        console.groupEnd();
      } else {
        console.info(
          "PDF export color diagnostics: لم يتم العثور على lab/oklch داخل عنصر الخطاب. إذا ظهر الخطأ فمصدره CSS عام من الصفحة."
        );
      }

      await document.fonts.ready;

      const safeExport = createSafeExportClone(target);
      safeContainer = safeExport.container;
      document.body.appendChild(safeContainer);

      const canvas = await html2canvas(safeExport.clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: safeExport.width,
        windowHeight: safeExport.height,
        onclone: (clonedDocument) => {
          removeGlobalStylesFromClone(clonedDocument);
          forceSafeColorsInDocument(clonedDocument);
        },
      });

      const imageData = canvas.toDataURL("image/png", 1.0);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imageWidth = pageWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      if (imageHeight <= pageHeight) {
        pdf.addImage(imageData, "PNG", 0, 0, imageWidth, imageHeight);
      } else {
        let remainingHeight = imageHeight;
        let position = 0;

        while (remainingHeight > 0) {
          pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight);
          remainingHeight -= pageHeight;

          if (remainingHeight > 0) {
            pdf.addPage();
            position -= pageHeight;
          }
        }
      }

      pdf.save(sanitizePdfFileName(fileName));

      await onAfterDownload?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "خطأ غير معروف أثناء PDF";

      console.group("PDF export failed");
      console.error(error);
      console.info("targetId:", targetId);
      console.info("fileName:", fileName);
      console.info(
        "إذا كانت الرسالة Attempting to parse an unsupported color function lab، فغالبًا السبب من CSS عام وليس من بيانات الخطاب."
      );
      console.groupEnd();

      alert(`تعذر تحميل ملف PDF.\n\nالسبب:\n${message}\n\nافتح Console لمشاهدة التشخيص.`);
    } finally {
      safeContainer?.remove();
      setIsDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={disabled || isDownloading}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}

      <span>{isDownloading ? "جاري تجهيز PDF..." : children || "تحميل PDF"}</span>
    </button>
  );
}

function createSafeExportClone(target: HTMLElement) {
  const width = Math.max(
    Math.ceil(target.getBoundingClientRect().width || target.scrollWidth),
    794
  );

  const height = Math.max(
    Math.ceil(target.getBoundingClientRect().height || target.scrollHeight),
    1123
  );

  const clone = target.cloneNode(true) as HTMLElement;

  sanitizeNodeTree(target, clone);

  clone.style.width = `${width}px`;
  clone.style.minHeight = `${height}px`;
  clone.style.backgroundColor = "#ffffff";
  clone.style.color = "#0f172a";
  clone.style.opacity = "1";
  clone.style.visibility = "visible";
  clone.style.pointerEvents = "auto";
  clone.style.transform = "none";

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-12000px";
  container.style.top = "0";
  container.style.width = `${width}px`;
  container.style.minHeight = `${height}px`;
  container.style.backgroundColor = "#ffffff";
  container.style.direction = "rtl";
  container.style.opacity = "1";
  container.style.visibility = "visible";
  container.style.pointerEvents = "none";
  container.appendChild(clone);

  return {
    container,
    clone,
    width,
    height,
  };
}

function sanitizeNodeTree(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceNodes = [
    sourceRoot,
    ...Array.from(sourceRoot.querySelectorAll<HTMLElement>("*")),
  ];

  const cloneNodes = [
    cloneRoot,
    ...Array.from(cloneRoot.querySelectorAll<HTMLElement>("*")),
  ];

  for (let index = 0; index < cloneNodes.length; index++) {
    const source = sourceNodes[index];
    const clone = cloneNodes[index];

    if (!source || !clone) continue;

    const computed = window.getComputedStyle(source);

    clone.removeAttribute("class");
    clone.removeAttribute("data-pdf-exporting");
    clone.removeAttribute("data-nextjs-toast");
    clone.removeAttribute("data-nextjs-dialog");

    if (clone instanceof HTMLImageElement) {
      clone.crossOrigin = "anonymous";
    }

    clone.setAttribute("style", "");

    for (const prop of COPIED_STYLE_PROPS) {
      const value = computed.getPropertyValue(prop);

      if (value) {
        clone.style.setProperty(prop, sanitizeStyleValue(value));
      }
    }

    for (const prop of COLOR_STYLE_PROPS) {
      const value = computed.getPropertyValue(prop);
      const fallback =
        prop === "color"
          ? "#0f172a"
          : prop === "background-color"
            ? "rgba(255, 255, 255, 0)"
            : "#e2e8f0";

      clone.style.setProperty(prop, safeColor(value, fallback));
    }

    clone.style.opacity = "1";
    clone.style.visibility = "visible";
    clone.style.boxShadow = "none";
    clone.style.textShadow = "none";
    clone.style.filter = "none";
    clone.style.backdropFilter = "none";

    if (computed.display === "none") {
      clone.style.display = "block";
    }

    if (cloneRoot === clone) {
      clone.style.backgroundColor = "#ffffff";
      clone.style.color = "#0f172a";
    }
  }
}

function removeGlobalStylesFromClone(clonedDocument: Document) {
  clonedDocument
    .querySelectorAll('style, link[rel="stylesheet"]')
    .forEach((node) => node.remove());
}

function forceSafeColorsInDocument(clonedDocument: Document) {
  const nodes = Array.from(clonedDocument.querySelectorAll<HTMLElement>("*"));

  for (const node of nodes) {
    const style = node.getAttribute("style");

    if (!style) continue;

    if (UNSUPPORTED_COLOR_RE.test(style)) {
      node.setAttribute("style", sanitizeStyleValue(style));
    }

    node.style.boxShadow = "none";
    node.style.textShadow = "none";
    node.style.filter = "none";
    node.style.backdropFilter = "none";
  }
}

function scanUnsupportedColors(target: HTMLElement) {
  const result: Array<{
    index: number;
    tag: string;
    property: string;
    value: string;
    className: string;
    text: string;
  }> = [];

  const nodes = [target, ...Array.from(target.querySelectorAll<HTMLElement>("*"))];

  nodes.forEach((node, index) => {
    const computed = window.getComputedStyle(node);
    const propertiesToCheck = [
      ...COLOR_STYLE_PROPS,
      "box-shadow",
      "text-shadow",
      "filter",
      "backdrop-filter",
      "background",
      "border",
    ];

    for (const property of propertiesToCheck) {
      const value = computed.getPropertyValue(property);

      if (UNSUPPORTED_COLOR_RE.test(value)) {
        result.push({
          index,
          tag: node.tagName.toLowerCase(),
          property,
          value,
          className:
            typeof node.className === "string" ? node.className.slice(0, 160) : "",
          text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
        });
      }
    }
  });

  return result;
}

function sanitizeStyleValue(value: string) {
  if (!value) return value;

  return value
    .replace(/oklch\([^)]*\)/gi, "#0f172a")
    .replace(/lab\([^)]*\)/gi, "#0f172a")
    .replace(/lch\([^)]*\)/gi, "#0f172a")
    .replace(/color-mix\([^)]*\)/gi, "#0f172a");
}

function safeColor(value: string, fallback: string) {
  if (!value) return fallback;

  if (value === "transparent") return "rgba(255, 255, 255, 0)";

  if (UNSUPPORTED_COLOR_RE.test(value)) {
    return fallback;
  }

  return value;
}

function sanitizePdfFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  return cleaned.endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}
