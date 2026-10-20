import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";
import {
  getPortfolioSnapshotPdfArtifact,
  getPortfolioSnapshotPdfStatus,
  registerPortfolioSnapshotPdf,
} from "@/lib/portfolio/portfolio-snapshot-pdf-service";
import { createStoredFileResponse } from "@/lib/storage/storage-file-response";
import { storageFileExists } from "@/lib/storage/storage-provider";
import { storageKeySegments } from "@/lib/storage/storage-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOWNLOAD_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,48}$/;

function pdfFileName(title: string) {
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return `${safe || "portfolio"}.pdf`;
}

function getDownloadRequestId(request: Request) {
  const value = new URL(request.url).searchParams.get("downloadRequestId") || "";
  return DOWNLOAD_REQUEST_ID_PATTERN.test(value) ? value : "";
}

function setAcknowledgementCookie(headers: Headers, downloadRequestId: string) {
  if (!downloadRequestId) return;
  headers.set("Set-Cookie", `teachix_portfolio_download_${downloadRequestId}=1; Path=/; Max-Age=300; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

function statusUrl(request: Request, snapshotId: string) {
  const url = new URL(`/api/dashboard/portfolio/snapshots/${encodeURIComponent(snapshotId)}/pdf`, request.url);
  return `${url.pathname}${url.search}`;
}

function pendingResponse(request: Request, snapshotId: string, status: string, byteSize: number | null) {
  return NextResponse.json({
    ok: true,
    status,
    byteSize,
    statusUrl: statusUrl(request, snapshotId),
    downloadUrl: new URL(request.url).pathname,
  }, {
    status: status === "FAILED" ? 409 : 202,
    headers: {
      "Cache-Control": "no-store",
      "X-Portfolio-PDF-Status": status,
    },
  });
}

async function ensureSnapshotPdf(snapshot: Awaited<ReturnType<typeof getPortfolioSnapshot>>) {
  const current = await getPortfolioSnapshotPdfStatus(snapshot.id, snapshot.document);
  if (current.exists) return current;
  await registerPortfolioSnapshotPdf(snapshot.id, snapshot.document);
  return getPortfolioSnapshotPdfStatus(snapshot.id, snapshot.document);
}

async function handle(request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const { snapshotId } = await params;
    const snapshot = await getPortfolioSnapshot(user, snapshotId);
    const status = await ensureSnapshotPdf(snapshot);
    const artifact = await getPortfolioSnapshotPdfArtifact(snapshot.id, snapshot.document);

    if (status.status === "FAILED") {
      return pendingResponse(request, snapshot.id, "FAILED", "byteSize" in status ? status.byteSize : null);
    }
    if (status.status !== "READY" || !artifact?.storageKey) {
      return pendingResponse(request, snapshot.id, status.status, "byteSize" in status ? status.byteSize : null);
    }

    const segments = storageKeySegments(artifact.storageKey);
    if (!(await storageFileExists(segments))) {
      await registerPortfolioSnapshotPdf(snapshot.id, snapshot.document, { forceRetry: true });
      return pendingResponse(request, snapshot.id, "PENDING", null);
    }

    const response = await createStoredFileResponse({
      request,
      segments,
      fileName: pdfFileName(snapshot.name),
      etag: artifact.storageKey.split("/").pop()?.replace(/\.pdf$/i, "") || snapshot.id,
      contentType: "application/pdf",
    });
    setAcknowledgementCookie(response.headers, getDownloadRequestId(request));
    return response;
  } catch (error) {
    return portfolioApiError(error);
  }
}

export async function GET(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  return handle(request, context);
}

export async function HEAD(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  return handle(request, context);
}
