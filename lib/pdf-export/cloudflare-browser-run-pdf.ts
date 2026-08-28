import "server-only";

const CLOUDFLARE_PDF_TIMEOUT_MS = 60_000;
const PDF_SIGNATURE = "%PDF-";

export async function generatePdfFromUrlWithCloudflare({
  url,
  request,
  waitForSelector = ".pdf-report-page",
  gotoWaitUntil = "networkidle2",
  waitForSelectorTimeoutMs = 45_000,
  debugLabel,
  landscape = false,
}: {
  url: string;
  request?: Request;
  waitForSelector?: string;
  gotoWaitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  waitForSelectorTimeoutMs?: number;
  debugLabel?: "portfolio";
  landscape?: boolean;
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

  const sessionCookie = request?.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("student_guidance_session="));
  const cookies = sessionCookie
    ? [{
        name: "student_guidance_session",
        value: sessionCookie.slice("student_guidance_session=".length),
        url,
        path: "/",
        httpOnly: true,
        secure: url.startsWith("https://"),
        sameSite: "Lax" as const,
      }]
    : undefined;

  const requestBody = {
    url,
    ...(cookies ? { cookies } : {}),
    gotoOptions: {
      waitUntil: gotoWaitUntil,
      timeout: 45_000,
    },
    waitForSelector: {
      selector: waitForSelector,
      timeout: waitForSelectorTimeoutMs,
      visible: true,
    },
    pdfOptions: {
      format: "a4",
      landscape,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    },
  };

  if (debugLabel === "portfolio") {
    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(url);
    } catch {
      parsedUrl = null;
    }

    console.info("PORTFOLIO_CLOUDFLARE_DEBUG", {
      stage: "browser-rendering-request",
      urlPath: parsedUrl
        ? `${parsedUrl.pathname.replace(/\/portfolio-export-preview\/[^/?#]+/, "/portfolio-export-preview/[token]")}${parsedUrl.search}`
        : null,
      parsedOrigin: parsedUrl?.origin || null,
      gotoWaitUntil,
      waitForSelector,
      waitForSelectorTimeoutMs,
      cookiesSent: Boolean(cookies?.length),
    });
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/browser-rendering/pdf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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
