import "server-only";
import crypto from "node:crypto";
import { getMetaWhatsAppConfig } from "@/lib/whatsapp/meta-whatsapp-config";

const s = (v: unknown, max = 1000) => String(v || "").slice(0, max);
export function verifyMetaWebhookSignature(rawBody: string, signature: string | null) {
  const secret = getMetaWhatsAppConfig().appSecret;
  if (!secret) return { valid: true, enabled: false };
  if (!signature?.startsWith("sha256=")) return { valid: false, enabled: true };
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const received = signature;
  return { valid: expected.length === received.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received)), enabled: true };
}
export type NormalizedWebhookEvent = { kind: "inbound" | "status"; providerMessageId: string; phone: string; displayName?: string; bodyPreview?: string; type: "TEXT" | "UNSUPPORTED"; timestamp: Date; status?: "SENT" | "DELIVERED" | "READ" | "FAILED"; errorCode?: string; errorMessage?: string; fingerprint: string };
export function normalizeMetaWebhook(payload: unknown): NormalizedWebhookEvent[] {
  const root = payload as { entry?: Array<{ changes?: Array<{ value?: Record<string, unknown> }> }> };
  const events: NormalizedWebhookEvent[] = [];
  for (const entry of root?.entry || []) for (const change of entry.changes || []) {
    const value = change.value || {}; const contacts = (value.contacts || []) as Array<Record<string, unknown>>; const contact = contacts[0] || {};
    for (const message of (value.messages || []) as Array<Record<string, unknown>>) {
      const id = s(message.id, 255), phone = s(message.from, 32), type = s(message.type, 40); if (!id || !phone) continue;
      const timestamp = new Date(Number(s(message.timestamp)) * 1000 || Date.now()); const text = message.text as Record<string, unknown> | undefined;
      events.push({ kind: "inbound", providerMessageId: id, phone, displayName: s((contact.profile as Record<string, unknown> | undefined)?.name, 191) || undefined, bodyPreview: type === "text" ? s(text?.body, 4000) : "[محتوى غير مدعوم]", type: type === "text" ? "TEXT" : "UNSUPPORTED", timestamp, fingerprint: crypto.createHash("sha256").update(`in:${id}`).digest("hex") });
    }
    for (const status of (value.statuses || []) as Array<Record<string, unknown>>) {
      const id = s(status.id, 255), phone = s(status.recipient_id, 32), valueStatus = s(status.status).toUpperCase(); if (!id || !phone || !["SENT", "DELIVERED", "READ", "FAILED"].includes(valueStatus)) continue;
      const errors = (status.errors || []) as Array<Record<string, unknown>>; const error = errors[0] || {}; const timestamp = new Date(Number(s(status.timestamp)) * 1000 || Date.now());
      events.push({ kind: "status", providerMessageId: id, phone, timestamp, type: "TEXT", status: valueStatus as "SENT" | "DELIVERED" | "READ" | "FAILED", errorCode: s(error.code, 120) || undefined, errorMessage: s(error.title || error.message, 1000) || undefined, fingerprint: crypto.createHash("sha256").update(`status:${id}:${valueStatus}:${timestamp.toISOString()}`).digest("hex") });
    }
  }
  return events;
}
