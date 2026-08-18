import { Capacitor, registerPlugin } from "@capacitor/core";

type NativePdfResult = {
  fileName: string;
  uri: string;
};

type TeachixPdfPlugin = {
  savePdf(options: { data: string; fileName: string }): Promise<NativePdfResult>;
  renderHtmlToPdf(options: { url: string; fileName: string }): Promise<NativePdfResult>;
};

const TeachixPdf = registerPlugin<TeachixPdfPlugin>("TeachixPdf");

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",", 2)[1] || "");
    };
    reader.onerror = () => reject(reader.error || new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(blob);
  });
}

export async function downloadBlobAsNativeFile(blob: Blob, fileName: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const safeFileName = fileName.trim() || "report.pdf";
  const data = await blobToBase64(blob);
  await TeachixPdf.savePdf({ data, fileName: safeFileName });
  return true;
}

export async function savePrintPreviewAsNativePdf(url: string, fileName: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const safeFileName = fileName.trim() || "report.pdf";
  await TeachixPdf.renderHtmlToPdf({ url, fileName: safeFileName });
  return true;
}

