import { Capacitor } from "@capacitor/core";

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
  const { Directory, Filesystem } = await import("@capacitor/filesystem");

  let uri: string | undefined;
  try {
    const result = await Filesystem.writeFile({
      path: safeFileName,
      data,
      directory: Directory.Documents,
      recursive: true,
    });
    uri = result.uri;
  } catch {
    const result = await Filesystem.writeFile({
      path: safeFileName,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    uri = result.uri;
  }

  if (!uri) return true;

  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({
      title: safeFileName,
      files: [uri],
      dialogTitle: "مشاركة الملف",
    });
  } catch {
    // The file is still saved when the user closes the native share sheet.
  }

  return true;
}

