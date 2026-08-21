import { NextResponse } from "next/server";
import { getAnonymousReferenceLibraryItem } from "@/lib/reference-library/reference-library-anonymous-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;
  const item = await getAnonymousReferenceLibraryItem(itemId);
  if (!item) return NextResponse.json({ success: false, error: "العنصر غير متاح." }, { status: 404 });
  const safeItem = { ...item } as Record<string, unknown>;
  delete safeItem.pdfStorageKey;
  delete safeItem.docxStorageKey;
  return NextResponse.json({ success: true, item: safeItem }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
