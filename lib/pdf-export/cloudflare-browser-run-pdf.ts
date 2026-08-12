import "server-only";

const CLOUDFLARE_PDF_TIMEOUT_MS = 60_000;
const PDF_SIGNATURE = "%PDF-";

export async function generatePdfFromUrlWithCloudflare({
  url,
}: {
  url: string;
}): Promise<Uint8Array> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_BROWSER_RUN_API_TOKEN?.trim();

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Browser Run PDF credentials are not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    CLOUDFLARE_PDF_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/browser-rendering/pdf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          gotoOptions: {
            waitUntil: "networkidle2",
            timeout: 45_000,
          },
          waitForSelector: {
            selector: ".pdf-report-page",
            timeout: 45_000,
            visible: true,
          },
          pdfOptions: {
            format: "a4",
            landscape: false,
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: false,
          },
        }),
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const errorBody = (await response.text()).slice(0, 500);
      throw new Error(
        `Cloudflare Browser Run PDF request failed (${response.status}): ${errorBody}`,
      );
    }

    const pdfBytes = new Uint8Array(await response.arrayBuffer());
    const signature = new TextDecoder("ascii").decode(pdfBytes.slice(0, 5));

    if (!pdfBytes.length || signature !== PDF_SIGNATURE) {
      throw new Error("Cloudflare Browser Run returned an invalid PDF body.");
    }

    return pdfBytes;
  } finally {
    clearTimeout(timeoutId);
  }
}
