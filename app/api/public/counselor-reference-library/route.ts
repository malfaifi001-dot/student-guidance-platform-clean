import { NextResponse } from "next/server";
import { listAnonymousReferenceLibraryItems } from "@/lib/reference-library/reference-library-anonymous-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parentId = String(url.searchParams.get("parentId") || "").trim() || null;
  const search = String(url.searchParams.get("q") || "").trim().slice(0, 120);
  const items = await listAnonymousReferenceLibraryItems({ parentId, search });

  if (items === null) return NextResponse.json({ success: false, error: "المجلد غير متاح." }, { status: 404 });
  return NextResponse.json({ success: true, items }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
