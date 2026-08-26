export const WHATSAPP_TEMPLATE_VARIABLES = [
  { key: "name", token: "{name}", label: "اسم المستخدم" },
  { key: "role", token: "{role}", label: "الدور" },
  { key: "phone", token: "{phone}", label: "رقم الجوال" },
  { key: "coupon", token: "{coupon}", label: "كوبون التفعيل" },
] as const;

export type WhatsAppTemplateContext = {
  name: string;
  role: string;
  phone: string;
  coupon: string;
};

const SUPPORTED_TOKENS: Set<string> = new Set(WHATSAPP_TEMPLATE_VARIABLES.map((item) => item.token));

export function findUnsupportedWhatsAppTemplateTokens(content: string) {
  const tokens = content.match(/\{[^{}]+\}/g) || [];
  return [...new Set(tokens.filter((token) => !SUPPORTED_TOKENS.has(token)))];
}

export function validateWhatsAppTemplateInput(input: { name: string; content: string; coupon?: string | null }) {
  const name = input.name.trim();
  const content = input.content.trim();
  const coupon = String(input.coupon || "").trim();

  if (!name) return { ok: false as const, error: "اسم القالب مطلوب." };
  if (name.length > 160) return { ok: false as const, error: "اسم القالب طويل جدًا." };
  if (!content) return { ok: false as const, error: "نص الرسالة مطلوب." };
  if (content.length > 8000) return { ok: false as const, error: "نص الرسالة يتجاوز الحد المسموح." };
  if (coupon.length > 160) return { ok: false as const, error: "كوبون التفعيل طويل جدًا." };

  const unsupported = findUnsupportedWhatsAppTemplateTokens(content);
  if (unsupported.length) {
    return { ok: false as const, error: `يوجد متغير غير مدعوم: ${unsupported.join(", ")}` };
  }

  return { ok: true as const, name, content, coupon };
}

export function renderWhatsAppTemplate(content: string, context: WhatsAppTemplateContext) {
  const values: Record<string, string> = {
    "{name}": context.name,
    "{role}": context.role,
    "{phone}": context.phone,
    "{coupon}": context.coupon,
  };

  return content.replace(/\{name\}|\{role\}|\{phone\}|\{coupon\}/g, (token) => values[token] || "");
}

export function getArabicWhatsAppRoleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMIN: "مدير المنصة",
    COUNSELOR: "الموجه الطلابي",
    ACTIVITY_LEADER: "رائد النشاط",
    TEACHER: "معلم",
    PRINCIPAL: "مدير المدرسة",
    SCHOOL_OWNER: "مالك الحساب",
    STAFF: "موظف",
  };
  return labels[role] || role;
}
