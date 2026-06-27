export async function downloadBlobAsFile(
  blob: Blob,
  fileName: string,
): Promise<void> {
  const safeFileName = fileName.trim() || "report.pdf";
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = safeFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function buildPrintUrl(url: string): string {
  const trimmed = String(url || "").trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    parsed.searchParams.set("print", "1");

    if (/^https?:\/\//i.test(trimmed)) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const [beforeHash, hash = ""] = trimmed.split("#");
    const [path, query = ""] = beforeHash.split("?");
    const searchParams = new URLSearchParams(query);

    searchParams.set("print", "1");

    return `${path}?${searchParams.toString()}${hash ? `#${hash}` : ""}`;
  }
}
