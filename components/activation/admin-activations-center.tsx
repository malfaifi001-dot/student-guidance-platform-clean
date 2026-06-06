"use client";

import { useEffect, useMemo, useState } from "react";
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
import { SmartActionModal } from "@/components/ui/smart-action-modal";

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
    planId?: string | null;
    durationDays?: number | null;
    billingCycle?: string | null;
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
  plans: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type ModalState = {
  open: boolean;
  title: string;
  description?: string;
  variant?: "info" | "success" | "warning" | "danger" | "error";
  confirmLabel?: string;
  run?: () => Promise<void>;
};

async function readApiResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function statusLabel(status: string) {
  if (status === "PENDING") return "معلق";
  if (status === "PAID") return "مقبول";
  if (status === "FAILED") return "مرفوض";
  if (status === "ACTIVE") return "نشط";
  if (status === "TRIAL") return "تجربة";
  if (status === "CANCELED") return "ملغي";
  if (status === "EXPIRED") return "منتهي";
  return status;
}

function statusClass(status: string) {
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "PAID" || status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED" || status === "CANCELED" || status === "EXPIRED") return "bg-rose-50 text-rose-700";
  return "bg-slate-50 text-slate-500";
}

export function AdminActivationsCenter() {
  const [data, setData] = useState<ActivationData | null>(null);
  const [loading, setLoading] = useState(true);

  const [label, setLabel] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [maxUses, setMaxUses] = useState("1");

  const [manualSchoolAccountId, setManualSchoolAccountId] = useState("");
  const [manualPlanId, setManualPlanId] = useState("");
  const [manualDays, setManualDays] = useState("30");

  const [processing, setProcessing] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [requestDays, setRequestDays] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const [modal, setModal] = useState<ModalState>({
    open: false,
    title: "",
  });

  const planNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const plan of data?.plans || []) {
      map.set(plan.id, plan.name);
    }
    return map;
  }, [data?.plans]);

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/activations/codes", {
      cache: "no-store",
    });
    const result = await readApiResponse(response);

    if (response.ok) {
      setData({
        codes: result.codes || [],
        requests: result.requests || [],
        subscriptions: result.subscriptions || [],
        schools: result.schools || [],
        plans: result.plans || [],
      });
    } else {
      showResult("تعذر تحميل لوحة التفعيلات", result.error || "حدث خطأ أثناء تحميل البيانات.", "error");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function closeModal() {
    if (processing) return;
    setModal({ open: false, title: "" });
  }

  function showResult(
    title: string,
    description: string,
    variant: "success" | "error" | "info" | "warning" = "success"
  ) {
    setModal({
      open: true,
      title,
      description,
      variant,
      confirmLabel: "تم",
    });
  }

  function confirmAction(input: {
    title: string;
    description: string;
    variant?: "info" | "warning" | "danger";
    confirmLabel?: string;
    run: () => Promise<void>;
  }) {
    setModal({
      open: true,
      title: input.title,
      description: input.description,
      variant: input.variant || "info",
      confirmLabel: input.confirmLabel || "تأكيد",
      run: input.run,
    });
  }

  async function runModalAction() {
    if (!modal.run) return;

    setProcessing(true);

    try {
      await modal.run();
    } finally {
      setProcessing(false);
    }
  }

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

    const result = await readApiResponse(response);

    if (!response.ok) {
      showResult("تعذر إنشاء الكود", result.error || "لم يتم إنشاء كود التفعيل.", "error");
      return;
    }

    setLabel("");
    await load();

    showResult(
      "تم إنشاء كود التفعيل",
      result.message || "تم إنشاء الكود بنجاح، ويمكنك نسخه من القائمة.",
      "success"
    );
  }

  async function manualActivate() {
    const response = await fetch("/api/dashboard/admin/activations/manual", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schoolAccountId: manualSchoolAccountId,
        planId: manualPlanId,
        days: manualDays,
      }),
    });

    const result = await readApiResponse(response);

    if (!response.ok) {
      showResult("تعذر التفعيل اليدوي", result.error || "لم يتم تفعيل الحساب.", "error");
      return;
    }

    await load();

    showResult(
      "تم تفعيل الحساب",
      result.message || "تم تفعيل الباقة للحساب بنجاح.",
      "success"
    );
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
          days: Number(requestDays[id] || 0),
        }),
      }
    );

    const result = await readApiResponse(response);
    setProcessingRequestId(null);

    if (!response.ok) {
      showResult("تعذر قبول التحويل", result.error || "لم يتم قبول الطلب.", "error");
      return;
    }

    await load();

    showResult(
      "تم قبول التحويل",
      result.message || "تم قبول التحويل وتفعيل الباقة.",
      "success"
    );
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

    const result = await readApiResponse(response);
    setProcessingRequestId(null);

    if (!response.ok) {
      showResult("تعذر رفض الطلب", result.error || "لم يتم رفض الطلب.", "error");
      return;
    }

    await load();

    showResult(
      "تم رفض الطلب",
      result.message || "تم رفض طلب التحويل وحفظ السبب.",
      "success"
    );
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

    const result = await readApiResponse(response);

    if (!response.ok) {
      showResult("تعذر إلغاء التفعيل", result.error || "لم يتم إلغاء التفعيل.", "error");
      return;
    }

    await load();

    showResult(
      "تم إلغاء التفعيل",
      result.message || "تم إلغاء الاشتراك وتعطيل الخدمات.",
      "success"
    );
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center" dir="rtl">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جار تحميل التفعيلات...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-5" dir="rtl">
      <SmartActionModal
        open={modal.open}
        title={modal.title}
        description={modal.description}
        variant={modal.variant}
        confirmLabel={modal.confirmLabel}
        loading={processing}
        onConfirm={modal.run ? runModalAction : undefined}
        onClose={closeModal}
      />

      <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 shadow-sm">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-sky-100/80 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-sky-700 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            Admin Activation Center
          </div>

          <h1 className="mt-3 text-3xl font-black text-slate-950">
            إدارة التفعيلات والتحويلات
          </h1>

          <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
            هنا تتم مراجعة التحويلات والتفعيل اليدوي. أي تفعيل جديد يرتبط بباقة واضحة حتى تبقى الخدمات والصلاحيات منظمة.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UserCheck className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">تفعيل يدوي بباقة</h2>
              <p className="mt-1 text-[13px] font-bold text-slate-500">
                اختر الحساب والباقة، ثم أكد التفعيل من النافذة المنبثقة.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_130px]">
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

            <select
              value={manualPlanId}
              onChange={(event) => setManualPlanId(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            >
              <option value="">اختر الباقة</option>
              {data?.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
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
            onClick={() =>
              confirmAction({
                title: "تأكيد التفعيل اليدوي",
                description: "سيتم إسناد الباقة المحددة للحساب، وفتح الخدمات المشمولة في هذه الباقة فقط.",
                variant: "warning",
                confirmLabel: "تفعيل الحساب",
                run: manualActivate,
              })
            }
            className="mt-4 h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700"
          >
            تفعيل الحساب
          </button>
        </div>

        <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
              <KeyRound className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">أكواد التفعيل</h2>
              <p className="mt-1 text-[13px] font-bold text-slate-500">
                متاحة مؤقتًا، والأفضل لاحقًا ربط الأكواد بباقة محددة.
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
            onClick={() =>
              confirmAction({
                title: "إنشاء كود تفعيل؟",
                description: "سيتم إنشاء كود جديد بالمدة وعدد الاستخدامات المحددة. تأكد من البيانات قبل المتابعة.",
                variant: "info",
                confirmLabel: "إنشاء الكود",
                run: createCode,
              })
            }
            className="mt-4 h-12 w-full rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
          >
            إنشاء كود
          </button>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
            <WalletCards className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-950">طلبات التحويل البنكي</h2>
            <p className="mt-1 text-[13px] font-bold text-slate-500">
              قبول التحويل يفعّل الباقة المطلوبة في طلب المستخدم.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                <th className="p-3">المحوّل</th>
                <th className="p-3">الباقة</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">المرجع/الملاحظة</th>
                <th className="p-3">الإجراء</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data?.requests.map((request) => (
                <tr key={request.id}>
                  <td className="p-3 font-bold text-slate-800">
                    {request.senderName || "غير محدد"}
                  </td>

                  <td className="p-3 text-xs font-black text-slate-600">
                    {request.planId
                      ? planNameById.get(request.planId) || "باقة غير معروفة"
                      : "طلب قديم بلا باقة"}
                  </td>

                  <td className="p-3 text-xs font-black text-slate-600">
                    {request.amount} {request.currency}
                  </td>

                  <td className="p-3">
                    <span className={["rounded-full px-3 py-1 text-xs font-black", statusClass(request.status)].join(" ")}>
                      {statusLabel(request.status)}
                    </span>
                  </td>

                  <td className="max-w-xs p-3 text-xs font-bold leading-6 text-slate-500">
                    {request.receiptUrl || request.adminNote || "—"}
                  </td>

                  <td className="p-3">
                    {request.status === "PENDING" ? (
                      <div className="min-w-[330px] rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="grid gap-2 md:grid-cols-[90px_1fr]">
                          <input
                            value={requestDays[request.id] || String(request.durationDays || "")}
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
                            onClick={() =>
                              confirmAction({
                                title: "قبول التحويل وتفعيل الباقة؟",
                                description:
                                  "سيتم تحويل الطلب إلى مقبول، وتفعيل الباقة المطلوبة للحساب، وفتح خدمات الباقة فقط.",
                                variant: "warning",
                                confirmLabel: "قبول وتفعيل",
                                run: () => approveRequest(request.id),
                              })
                            }
                            className="h-10 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {processingRequestId === request.id ? "جار التنفيذ..." : "قبول وتفعيل"}
                          </button>

                          <button
                            type="button"
                            disabled={processingRequestId === request.id}
                            onClick={() =>
                              confirmAction({
                                title: "رفض طلب التحويل؟",
                                description:
                                  "سيتم رفض الطلب وحفظ السبب إن وُجد. لن يتم تفعيل أي باقة لهذا الطلب.",
                                variant: "danger",
                                confirmLabel: "رفض الطلب",
                                run: () => rejectRequest(request.id),
                              })
                            }
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
                  <td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-400">
                    لا توجد طلبات تحويل.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">الأكواد المنشأة</h2>

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
                  onClick={async () => {
                    await navigator.clipboard.writeText(item.code);
                    showResult("تم نسخ الكود", "تم نسخ كود التفعيل إلى الحافظة.", "success");
                  }}
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm"
                  title="نسخ الكود"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            ))}

            {data?.codes.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
                لا توجد أكواد تفعيل.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">الاشتراكات الحالية</h2>

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
                    onClick={() =>
                      confirmAction({
                        title: "إلغاء التفعيل؟",
                        description:
                          "سيتم إلغاء الاشتراك وتعطيل الخدمات للحساب. هذا الإجراء لا يحذف الحساب.",
                        variant: "danger",
                        confirmLabel: "إلغاء التفعيل",
                        run: () => cancelActivation(item.id),
                      })
                    }
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

            {data?.subscriptions.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
                لا توجد اشتراكات.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
