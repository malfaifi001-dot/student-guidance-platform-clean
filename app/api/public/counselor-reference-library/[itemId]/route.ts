import { NextResponse } from "next/server";
import {
  buildAnonymousReferenceLibraryBreadcrumbs,
  getAnonymousReferenceLibraryFolder,
  getAnonymousReferenceLibraryItem,
} from "@/lib/reference-library/reference-library-anonymous-service";

export const dynamic = "force-dynamic";

function sanitizeItem(item: Record<string, unknown>) {
  const {
    storageKey,
    originalStorageKey,
    previewStorageKey,
    pdfStorageKey,
    docxStorageKey,
    ...safeItem
  } = item;
  void storageKey;
  void originalStorageKey;
  void previewStorageKey;
  void pdfStorageKey;
  void docxStorageKey;
  return safeItem;
}

export async function GET(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;
  const search = String(new URL(request.url).searchParams.get("q") || "").trim().slice(0, 120);
  const folderResult = await getAnonymousReferenceLibraryFolder({ itemId, search });

  if (folderResult) {
    const breadcrumbs = await buildAnonymousReferenceLibraryBreadcrumbs(itemId);
    return NextResponse.json({
      success: true,
      item: sanitizeItem(folderResult.folder as unknown as Record<string, unknown>),
      items: folderResult.items.map((item) => sanitizeItem(item as unknown as Record<string, unknown>)),
      breadcrumbs,
    }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  }

  const item = await getAnonymousReferenceLibraryItem(itemId);
  if (!item) return NextResponse.json({ success: false, error: "العنصر غير متاح." }, { status: 404 });

  return NextResponse.json({
    success: true,
    item: sanitizeItem(item as unknown as Record<string, unknown>),
    items: [],
    breadcrumbs: await buildAnonymousReferenceLibraryBreadcrumbs(item.parentId),
  }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
