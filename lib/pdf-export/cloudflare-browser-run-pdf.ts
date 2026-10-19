import "server-only";

const CLOUDFLARE_PDF_TIMEOUT_MS = 180_000;
const CLOUDFLARE_BROWSER_OPERATION_TIMEOUT_MS = 120_000;
const PDF_SIGNATURE = "%PDF-";

export class CloudflareBrowserRunError extends Error {
  readonly status: number;
  readonly retryAfterMs: number | null;

  constructor(status: number, message: string, retryAfterMs: number | null) {
    super(`Cloudflare Browser Run PDF request failed (${status}): ${message}`);
    this.name = "CloudflareBrowserRunError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfter(value: string | null) {
  if (!value) return null;
  const seconds = Number(value.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60 * 60 * 1000);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.min(Math.max(0, timestamp - Date.now()), 60 * 60 * 1000);
}

function cloudflareLog(stage: string, details: Record<string, unknown>) {
  console.info(`PORTFOLIO_CLOUDFLARE ${JSON.stringify({ stage, ...details })}`);
}

export async function generatePdfFromUrlWithCloudflare({
  url,
  request,
  waitForSelector = ".pdf-report-page",
  gotoWaitUntil = "networkidle2",
  waitForSelectorTimeoutMs = CLOUDFLARE_BROWSER_OPERATION_TIMEOUT_MS,
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
  const startedAt = Date.now();
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
      timeout: CLOUDFLARE_BROWSER_OPERATION_TIMEOUT_MS,
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
    cloudflareLog("fetch-start", {
      elapsedMs: 0,
      cloudflareTimeoutMs: CLOUDFLARE_PDF_TIMEOUT_MS,
      gotoWaitUntil,
      waitForSelector,
      waitForSelectorTimeoutMs,
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

    if (debugLabel === "portfolio") {
      cloudflareLog("fetch-response", {
        elapsedMs: Date.now() - startedAt,
        status: response.status,
        ok: response.ok,
      });
    }

    if (!response.ok) {
      const errorBody = (await response.text()).slice(0, 500);
      throw new CloudflareBrowserRunError(response.status, errorBody, parseRetryAfter(response.headers.get("retry-after")));
    }

    const pdfBytes = new Uint8Array(await response.arrayBuffer());

    if (debugLabel === "portfolio") {
      cloudflareLog("pdf-bytes-ready", {
        elapsedMs: Date.now() - startedAt,
        bytesLength: pdfBytes.length,
      });
    }

    const signature = new TextDecoder("ascii").decode(pdfBytes.slice(0, 5));

    if (!pdfBytes.length || signature !== PDF_SIGNATURE) {
      throw new Error("Cloudflare Browser Run returned an invalid PDF body.");
    }

    return pdfBytes;
  } catch (error) {
    if (debugLabel === "portfolio") {
      cloudflareLog("fetch-error", {
        elapsedMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : "UnknownError",
        abortedByLocalController: controller.signal.aborted,
      });
    }

    throw error;
  } finally {
    if (debugLabel === "portfolio") {
      cloudflareLog("fetch-finished", {
        elapsedMs: Date.now() - startedAt,
      });
    }

    clearTimeout(timeoutId);
  }
}
