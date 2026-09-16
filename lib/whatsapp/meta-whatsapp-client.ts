import "server-only";
import { getMetaWhatsAppConfig } from "@/lib/whatsapp/meta-whatsapp-config";

type SafeResult = { success: boolean; provider: "META"; messageId?: string; errorCode?: string; errorMessage?: string };
const clean = (value: unknown, max = 1000) => String(value || "").replace(/[\r\n]+/g, " ").slice(0, max);

async function metaFetch(path: string, init: RequestInit) {
  const config = getMetaWhatsAppConfig();
  if (!config.accessToken) return { ok: false, code: "CONFIGURATION_MISSING", message: "إعداد رمز وصول Meta غير مكتمل." };
  const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error as Record<string, unknown> | undefined;
    return { ok: false, code: clean(error?.code || response.status, 120), message: clean(error?.message || "تعذر الاتصال بخدمة Meta.") };
  }
  return { ok: true, payload };
}

export async function sendTemplateMessage(input: { to: string; name: string; language: string; parameters?: string[] }): Promise<SafeResult> {
  const config = getMetaWhatsAppConfig();
  if (!config.phoneNumberId) return { success: false, provider: "META", errorCode: "CONFIGURATION_MISSING", errorMessage: "معرّف رقم واتساب غير مهيأ." };
  const components = input.parameters?.length ? [{ type: "body", parameters: input.parameters.map((text) => ({ type: "text", text })) }] : [];
  const result = await metaFetch(`${config.phoneNumberId}/messages`, { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", to: input.to, type: "template", template: { name: input.name, language: { code: input.language }, components } }) });
  if (!result.ok) return { success: false, provider: "META", errorCode: result.code, errorMessage: result.message };
  const messages = (result.payload!.messages || []) as Array<{ id?: string }>;
  return { success: true, provider: "META", messageId: clean(messages[0]?.id, 255) || undefined };
}

export async function sendTextMessage(input: { to: string; body: string }): Promise<SafeResult> {
  const config = getMetaWhatsAppConfig();
  if (!config.phoneNumberId) return { success: false, provider: "META", errorCode: "CONFIGURATION_MISSING", errorMessage: "معرّف رقم واتساب غير مهيأ." };
  const result = await metaFetch(`${config.phoneNumberId}/messages`, { method: "POST", body: JSON.stringify({ messaging_product: "whatsapp", to: input.to, type: "text", text: { body: input.body, preview_url: false } }) });
  if (!result.ok) return { success: false, provider: "META", errorCode: result.code, errorMessage: result.message };
  const messages = (result.payload!.messages || []) as Array<{ id?: string }>;
  return { success: true, provider: "META", messageId: clean(messages[0]?.id, 255) || undefined };
}

export async function fetchMetaTemplates() {
  const config = getMetaWhatsAppConfig();
  if (!config.businessAccountId) return { success: false as const, errorCode: "CONFIGURATION_MISSING", errorMessage: "معرّف حساب أعمال واتساب غير مهيأ." };
  const result = await metaFetch(`${config.businessAccountId}/message_templates?limit=250`, { method: "GET" });
  if (!result.ok) return { success: false as const, errorCode: result.code, errorMessage: result.message };
  return { success: true as const, templates: Array.isArray(result.payload!.data) ? result.payload!.data as Record<string, unknown>[] : [] };
}
