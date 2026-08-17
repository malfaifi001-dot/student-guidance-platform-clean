"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SmartActionModal } from "@/components/ui/smart-action-modal";

export type ReportSignatureRequestView = {
  id: string;
  status: "PENDING" | "SIGNED" | "EXPIRED" | "CANCELED";
  expiresAt: string;
  openedAt?: string | null;
  signedAt?: string | null;
  signatureUrl?: string | null;
};

const statusLabels: Record<ReportSignatureRequestView["status"], string> = {
  PENDING: "بانتظار فتح الرابط",
  SIGNED: "تم توقيع التقرير",
  EXPIRED: "انتهت صلاحية رابط التوقيع",
  CANCELED: "أُلغي طلب التوقيع",
};

function requestStatusLabel(request: ReportSignatureRequestView) {
  if (request.status === "PENDING" && request.openedAt) return "تم فتح الرابط";
  return statusLabels[request.status];
}

function whatsappPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("00966")) return digits.slice(2);
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("05")) return `966${digits.slice(1)}`;
  return digits;
}

function storedLinkKey(requestId: string) {
  return `report-signature-link:${requestId}`;
}

function normalizePrincipalPhone(value: unknown, depth = 0): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || depth > 2) return "";

  const record = value as Record<string, unknown>;
  const nested = record.phone ?? record.principalPhone ?? record.mobile ?? record.number ?? record.value;
  return typeof nested === "string" ? nested : normalizePrincipalPhone(nested, depth + 1);
}

export function ReportSignatureRequestCard({
  reportId,
  initialRequest,
  initialPrincipalName = "",
  initialPrincipalPhone = "",
  ensureReportId,
  triggerClassName,
  triggerLabel = "إرسال للمدير للتوقيع",
}: {
  reportId: string | null;
  initialRequest: ReportSignatureRequestView | null;
  initialPrincipalName?: string;
  initialPrincipalPhone?: unknown;
  ensureReportId?: () => Promise<string | null>;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [request, setRequest] = useState(initialRequest);
  const [requestReportId, setRequestReportId] = useState(reportId);
  const [open, setOpen] = useState(false);
  const [principalName, setPrincipalName] = useState(initialPrincipalName);
  const [principalPhone, setPrincipalPhone] = useState(() => normalizePrincipalPhone(initialPrincipalPhone));
  const [publicUrl, setPublicUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (request?.status !== "PENDING") return;
    const interval = window.setInterval(() => {
      if (!requestReportId) return;
      void fetch(`/api/dashboard/reports/${encodeURIComponent(requestReportId)}/signature-request`)
        .then((response) => response.json())
        .then((payload) => {
          if (payload?.success && payload.request) {
            setRequest(payload.request);
            if (!open && payload.request.status === "SIGNED") router.refresh();
          }
        })
        .catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [open, request?.status, requestReportId, router]);

  async function createRequest() {
    try {
      setBusy(true);
      setMessage("");
      const targetReportId = reportId || (ensureReportId ? await ensureReportId() : "");
      if (!targetReportId) throw new Error("تعذر تجهيز التقرير لطلب التوقيع.");
      setRequestReportId(targetReportId);
      const response = await fetch(
        `/api/dashboard/reports/${encodeURIComponent(targetReportId)}/signature-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ principalName, principalPhone }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر إنشاء طلب التوقيع.");
      }
      setRequest(payload.request);
      setPublicUrl(payload.publicUrl || "");
      if (payload.publicUrl && payload.request?.id) {
        window.sessionStorage.setItem(storedLinkKey(payload.request.id), payload.publicUrl);
      }
      setMessage("تم إنشاء رابط توقيع آمن صالح لمدة 30 يومًا.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إنشاء طلب التوقيع.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage("تم نسخ رابط التوقيع.");
    } catch {
      setMessage("تعذر نسخ الرابط تلقائيًا.");
    }
  }

  function openWhatsApp() {
    const phone = whatsappPhone(principalPhone);
    if (!phone || !publicUrl) return;
    const text = `السلام عليكم ${principalName || "مدير المدرسة"}\nفضلًا راجع التقرير ووقّعه عبر الرابط الآمن التالي:\n${publicUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function openModal() {
    if (request?.status === "EXPIRED" || request?.status === "CANCELED") {
      window.sessionStorage.removeItem(storedLinkKey(request.id));
      setPublicUrl("");
      setOpen(true);
      return;
    }
    if (request?.id && !publicUrl) {
      setPublicUrl(window.sessionStorage.getItem(storedLinkKey(request.id)) || "");
    }
    setOpen(true);
  }

  const canCreateRequest =
    !request || request.status === "EXPIRED" || request.status === "CANCELED";

  return (
    <div className="flex min-w-0 items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={openModal}
        className={triggerClassName || "inline-flex min-w-0 flex-1 items-center justify-center rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-800 sm:flex-none"}
      >
        {triggerLabel}
      </button>
      <SmartActionModal
        open={open}
        title="إرسال التقرير للمدير للتوقيع"
        description="أدخل بيانات المدير لإنشاء رابط آمن لمراجعة التقرير وتوقيعه دون تسجيل الدخول."
        loading={busy}
        portal
        showFooter={false}
        stopOutsideMouseDownPropagation
        onClose={() => {
          if (busy) return;
          setOpen(false);
          router.refresh();
        }}
      >
        {canCreateRequest && !publicUrl ? (
          <div className="space-y-4">
            <label className="block text-sm font-black text-slate-700">
              اسم المدير
              <input
                value={principalName}
                onChange={(event) => setPrincipalName(event.target.value)}
                maxLength={191}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-sm font-black text-slate-700">
              رقم جوال المدير
              <input
                value={principalPhone}
                onChange={(event) => setPrincipalPhone(event.target.value)}
                inputMode="tel"
                dir="ltr"
                maxLength={40}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-left font-bold outline-none focus:border-blue-500"
              />
            </label>
            <button
              type="button"
              onClick={() => void createRequest()}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "جاري إنشاء الرابط..." : "إنشاء رابط التوقيع"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
            <div>
              <p className="mb-2 text-xs font-black text-slate-500">رابط توقيع التقرير</p>
              <input readOnly value={publicUrl} dir="ltr" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left text-xs text-slate-700" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => void copyLink()} disabled={!publicUrl} className="h-12 rounded-2xl border border-blue-200 font-black text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                نسخ الرابط
              </button>
              <button type="button" onClick={openWhatsApp} disabled={!publicUrl} className="h-12 rounded-2xl bg-emerald-600 font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                إرسال عبر واتساب
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-black text-slate-500">حالة طلب التوقيع</p>
              <p className="mt-1 text-sm font-black text-slate-800">
                {request ? requestStatusLabel(request) : "تم إنشاء الطلب"}
              </p>
            </div>
          </div>
        )}
        {canCreateRequest && !publicUrl && message ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{message}</p> : null}
      </SmartActionModal>
    </div>
  );
}
