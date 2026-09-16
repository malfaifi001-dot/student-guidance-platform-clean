import { NextResponse } from "next/server";
import { getMetaWhatsAppConfig } from "@/lib/whatsapp/meta-whatsapp-config";
import { normalizeMetaWebhook, verifyMetaWebhookSignature } from "@/lib/whatsapp/meta-whatsapp-webhook";
import { persistWebhookEvent } from "@/lib/whatsapp/whatsapp-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url); const config = getMetaWhatsAppConfig();
  if (url.searchParams.get("hub.mode") === "subscribe" && config.verifyToken && url.searchParams.get("hub.verify_token") === config.verifyToken) return new Response(url.searchParams.get("hub.challenge") || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text(); const signature = verifyMetaWebhookSignature(raw, request.headers.get("x-hub-signature-256"));
  if (!signature.valid) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  const payload = JSON.parse(raw || "{}");
  for (const event of normalizeMetaWebhook(payload)) await persistWebhookEvent(event);
  return NextResponse.json({ received: true });
}
