"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Save, Send, X } from "lucide-react";

import { SmartActionModal } from "@/components/ui/smart-action-modal";
import {
  findUnsupportedWhatsAppTemplateTokens,
  renderWhatsAppTemplate,
  validateWhatsAppTemplateInput,
  WHATSAPP_TEMPLATE_VARIABLES,
} from "@/lib/whatsapp/message-template";

export type WhatsAppMessageTemplateRecord = {
  id: string;
  name: string;
  content: string;
  coupon: string | null;
  isActive: boolean;
  status: "ACTIVE" | "DRAFT";
};

const DEFAULT_CONTENT = `مرحباً أ. {name}

يسعدنا تواصلك مع Teachix.

الدور: {role}
كوبون التفعيل: {coupon}

فريق Teachix`;

export function WhatsAppMessageTemplateModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (template: WhatsAppMessageTemplateRecord) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [name, setName] = useState("رسالة العضوية");
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [coupon, setCoupon] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "DRAFT" | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setFeedback("");
      setError("");
      setLoadingTemplate(true);
      void fetch("/api/dashboard/admin/user-whatsapp/template", { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json() as { template?: WhatsAppMessageTemplateRecord | null; error?: string };
          if (!response.ok) throw new Error(payload.error || "تعذر تحميل الرسالة.");
          if (cancelled || !payload.template) return;
          setName(payload.template.name);
          setContent(payload.template.content);
          setCoupon(payload.template.coupon || "");
          setStatus(payload.template.status);
        })
        .catch((cause) => {
          if (!cancelled) setError(cause instanceof Error ? cause.message : "تعذر تحميل الرسالة.");
        })
        .finally(() => {
          if (!cancelled) setLoadingTemplate(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open]);

  function insertVariable(token: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}${current.endsWith(" ") ? "" : " "}${token}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}${token}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function save(action: "save" | "activate") {
    setFeedback("");
    setError("");
    const validation = validateWhatsAppTemplateInput({ name, content, coupon });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/admin/user-whatsapp/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content, coupon, action }),
      });
      const payload = await response.json() as { template?: WhatsAppMessageTemplateRecord; error?: string };
      if (!response.ok || !payload.template) throw new Error(payload.error || "تعذر حفظ الرسالة. حاول مرة أخرى.");
      setStatus(payload.template.status);
      onSaved(payload.template);
      setFeedback(action === "activate" ? "تم اعتماد الرسالة للاستخدام" : "تم حفظ الرسالة بنجاح");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الرسالة. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  const unsupported = findUnsupportedWhatsAppTemplateTokens(content);
  const preview = renderWhatsAppTemplate(content, {
    name: "حورية الفيفي",
    role: "معلم",
    phone: "0551234567",
    coupon,
  });

  return (
    <SmartActionModal
      open={open}
      title="إعداد رسالة الإرسال"
      description="اكتب الرسالة التي سيستخدمها زر إرسال الرسالة للمستخدمين."
      variant="info"
      portal
      showFooter={false}
      onClose={onClose}
    >
      <div className="space-y-4">
        {loadingTemplate ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل الرسالة...
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="text-xs font-black text-slate-700">اسم القالب</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white" />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-black text-slate-700">نص الرسالة</span>
          <textarea ref={textareaRef} value={content} onChange={(event) => setContent(event.target.value)} rows={9} maxLength={8000} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium leading-7 outline-none focus:border-sky-400 focus:bg-white" />
        </label>

        <div className="space-y-2">
          <p className="text-xs font-black text-slate-700">المتغيرات المدعومة</p>
          <div className="flex flex-wrap gap-2">
            {WHATSAPP_TEMPLATE_VARIABLES.map((item) => (
              <button key={item.key} type="button" onClick={() => insertVariable(item.token)} className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700 hover:bg-sky-100">
                <Plus className="h-3 w-3" /> {item.token} {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-black text-slate-700">كوبون التفعيل</span>
          <input value={coupon} onChange={(event) => setCoupon(event.target.value)} maxLength={160} dir="ltr" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white" placeholder="Welcome" />
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-black text-slate-700">معاينة الرسالة</p>
            {status ? <span className={`rounded-full px-2 py-1 text-[10px] font-black ${status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{status === "ACTIVE" ? "معتمدة" : "مسودة"}</span> : null}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{preview}</p>
        </div>

        {unsupported.length ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">يوجد متغير غير مدعوم: {unsupported.join(", ")}</p> : null}
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
        {feedback ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{feedback}</p> : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => void save("save")} disabled={loading || loadingTemplate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Save className="h-4 w-4" /> حفظ</button>
          <button type="button" onClick={() => void save("activate")} disabled={loading || loadingTemplate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-50"><Send className="h-4 w-4" /> حفظ واعتماد</button>
          <button type="button" onClick={onClose} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X className="h-4 w-4" /> إغلاق</button>
        </div>
      </div>
    </SmartActionModal>
  );
}
