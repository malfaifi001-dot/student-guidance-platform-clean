import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeSaudiWhatsAppNumber } from "@/lib/whatsapp/whatsapp-links";
import { sendTemplateMessage, sendTextMessage } from "@/lib/whatsapp/meta-whatsapp-client";
import type { NormalizedWebhookEvent } from "@/lib/whatsapp/meta-whatsapp-webhook";

const statusRank = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4, RECEIVED: 4 } as const;
function safePhone(value: string) { return normalizeSaudiWhatsAppNumber(value); }
async function matchUser(phone: string) { return prisma.user.findFirst({ where: { phone: { contains: phone.slice(-9) } }, select: { id: true, name: true, officialName: true } }); }
async function conversationFor(phone: string, displayName?: string) {
  const user = await matchUser(phone);
  return prisma.whatsAppCloudConversation.upsert({ where: { normalizedPhone: phone }, create: { normalizedPhone: phone, displayName: displayName || user?.officialName || user?.name || null, linkedUserId: user?.id }, update: { ...(displayName ? { displayName } : {}), ...(user?.id ? { linkedUserId: user.id } : {}) } });
}
function statusUpdate(status: "SENT" | "DELIVERED" | "READ" | "FAILED", at: Date) { return status === "SENT" ? { sentAt: at } : status === "DELIVERED" ? { deliveredAt: at } : status === "READ" ? { readAt: at } : { failedAt: at }; }

export async function persistWebhookEvent(event: NormalizedWebhookEvent) {
  const phone = safePhone(event.phone); if (!phone) return;
  try { await prisma.whatsAppCloudMessageEvent.create({ data: { providerMessageId: event.providerMessageId, eventType: event.kind, status: event.status || "RECEIVED", eventAt: event.timestamp, errorCode: event.errorCode || null, safeErrorMessage: event.errorMessage || null, fingerprint: event.fingerprint } }); } catch { return; }
  if (event.kind === "inbound") {
    const conversation = await conversationFor(phone, event.displayName);
    const user = conversation.linkedUserId;
    await prisma.whatsAppCloudMessage.create({ data: { conversationId: conversation.id, linkedUserId: user, direction: "INBOUND", status: "RECEIVED", type: event.type, normalizedSender: phone, normalizedRecipient: "", providerMessageId: event.providerMessageId, bodyPreview: event.bodyPreview || null, unsupportedMetadata: event.type === "UNSUPPORTED" ? { providerType: "unsupported" } : undefined, sentAt: event.timestamp } });
    await prisma.whatsAppCloudConversation.update({ where: { id: conversation.id }, data: { lastMessagePreview: event.bodyPreview || "[محتوى غير مدعوم]", lastMessageAt: event.timestamp, lastInboundAt: event.timestamp, unreadCount: { increment: 1 } } });
    const optOut = /^(stop|unsubscribe|إلغاء|الغاء|إيقاف|ايقاف)$/i.test((event.bodyPreview || "").trim());
    if (optOut) await prisma.whatsAppContactConsent.upsert({ where: { normalizedPhone: phone }, create: { normalizedPhone: phone, linkedUserId: user, marketingOptIn: false, consentRevokedAt: event.timestamp, consentSource: "INBOUND_OPT_OUT" }, update: { marketingOptIn: false, consentRevokedAt: event.timestamp, consentSource: "INBOUND_OPT_OUT" } });
    return;
  }
  const message = await prisma.whatsAppCloudMessage.findUnique({ where: { providerMessageId: event.providerMessageId } }); if (!message || !event.status) return;
  if (event.status !== "FAILED" && statusRank[event.status] < statusRank[message.status]) return;
  const update = { status: event.status, ...statusUpdate(event.status, event.timestamp), ...(event.status === "FAILED" ? { providerErrorCode: event.errorCode || null, providerErrorMessage: event.errorMessage || null } : {}) };
  const updated = await prisma.whatsAppCloudMessage.update({ where: { id: message.id }, data: update });
  await prisma.whatsAppCloudMessageEvent.updateMany({ where: { fingerprint: event.fingerprint }, data: { messageId: updated.id } });
}

export async function sendCloudMessage(input: { phone: string; kind: "template" | "text"; templateName?: string; language?: string; parameters?: string[]; body?: string; actorUserId?: string; campaignId?: string; idempotencyKey: string }) {
  const phone = safePhone(input.phone); if (!phone) return { ok: false as const, error: "رقم واتساب سعودي صالح مطلوب." };
  const existing = await prisma.whatsAppCloudMessage.findUnique({ where: { idempotencyKey: input.idempotencyKey } }); if (existing) return { ok: true as const, message: existing, duplicate: true };
  const conversation = await conversationFor(phone); const user = conversation.linkedUserId;
  if (input.kind === "text" && (!conversation.lastInboundAt || Date.now() - conversation.lastInboundAt.getTime() > 24 * 60 * 60 * 1000)) return { ok: false as const, error: "انتهت نافذة المحادثة؛ استخدم قالب Meta معتمدًا." };
  const created = await prisma.whatsAppCloudMessage.create({ data: { conversationId: conversation.id, linkedUserId: user, campaignId: input.campaignId || null, direction: "OUTBOUND", status: "QUEUED", type: input.kind === "template" ? "TEMPLATE" : "TEXT", normalizedSender: "", normalizedRecipient: phone, idempotencyKey: input.idempotencyKey, templateName: input.templateName || null, templateLanguage: input.language || null, templateParameters: input.parameters || undefined, bodyPreview: input.kind === "text" ? input.body?.slice(0, 4000) || null : `[قالب] ${input.templateName || ""}`, queuedAt: new Date() } });
  const result = input.kind === "template" ? await sendTemplateMessage({ to: phone, name: input.templateName || "", language: input.language || "ar", parameters: input.parameters }) : await sendTextMessage({ to: phone, body: input.body || "" });
  const now = new Date(); const message = await prisma.whatsAppCloudMessage.update({ where: { id: created.id }, data: result.success ? { status: "SENT", providerMessageId: result.messageId || null, sentAt: now } : { status: "FAILED", failedAt: now, providerErrorCode: result.errorCode || null, providerErrorMessage: result.errorMessage || null } });
  await prisma.whatsAppCloudConversation.update({ where: { id: conversation.id }, data: { lastMessagePreview: message.bodyPreview, lastMessageAt: now } });
  return result.success ? { ok: true as const, message, duplicate: false } : { ok: false as const, error: result.errorMessage || "تعذر إرسال الرسالة.", message };
}

export async function markConversationRead(id: string) { return prisma.whatsAppCloudConversation.update({ where: { id }, data: { unreadCount: 0, lastReadAt: new Date() } }); }
