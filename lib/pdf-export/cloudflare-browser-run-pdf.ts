import "server-only";

const CLOUDFLARE_PDF_TIMEOUT_MS = 180_000;
// Cloudflare Browser Run rejects goto/selector timeouts above 60 seconds.
const CLOUDFLARE_BROWSER_OPERATION_TIMEOUT_MS = 60_000;
const PDF_SIGNATURE = "%PDF-";
const PDF_END_MARKER = "%%EOF";
const PDF_TAIL_BYTES = 64;

function parseTrustedContentLength(value: string | null) {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) && length >= 0 ? length : null;
}

function concatenateBytes(left: Uint8Array, right: Uint8Array) {
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left, 0);
  result.set(right, left.byteLength);
  return result;
}

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

/**
 * Streams a validated Cloudflare PDF for the saved-snapshot download route.
 * The existing Uint8Array helper above intentionally remains the API used by
 * the other PDF exporters.
 */
export async function generatePdfStreamFromUrlWithCloudflare({
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
}): Promise<{ body: ReadableStream<Uint8Array>; contentLength: number | null }> {
  const startedAt = Date.now();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_BROWSER_RUN_API_TOKEN?.trim();

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Browser Run PDF credentials are not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLOUDFLARE_PDF_TIMEOUT_MS);
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

  let response: Response;
  try {
    response = await fetch(
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
      throw new CloudflareBrowserRunError(
        response.status,
        errorBody,
        parseRetryAfter(response.headers.get("retry-after")),
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (debugLabel === "portfolio") {
      cloudflareLog("fetch-error", {
        elapsedMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : "UnknownError",
        abortedByLocalController: controller.signal.aborted,
      });
      cloudflareLog("fetch-finished", { elapsedMs: Date.now() - startedAt });
    }
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    clearTimeout(timeoutId);
    controller.abort();
    throw new Error("Cloudflare Browser Run returned an empty PDF body.");
  }

  let cleanedUp = false;
  let upstreamDone = false;
  const contentLength = parseTrustedContentLength(response.headers.get("content-length"));
  const cleanup = async (reason?: unknown) => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearTimeout(timeoutId);
    if (!upstreamDone) {
      try {
        await reader.cancel(reason);
      } catch {
        // The upstream connection may already be closed.
      }
    }
    controller.abort();
  };

  const initialChunks: Uint8Array[] = [];
  let signatureBytes = new Uint8Array(0);
  let tailBytes = new Uint8Array(0);
  let transferredBytes = 0;

  const rememberTail = (chunk: Uint8Array) => {
    const combined = concatenateBytes(tailBytes, chunk);
    tailBytes = combined.slice(Math.max(0, combined.byteLength - PDF_TAIL_BYTES));
  };

  try {
    while (signatureBytes.byteLength < PDF_SIGNATURE.length) {
      const result = await reader.read();
      if (result.done) {
        upstreamDone = true;
        throw new Error("Cloudflare Browser Run returned an incomplete PDF body.");
      }
      if (!result.value?.byteLength) continue;
      const chunk = result.value;
      initialChunks.push(chunk);
      transferredBytes += chunk.byteLength;
      rememberTail(chunk);
      signatureBytes = concatenateBytes(signatureBytes, chunk);
    }

    const signature = new TextDecoder("ascii").decode(
      signatureBytes.slice(0, PDF_SIGNATURE.length),
    );
    if (signature !== PDF_SIGNATURE) {
      throw new Error("Cloudflare Browser Run returned an invalid PDF body.");
    }
    if (contentLength !== null && transferredBytes > contentLength) {
      throw new Error("Cloudflare Browser Run returned an oversized PDF body.");
    }
  } catch (error) {
    await cleanup(error);
    if (debugLabel === "portfolio") {
      cloudflareLog("fetch-error", {
        elapsedMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : "UnknownError",
        abortedByLocalController: controller.signal.aborted,
      });
      cloudflareLog("fetch-finished", { elapsedMs: Date.now() - startedAt });
    }
    throw error;
  }

  const body = new ReadableStream<Uint8Array>({
    async pull(streamController) {
      try {
        while (initialChunks.length > 0) {
          streamController.enqueue(initialChunks.shift());
          return;
        }

        while (true) {
          const result = await reader.read();
          if (result.done) {
            upstreamDone = true;
            if (contentLength !== null && transferredBytes !== contentLength) {
              throw new Error("Cloudflare Browser Run returned a truncated PDF body.");
            }
            if (!new TextDecoder("ascii").decode(tailBytes).includes(PDF_END_MARKER)) {
              throw new Error("Cloudflare Browser Run returned an incomplete PDF body.");
            }
            await cleanup();
            streamController.close();
            if (debugLabel === "portfolio") {
              cloudflareLog("pdf-stream-ready", {
                elapsedMs: Date.now() - startedAt,
                bytesLength: transferredBytes,
              });
              cloudflareLog("fetch-finished", { elapsedMs: Date.now() - startedAt });
            }
            return;
          }
          if (!result.value?.byteLength) continue;

          transferredBytes += result.value.byteLength;
          rememberTail(result.value);
          if (contentLength !== null && transferredBytes > contentLength) {
            throw new Error("Cloudflare Browser Run returned an oversized PDF body.");
          }
          streamController.enqueue(result.value);
          return;
        }
      } catch (error) {
        await cleanup(error);
        if (debugLabel === "portfolio") {
          cloudflareLog("fetch-error", {
            elapsedMs: Date.now() - startedAt,
            errorName: error instanceof Error ? error.name : "UnknownError",
            abortedByLocalController: controller.signal.aborted,
          });
          cloudflareLog("fetch-finished", { elapsedMs: Date.now() - startedAt });
        }
        streamController.error(error);
      }
    },
    async cancel(reason) {
      await cleanup(reason);
      if (debugLabel === "portfolio") {
        cloudflareLog("fetch-finished", { elapsedMs: Date.now() - startedAt });
      }
    },
  });

  return { body, contentLength };
}
