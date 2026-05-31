"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserCheck,
  WalletCards,
  XCircle,
} from "lucide-react";

type ActivationData = {
  codes: Array<{
    id: string;
    code: string;
    label: string | null;
    durationDays: number;
    maxUses: number;
    usedCount: number;
    isActive: boolean;
    createdAt: string;
  }>;
  requests: Array<{
    id: string;
    schoolAccountId: string;
    amount: number;
    currency: string;
    senderName: string | null;
    receiptUrl: string | null;
    status: string;
    adminNote: string | null;
    createdAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    endsAt: string | null;
    schoolAccount: {
      id: string;
      name: string;
      slug: string;
    };
    plan: {
      name: string;
    };
  }>;
  schools: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export function AdminActivationsCenter() {
  const [data, setData] = useState<ActivationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [maxUses, setMaxUses] = useState("1");
  const [manualSchoolAccountId, setManualSchoolAccountId] = useState("");
  const [manualDays, setManualDays] = useState("30");
  const [message, setMessage] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [requestDays, setRequestDays] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/activations/codes");
    const result = await response.json();

    if (response.ok) {
      setData(result);
    } else {
      setMessage(result.error || "تعذر تحميل لوحة التفعيلات.");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCode() {
    const response = await fetch("/api/dashboard/admin/activations/codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label,
        durationDays,
        maxUses,
      }),
    });

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");

    if (response.ok) {
      setLabel("");
      await load();
    }
  }

  async function manualActivate() {
    const response = await fetch("/api/dashboard/admin/activations/manual", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schoolAccountId: manualSchoolAccountId,
        days: manualDays,
      }),
    });

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");

    if (response.ok) {
      await load();
    }
  }

  async function approveRequest(id: string) {
    setProcessingRequestId(id);

    const response = await fetch(
      `/api/dashboard/admin/activations/bank-transfer/${id}/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          days: Number(requestDays[id] || 30),
        }),
      }
    );

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    setProcessingRequestId(null);
    await load();
  }

  async function cancelActivation(subscriptionId: string) {
    const response = await fetch("/api/dashboard/admin/activations/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptionId,
      }),
    });

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    await load();
  }

  async function rejectRequest(id: string) {
    setProcessingRequestId(id);

    const response = await fetch(
      `/api/dashboard/admin/activations/bank-transfer/${id}/reject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: rejectReason[id] || "تم رفض الطلب من لوحة الأدمن.",
        }),
      }
    );

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    setProcessingRequestId(null);
    await load();
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جار تحميل التفعيلات...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-5" dir="rtl">
      <section className="rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-sky-700 shadow-sm">
          <ShieldCheck className="h-4 w-4" />
          Admin Activation Center
        </div>

        <h1 className="mt-3 text-3xl font-black text-slate-950">
          إدارة التفعيلات
        </h1>

        <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
          من هنا يتحكم الأدمن في أكواد التفعيل، طلبات التحويل البنكي، والتفعيل
          اليدوي لأي حساب.
        </p>
      </section>

      {message ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-[14px] font-bold text-sky-700">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
              <KeyRound className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                إنشاء كود تفعيل
              </h2>
              <p className="mt-1 text-[13px] font-bold text-slate-500">
                أعطه للموجه ويستطيع تفعيل حسابه مباشرة.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="وصف الكود"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />

            <input
              value={durationDays}
              onChange={(event) => setDurationDays(event.target.value)}
              placeholder="مدة التفعيل بالأيام"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />

            <input
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              placeholder="عدد الاستخدامات"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />
          </div>

          <button
            type="button"
            onClick={createCode}
            className="mt-4 h-12 w-full rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
          >
            إنشاء كود
          </button>
        </div>

        <div className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UserCheck className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                تفعيل يدوي
              </h2>
              <p className="mt-1 text-[13px] font-bold text-slate-500">
                استخدمه إذا تواصل الموجه معك عبر واتساب أو اتصال.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_160px]">
            <select
              value={manualSchoolAccountId}
              onChange={(event) => setManualSchoolAccountId(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            >
              <option value="">اختر الحساب</option>
              {data?.schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>

            <input
              value={manualDays}
              onChange={(event) => setManualDays(event.target.value)}
              placeholder="الأيام"
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />
          </div>

          <button
            type="button"
            onClick={manualActivate}
            className="mt-4 h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700"
          >
            تفعيل الحساب
          </button>
        </div>
      </section>

      <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">
          طلبات التحويل البنكي
        </h2>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                <th className="p-3">المحوّل</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">الملاحظة/المرجع</th>
                <th className="p-3">الإجراء</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data?.requests.map((request) => (
                <tr key={request.id}>
                  <td className="p-3 font-bold text-slate-800">
                    {request.senderName || "بدون اسم"}
                  </td>
                  <td className="p-3 font-bold text-slate-600">
                    {request.amount} {request.currency}
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                      {request.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-bold text-slate-500">
                    {request.receiptUrl || request.adminNote || "—"}
                  </td>
                  <td className="p-3">
                    {request.status === "PENDING" ? (
                      <div className="min-w-[320px] rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="grid gap-2 md:grid-cols-[90px_1fr]">
                          <input
                            value={requestDays[request.id] || "30"}
                            onChange={(event) =>
                              setRequestDays((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="الأيام"
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-center text-xs font-black text-slate-700 outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
                          />

                          <input
                            value={rejectReason[request.id] || ""}
                            onChange={(event) =>
                              setRejectReason((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="سبب الرفض اختياري"
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
                          />
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={processingRequestId === request.id}
                            onClick={() => approveRequest(request.id)}
                            className="h-10 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {processingRequestId === request.id ? "جار التنفيذ..." : "قبول وتفعيل"}
                          </button>

                          <button
                            type="button"
                            disabled={processingRequestId === request.id}
                            onClick={() => rejectRequest(request.id)}
                            className="h-10 rounded-xl bg-rose-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            رفض الطلب
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-400">
                        تمت المعالجة
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {data?.requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-400">
                    لا توجد طلبات تحويل.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">أكواد التفعيل</h2>

          <div className="mt-4 space-y-2">
            {data?.codes.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"
              >
                <div>
                  <p className="font-mono text-sm font-black text-slate-950">
                    {item.code}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {item.durationDays} يوم · استخدم {item.usedCount}/{item.maxUses}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(item.code)}
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            الحسابات المفعلة
          </h2>

          <div className="mt-4 space-y-2">
            {data?.subscriptions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"
              >
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {item.schoolAccount.name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {item.plan.name} · ينتهي:{" "}
                    {item.endsAt
                      ? new Date(item.endsAt).toLocaleDateString("ar-SA")
                      : "غير محدد"}
                  </p>
                </div>

                {item.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => cancelActivation(item.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100"
                    title="إلغاء التفعيل"
                  >
                    <XCircle className="h-4 w-4" />
                    إلغاء التفعيل
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-400">
                    <XCircle className="h-4 w-4" />
                    غير مفعل
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
