"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  KeyRound,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

type SubscriptionOverview = {
  subscription: {
    status: string;
    startsAt: string;
    endsAt: string | null;
    planName: string;
  };
  remainingDays: number | null;
  pendingBankRequests: number;
  usable: boolean;
};

function getStatusLabel(status?: string) {
  if (status === "TRIAL") return "تجربة مجانية";
  if (status === "ACTIVE") return "مفعل";
  if (status === "EXPIRED") return "يحتاج تفعيل";
  if (status === "CANCELED") return "متوقف";
  if (status === "PAST_DUE") return "بانتظار تأكيد الدفع";

  return "غير معروف";
}

export function CounselorActivationCenter() {
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("99");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadOverview() {
    setLoading(true);

    const response = await fetch("/api/dashboard/subscription");
    const data = await response.json();

    if (response.ok) {
      setOverview(data);
    } else {
      setMessage({
        type: "error",
        text: data.error || "تعذر تحميل حالة التفعيل.",
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function redeemCode() {
    setSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/dashboard/subscription/redeem-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setCode("");
      setMessage({
        type: "success",
        text: data.message || "تم تفعيل الحساب.",
      });
      await loadOverview();
    } else {
      setMessage({
        type: "error",
        text: data.error || "تعذر تفعيل الكود.",
      });
    }

    setSubmitting(false);
  }

  async function submitBankTransfer() {
    setSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/dashboard/subscription/bank-transfer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        senderName,
        phone,
        amount,
        receiptUrl,
        note,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setSenderName("");
      setPhone("");
      setReceiptUrl("");
      setNote("");
      setMessage({
        type: "success",
        text: data.message || "تم إرسال طلبك.",
      });
      await loadOverview();
    } else {
      setMessage({
        type: "error",
        text: data.error || "تعذر إرسال طلب التفعيل.",
      });
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جار تحميل حالة التفعيل...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-5" dir="rtl">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 shadow-sm">
        <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />

        <div className="relative z-10 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-sky-700 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              التفعيل
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              حالة الحساب وطريقة التفعيل
            </h1>

            <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
              لا تحتاج مصطلحات معقدة. حسابك إما يعمل الآن، أو يحتاج تفعيل
              للاستمرار في إنشاء الحالات والتقارير.
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[12px] font-black text-slate-400">
              حالة الحساب
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div
                className={[
                  "grid h-12 w-12 place-items-center rounded-2xl",
                  overview?.usable
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {overview?.usable ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {getStatusLabel(overview?.subscription.status)}
                </h2>

                <p className="mt-1 text-[13px] font-bold text-slate-500">
                  {overview?.remainingDays !== null
                    ? `متبقي ${overview?.remainingDays} يوم`
                    : "غير محدد المدة"}
                </p>
              </div>
            </div>

            {overview?.pendingBankRequests ? (
              <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-[13px] font-bold leading-6 text-amber-800">
                لديك طلب تحويل قيد المراجعة لدى الأدمن.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {message ? (
        <div
          className={[
            "rounded-2xl border px-4 py-3 text-[14px] font-bold",
            message.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : message.type === "error"
                ? "border-rose-100 bg-rose-50 text-rose-700"
                : "border-sky-100 bg-sky-50 text-sky-700",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
              <KeyRound className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                إدخال كود تفعيل
              </h2>
              <p className="mt-1 text-[13px] font-bold leading-6 text-slate-500">
                إذا وصلك كود من الأدمن أو الدعم، أدخله هنا وسيتم التفعيل مباشرة.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="مثال: RSHD-2026-ABC123"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />

            <button
              type="button"
              onClick={redeemCode}
              disabled={submitting}
              className="h-12 w-full rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700 disabled:opacity-60"
            >
              {submitting ? "جار التفعيل..." : "تفعيل الحساب بالكود"}
            </button>
          </div>
        </div>

        <div className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UploadCloud className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                طلب تفعيل بتحويل بنكي
              </h2>
              <p className="mt-1 text-[13px] font-bold leading-6 text-slate-500">
                اكتب بيانات التحويل، وسيقوم الأدمن بالمراجعة والتفعيل.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input
              value={senderName}
              onChange={(event) => setSenderName(event.target.value)}
              placeholder="اسم المحوّل"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />

            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="رقم الجوال"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />

            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="المبلغ"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />

            <input
              value={receiptUrl}
              onChange={(event) => setReceiptUrl(event.target.value)}
              placeholder="رابط أو رقم مرجع الإيصال"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="ملاحظة اختيارية"
              className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50 md:col-span-2"
            />
          </div>

          <button
            type="button"
            onClick={submitBankTransfer}
            disabled={submitting}
            className="mt-4 h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "جار الإرسال..." : "إرسال طلب التفعيل"}
          </button>
        </div>
      </section>

      <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
            <CreditCard className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-950">
              ماذا يشمل التفعيل؟
            </h2>

            <div className="mt-3 grid gap-2 text-[14px] font-bold text-slate-600 md:grid-cols-2">
              <span>• توثيق الحالات والخدمات الإرشادية</span>
              <span>• إصدار التقارير الرسمية</span>
              <span>• رفع الشواهد وربطها بالحالة</span>
              <span>• حفظ بيانات الطلاب وملفاتهم</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
