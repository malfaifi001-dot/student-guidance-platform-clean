"use client";

import { useMemo, useState } from "react";
import {
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";

const SUPPORT_EMAIL = "support@teachix.sa";
const WHATSAPP_NUMBER = "966500000000";

type ContactState = {
  name: string;
  email: string;
  phone: string;
  requestType: string;
  subject: string;
  message: string;
};

const initialState: ContactState = {
  name: "",
  email: "",
  phone: "",
  requestType: "استفسار عام",
  subject: "",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState<ContactState>(initialState);
  const [feedback, setFeedback] = useState("");

  const whatsappText = useMemo(() => {
    return [
      "مرحبًا Teachix،",
      "",
      `الاسم: ${form.name || "-"}`,
      `البريد الإلكتروني: ${form.email || "-"}`,
      `رقم الجوال: ${form.phone || "-"}`,
      `نوع الطلب: ${form.requestType || "-"}`,
      `الموضوع: ${form.subject || "-"}`,
      "",
      "الرسالة:",
      form.message || "-",
    ].join("\n");
  }, [form]);

  function updateField<K extends keyof ContactState>(
    key: K,
    value: ContactState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (feedback) {
      setFeedback("");
    }
  }

  function validate() {
    if (!form.name.trim()) {
      setFeedback("اكتب الاسم أولًا.");
      return false;
    }

    if (!form.email.trim()) {
      setFeedback("اكتب البريد الإلكتروني.");
      return false;
    }

    if (!form.subject.trim()) {
      setFeedback("اكتب موضوع الرسالة.");
      return false;
    }

    if (!form.message.trim()) {
      setFeedback("اكتب تفاصيل الرسالة.");
      return false;
    }

    return true;
  }

  function sendByEmail() {
    if (!validate()) {
      return;
    }

    const body = [
      `الاسم: ${form.name}`,
      `البريد: ${form.email}`,
      `الجوال: ${form.phone || "-"}`,
      `نوع الطلب: ${form.requestType}`,
      "",
      form.message,
    ].join("\n");

    const href =
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(`[Teachix] ${form.subject}`)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = href;
  }

  function sendByWhatsApp() {
    if (!validate()) {
      return;
    }

    const href =
      `https://wa.me/${WHATSAPP_NUMBER}` +
      `?text=${encodeURIComponent(whatsappText)}`;

    const opened = window.open(
      href,
      "_blank",
      "noopener,noreferrer",
    );

    if (!opened) {
      setFeedback(
        "تعذر فتح واتساب. تحقق من السماح بالنوافذ المنبثقة ثم حاول مرة أخرى.",
      );
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_0.72fr] lg:gap-16">
      <div className="rounded-[30px] border border-slate-200 bg-white p-6 sm:p-8 lg:p-10">
        <div>
          <p className="text-sm font-black text-sky-600">
            أرسل لنا رسالة
          </p>

          <h2 className="mt-3 text-3xl font-black text-slate-950">
            كيف يمكننا مساعدتك؟
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
            اكتب تفاصيل طلبك وسنوجّهك إلى وسيلة التواصل المناسبة.
          </p>
        </div>

        <div className="mt-9 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-slate-700">
              الاسم
            </span>

            <input
              value={form.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              placeholder="الاسم الكامل"
              className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">
              البريد الإلكتروني
            </span>

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                updateField("email", event.target.value)
              }
              placeholder="name@example.com"
              dir="ltr"
              className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">
              رقم الجوال
            </span>

            <input
              value={form.phone}
              onChange={(event) =>
                updateField("phone", event.target.value)
              }
              placeholder="05xxxxxxxx"
              dir="ltr"
              className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">
              نوع الطلب
            </span>

            <select
              value={form.requestType}
              onChange={(event) =>
                updateField("requestType", event.target.value)
              }
              className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
            >
              <option>استفسار عام</option>
              <option>الدعم الفني</option>
              <option>الحساب والاشتراك</option>
              <option>اقتراح أو ملاحظة</option>
              <option>طلب متعلق بالخصوصية</option>
              <option>بلاغ أو شكوى</option>
            </select>
          </label>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-black text-slate-700">
            الموضوع
          </span>

          <input
            value={form.subject}
            onChange={(event) =>
              updateField("subject", event.target.value)
            }
            placeholder="اكتب موضوع الرسالة"
            className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-sm font-black text-slate-700">
            الرسالة
          </span>

          <textarea
            value={form.message}
            onChange={(event) =>
              updateField("message", event.target.value)
            }
            placeholder="اكتب تفاصيل طلبك..."
            rows={7}
            className="mt-2.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
          />
        </label>

        {feedback ? (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {feedback}
          </div>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={sendByWhatsApp}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-sm font-black text-white transition hover:bg-sky-700"
          >
            <MessageCircle className="h-4 w-4" />
            إرسال عبر واتساب
          </button>

          <button
            type="button"
            onClick={sendByEmail}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Send className="h-4 w-4" />
            إرسال عبر البريد
          </button>
        </div>
      </div>

      <aside className="lg:pt-10">
        <p className="text-sm font-black text-sky-600">
          تواصل مباشر
        </p>

        <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
          نحن هنا لمساعدتك.
        </h2>

        <p className="mt-5 text-base leading-8 text-slate-500">
          للاستفسارات المتعلقة بالمنصة أو الحساب أو الدعم الفني،
          استخدم النموذج أو تواصل معنا مباشرة.
        </p>

        <div className="mt-10 space-y-4">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sky-200"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <MessageCircle className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black text-slate-950">
                واتساب
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400" dir="ltr">
                +966 50 000 0000
              </p>
            </div>
          </a>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sky-200"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Mail className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black text-slate-950">
                البريد الإلكتروني
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400" dir="ltr">
                support@teachix.sa
              </p>
            </div>
          </a>
        </div>

        <div className="mt-8 rounded-[26px] bg-slate-50 p-6">
          <p className="text-sm font-black text-slate-950">
            طلبات الخصوصية
          </p>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            يمكنك استخدام نفس النموذج لطلبات الوصول إلى بياناتك
            أو تصحيحها أو حذفها أو أي طلب آخر متعلق بالخصوصية.
          </p>
        </div>
      </aside>
    </div>
  );
}