"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, FileText, Loader2, ShieldCheck, X } from "lucide-react";
import { PlanPaymentModal } from "@/components/payments/plan-payment-modal";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import {
  TeachixInvoiceDocument,
  type TeachixInvoiceData,
} from "@/components/payments/teachix-invoice-document";
import {
  formatSubscriptionPeriod,
  getBillingCycleLabel,
} from "@/lib/subscription/subscription-presentation";
import { ANALYTICS_EVENTS } from "@/lib/analytics/analytics-events";
import { trackAnalyticsEvent } from "@/lib/analytics/analytics-client";
import { buildWhatsAppLink } from "@/lib/whatsapp/whatsapp-links";
import { TEACHIX_WHATSAPP_INTERNATIONAL_NUMBER } from "@/lib/marketing/contact-details";
import { openExternalUrl } from "@/lib/native/external-url-handler";

const DEFAULT_FREE_PLAN_SLUG = "default-free-auto";

type CounselorPlan = {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  commercialType?: "TERM" | "YEAR" | null;
  billingCycle: BillingCycle;
  durationDays: number;
  maxStudents: string;
  maxUsers: string;
  maxReports: string;
  targetAudience: string;
  serviceAccessMode?: "ALL_SERVICES" | "CUSTOM_SERVICES";
  services: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
  pricing?: {
    originalAmount: number;
    finalAmount: number;
    discountAmount: number;
    promotionId: string | null;
    promotionName: string | null;
    pricingReason:
      | "BASE_PRICE"
      | "AUTOMATIC_PROMOTION"
      | "MANUAL_OFFER"
      | "COUPON";
  };
};

type PlansPayload = {
  salesExperience?: {
    effectiveMode: "SERVICE" | "BAG";
    isBagMode: boolean;
  };
  bagPlanId?: string | null;
  plans: CounselorPlan[];
  subscription: {
    status: string;
    planId: string;
    planName: string;
    planSlug?: string;
    startsAt: string;
    endsAt: string | null;
    remainingDays: number | null;
    usable: boolean;
    invoiceTransactionId: string | null;
  } | null;
};

type BillingCycle = "monthly" | "yearly";

type CouponQuote = {
  couponCode: string;
  promotionName: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  baseAmount?: number;
  promotionDiscountAmount?: number;
  priceAfterPromotion?: number;
  couponBaseAmount?: number;
  couponDiscountAmount?: number;
  totalDiscountAmount?: number;
};

type EntryNotice = {
  title: string;
  message: string;
  serviceSlug?: string | null;
  actionLabel?: string;
};

type CheckoutTransaction = {
  id: string;
  amount: number;
  currency: string;
  publicKey: string;
  planId: string;
  billingCycle: BillingCycle;
};

type PaymentReturnFeedback = {
  type: "success" | "error" | "warning" | "info";
  title: string;
  description: string;
  transactionId?: string;
  isBagMode?: boolean;
};

type BankTransferFields = {
  senderName: string;
  phone: string;
  receiptUrl: string;
  note: string;
};

const emptyBankTransfer: BankTransferFields = {
  senderName: "",
  phone: "",
  receiptUrl: "",
  note: "",
};

const BAG_CONTENTS = [
  "كتب تعليمية",
  "أدوات تعليمية للطلاب",
  "ملزمة تعليمية",
  "عروض تعليمية",
  "بطاقات وأنشطة",
  "مواد صفية مساندة",
  "نماذج جاهزة للطباعة",
  "أدوات تنظيم للمعلم",
];

function getPlanPrice(plan: CounselorPlan, billingCycle: BillingCycle) {
  return billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
}

function getPlanDisplayBillingCycle(
  plan: CounselorPlan,
  fallback: BillingCycle,
) {
  return plan.commercialType ? plan.billingCycle : fallback;
}

function getBillingLabel(billingCycle: BillingCycle) {
  return getBillingCycleLabel(billingCycle);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

async function readApiResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function getEntryNoticeFromUrl(): EntryNotice | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason");
  const serviceSlug = params.get("service");

  if (reason === "service-not-in-plan") {
    return {
      title: "اختر باقة تشمل الخدمة المطلوبة",
      message:
        "الخدمة غير مشمولة في اشتراكك الحالي. اختر باقة مناسبة للمتابعة.",
      serviceSlug,
      actionLabel: "عرض الباقات",
    };
  }

  if (reason === "activation-required") {
    return {
      title: "يلزم تفعيل باقة",
      message:
        "اختر الباقة المناسبة ثم أكمل التفعيل أو الدفع للوصول إلى الخدمة.",
      serviceSlug,
      actionLabel: "اختيار باقة",
    };
  }

  return null;
}

function BagProductCard({
  plan,
  billingCycle,
  onPurchase,
}: {
  plan: CounselorPlan;
  billingCycle: BillingCycle;
  onPurchase: () => void;
}) {
  const amount = getPlanPrice(plan, billingCycle);

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-gradient-to-br from-violet-950 via-slate-900 to-sky-950 p-6 text-white shadow-xl shadow-violet-100 md:col-span-2 xl:col-span-3">
      <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="relative grid gap-7 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-amber-950">
              منتج مادي
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-violet-100">
              Teachix
            </span>
          </div>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            الحقيبة الشاملة
          </h2>
          <p className="mt-3 text-xl font-black text-violet-100">
            حقيبة تعليمية متكاملة للمعلم
          </p>
          <p className="mt-4 max-w-2xl text-sm font-bold leading-8 text-slate-200">
            منتج تعليمي مادي مستقل، ويتم الشحن والتسليم خارج المنصة. شراء الحقيبة لا يفتح أي خدمة أو ميزة داخل Teachix.
          </p>
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4">
            <h3 className="font-black text-white">محتويات الحقيبة الشاملة</h3>
            <p className="mt-1 text-xs font-bold text-slate-300">مجموعة مختارة من الأدوات والمواد التعليمية للمعلم.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {BAG_CONTENTS.map((name) => (
                <div key={name} className="flex items-start gap-2 text-sm font-bold text-slate-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-white/15 bg-white p-5 text-slate-950 shadow-2xl">
          <p className="text-xs font-black text-violet-700">أدوات ومواد تعليمية</p>
          <div className="mt-4 flex items-end gap-2">
            <strong className="text-4xl font-black">{formatPrice(amount)}</strong>
            <span className="pb-1 text-sm font-bold text-slate-500">ريال</span>
          </div>
          <p className="mt-5 rounded-2xl bg-violet-50 p-3 text-xs font-bold leading-6 text-violet-800">
            منتج تعليمي مادي مستقل، ويتم الشحن والتسليم خارج المنصة. شراء الحقيبة لا يفتح أي خدمة أو ميزة داخل Teachix.
          </p>
          <button
            type="button"
            onClick={onPurchase}
            className="mt-5 h-12 w-full rounded-2xl bg-violet-700 text-sm font-black text-white transition hover:bg-violet-800"
          >
            شراء الحقيبة
          </button>
        </div>
      </div>
    </article>
  );
}

export function CounselorPlansPage() {
  const router = useRouter();
  const [data, setData] = useState<PlansPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<CounselorPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [entryNotice, setEntryNotice] = useState<EntryNotice | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [bankTransfer, setBankTransfer] =
    useState<BankTransferFields>(emptyBankTransfer);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"online" | "bank">("online");
  const [checkoutTransaction, setCheckoutTransaction] =
    useState<CheckoutTransaction | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [submittingBankTransfer, setSubmittingBankTransfer] = useState(false);
  const [activatingFreePlan, setActivatingFreePlan] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponQuote, setCouponQuote] = useState<CouponQuote | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [paymentReturnFeedback, setPaymentReturnFeedback] =
    useState<PaymentReturnFeedback | null>(null);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [invoicePreviewData, setInvoicePreviewData] =
    useState<TeachixInvoiceData | null>(null);
  const [invoicePreviewLoading, setInvoicePreviewLoading] = useState(false);
  const [invoicePreviewError, setInvoicePreviewError] = useState("");
  const plansViewTracked = useRef(false);

  async function loadPlans() {
    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/plans", {
        cache: "no-store",
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر تحميل الباقات.");
      }

      setData(result);
      if (!plansViewTracked.current) {
        plansViewTracked.current = true;
        trackAnalyticsEvent(ANALYTICS_EVENTS.VIEW_ITEM, {
          feature: "subscription_plans",
          source: "plans",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر تحميل الباقات.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function openInvoicePreview(transactionId: string) {
    setInvoicePreviewOpen(true);
    setInvoicePreviewLoading(true);
    setInvoicePreviewError("");
    setInvoicePreviewData(null);

    try {
      const response = await fetch(
        `/api/dashboard/payments/${encodeURIComponent(transactionId)}/invoice`,
        { cache: "no-store" },
      );
      const result = await readApiResponse(response);

      if (!response.ok || !result.ok || !result.invoice || !result.transaction) {
        throw new Error(result.error || "تعذر تحميل الفاتورة.");
      }

      setInvoicePreviewData({
        invoice: result.invoice,
        transaction: result.transaction,
      });
    } catch (error) {
      setInvoicePreviewError(
        error instanceof Error ? error.message : "تعذر تحميل الفاتورة.",
      );
    } finally {
      setInvoicePreviewLoading(false);
    }
  }

  useEffect(() => {
    // Hydrate URL-only notice state after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntryNotice(getEntryNoticeFromUrl());

    async function hydratePaymentReturn() {
      const params = new URLSearchParams(window.location.search);
      const payment = params.get("payment");
      const transactionId = params.get("transactionId");

      if (payment === "success" && transactionId) {
        try {
          const response = await fetch(
            `/api/dashboard/payments/${encodeURIComponent(transactionId)}/invoice`,
            { cache: "no-store" },
          );
          const result = await readApiResponse(response);

          if (!response.ok || !result.ok || !result.invoice) {
            throw new Error(result.error || "تعذر التحقق من الفاتورة.");
          }

          const invoice = result.invoice as {
            invoiceNumber?: string;
            amounts?: { totalAmount?: number; currency?: string };
            buyer?: { schoolName?: string };
          };
          const transaction = result.transaction as {
            method?: string;
          };

          const modeResponse = await fetch("/api/dashboard/plans", { cache: "no-store" });
          const modePayload = await readApiResponse(modeResponse);
          await loadPlans();
          const bagPurchase = modePayload?.salesExperience?.isBagMode === true;
          setPaymentReturnFeedback({
            type: "success",
            title: bagPurchase ? "تم شراء الحقيبة الشاملة بنجاح" : "تم الدفع وتفعيل الباقة بنجاح",
            description: [
              bagPurchase ? "تم استلام عملية الدفع بنجاح. يرجى التواصل معنا عبر واتساب لاستكمال بيانات الشحن والتسليم." : null,
              invoice.buyer?.schoolName,
              invoice.invoiceNumber
                ? `رقم الفاتورة: ${invoice.invoiceNumber}`
                : null,
              invoice.amounts?.totalAmount !== undefined
                ? `المبلغ: ${formatPrice(invoice.amounts.totalAmount)} ${invoice.amounts.currency || "ريال"}`
                : null,
              transaction.method ? `طريقة الدفع: ${transaction.method}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
            transactionId,
            isBagMode: bagPurchase,
          });
        } catch (error) {
          setPaymentReturnFeedback({
            type: "error",
            title: "تعذر تأكيد عملية الدفع",
            description:
              error instanceof Error
                ? error.message
                : "تحقق من حالة العملية أو حاول تحديث الصفحة.",
          });
        }
      } else {
        void loadPlans();
        if (payment === "failed" || payment === "canceled") {
          setPaymentReturnFeedback({
            type: "error",
            title: "لم تكتمل عملية الدفع",
            description: isBagMode
              ? "لم تكتمل عملية شراء الحقيبة. يمكنك المحاولة مرة أخرى."
              : "لم يتم تفعيل الباقة. يمكنك المحاولة مرة أخرى من صفحة الباقات.",
          });
        } else if (payment === "pending") {
          setPaymentReturnFeedback({
            type: "info",
            title: "عملية الدفع قيد المعالجة",
            description: isBagMode
              ? "ستظهر حالة شراء الحقيبة بعد تأكيد العملية من مزود الدفع."
              : "ستظهر حالة الباقة بعد تأكيد العملية من مزود الدفع.",
          });
        } else if (payment && payment !== "success") {
          setPaymentReturnFeedback({
            type: "error",
            title: "تعذر إتمام عملية الدفع",
            description: "تعذر التحقق من مرجع العملية. حاول بدء الدفع مرة أخرى.",
          });
        }
      }

      if (payment) {
        router.replace("/dashboard/plans", { scroll: false });
      }
    }

    void hydratePaymentReturn();
    // The plans page intentionally hydrates URL state once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiblePlans = useMemo(
    () =>
      (data?.plans || []).filter(
        (plan) => plan.slug !== DEFAULT_FREE_PLAN_SLUG,
      ),
    [data?.plans],
  );
  const isBagMode = data?.salesExperience?.isBagMode === true;
  const bagPlan = visiblePlans.find((plan) => plan.id === data?.bagPlanId) || visiblePlans[0] || null;

  const selectedPrice = selectedPlan
    ? selectedPlan.pricing?.pricingReason === "AUTOMATIC_PROMOTION" ||
      selectedPlan.pricing?.pricingReason === "MANUAL_OFFER"
      ? selectedPlan.pricing.finalAmount
      : getPlanPrice(selectedPlan, billingCycle)
    : 0;
  const selectedFinalPrice = couponQuote?.finalAmount ?? selectedPrice;
  const selectedPlanIsFree = Boolean(selectedPlan && selectedFinalPrice <= 0);

  function selectPlan(plan: CounselorPlan) {
    trackAnalyticsEvent(ANALYTICS_EVENTS.SELECT_ITEM, {
      plan_slug: plan.slug,
    });
    setSelectedPlan(plan);
    setBillingCycle(plan.billingCycle);
    setMessage(null);
    setCheckoutError("");
    setCheckoutTransaction(null);
    setPaymentMode("online");
    setCouponCode("");
    setCouponQuote(null);
    setCouponError("");
    document.getElementById("selected-plan-summary")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function changeBillingCycle(nextCycle: BillingCycle) {
    setBillingCycle(nextCycle);
    setCheckoutTransaction(null);
    setCheckoutError("");
    setCouponCode("");
    setCouponQuote(null);
    setCouponError("");
  }

  async function applyCoupon() {
    if (!selectedPlan) return;
    setCouponLoading(true);
    setCouponError("");
    setCheckoutTransaction(null);
    let couponValidated = false;
    try {
      const response = await fetch(
        "/api/dashboard/promotions/validate-coupon",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: selectedPlan.id,
            billingCycle: billingCycle === "yearly" ? "YEARLY" : "MONTHLY",
            couponCode,
          }),
        },
      );
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || "الكوبون غير صالح.");
      const quote = result.quote as CouponQuote;
      setCouponQuote(quote);
      couponValidated = true;
      const appliedCouponCode = String(
        quote?.couponCode || couponCode,
      ).toUpperCase();
      setCouponCode(appliedCouponCode);
      if (Number(quote?.finalAmount) <= 0) {
        await activateFreePlan(appliedCouponCode);
      } else if (paymentModalOpen) {
        await openOnlineCheckout(appliedCouponCode);
      }
    } catch (error) {
      if (!couponValidated) setCouponQuote(null);
      setCouponError(
        error instanceof Error ? error.message : "الكوبون غير صالح.",
      );
    } finally {
      setCouponLoading(false);
    }
  }

  async function activateFreePlan(couponCodeOverride?: string) {
    if (!selectedPlan) return;

    const activationCouponCode =
      couponCodeOverride || couponQuote?.couponCode || "";
    if (!activationCouponCode && !selectedPlanIsFree) return;

    setActivatingFreePlan(true);
    setMessage(null);
    setCheckoutError("");

    try {
      const response = await fetch("/api/dashboard/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
          senderName: "",
          phone: "",
          receiptUrl: "",
          note: "",
          couponCode: activationCouponCode,
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر تفعيل الباقة.");
      }

      await loadPlans();
      router.refresh();
      setPaymentModalOpen(false);
      setCheckoutTransaction(null);
      setCouponQuote(null);
      setCouponCode("");
      setCouponError("");
      setSelectedPlan(null);
      trackAnalyticsEvent(ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED, {
        plan_slug: selectedPlan.slug,
        activation_method: "free",
      });
      setMessage({
        type: "success",
        text: activationCouponCode
          ? "تم تطبيق الكوبون وتفعيل الباقة بنجاح."
          : result.message || "تم تفعيل الباقة بنجاح.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "تعذر تفعيل الباقة.";
      setCheckoutError(errorMessage);
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setActivatingFreePlan(false);
    }
  }

  async function openOnlineCheckout(couponCodeOverride?: string) {
    if (!selectedPlan || selectedPlanIsFree) return;

    setPaymentModalOpen(true);
    setPaymentMode("online");
    setCheckoutError("");

    if (
      couponCodeOverride === undefined &&
      checkoutTransaction?.planId === selectedPlan.id &&
      checkoutTransaction.billingCycle === billingCycle
    ) {
      return;
    }

    setCheckoutLoading(true);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle: billingCycle === "yearly" ? "YEARLY" : "MONTHLY",
          providerSlug: "moyasar",
          couponCode: couponCodeOverride ?? couponQuote?.couponCode ?? "",
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر إنشاء عملية الدفع.");
      }

      const publicKey = String(result.paymentConfig?.publicKey || "");

      if (!result.transaction?.id || !publicKey) {
        throw new Error("بوابة Moyasar غير مهيأة للدفع حاليًا.");
      }

      setCheckoutTransaction({
        id: String(result.transaction.id),
        amount: Number(result.transaction.amount || selectedPrice),
        currency: String(result.transaction.currency || "SAR"),
        publicKey,
        planId: selectedPlan.id,
        billingCycle,
      });
      trackAnalyticsEvent(ANALYTICS_EVENTS.BEGIN_CHECKOUT, {
        plan_slug: selectedPlan.slug,
        source: "plans",
      });
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء إنشاء عملية الدفع.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function submitBankTransfer() {
    if (!selectedPlan) return;

    if (!bankTransfer.senderName.trim() || !bankTransfer.phone.trim()) {
      setCheckoutError("اكتب اسم المحوّل ورقم الجوال.");
      return;
    }

    setSubmittingBankTransfer(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/dashboard/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
          ...bankTransfer,
          couponCode: couponQuote?.couponCode || "",
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر إرسال طلب الاشتراك.");
      }

      await loadPlans();
      setPaymentModalOpen(false);
      setSelectedPlan(null);
      setBankTransfer(emptyBankTransfer);
      trackAnalyticsEvent(ANALYTICS_EVENTS.BANK_TRANSFER_REQUESTED, {
        plan_slug: selectedPlan.slug,
        activation_method: "bank_transfer",
      });
      trackAnalyticsEvent(ANALYTICS_EVENTS.SUBSCRIPTION_REQUESTED, {
        plan_slug: selectedPlan.slug,
        activation_method: "bank_transfer",
      });
      setMessage({
        type: "success",
        text: result.message || "تم إرسال طلب التحويل البنكي بنجاح.",
      });
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "تعذر إرسال طلب الاشتراك.",
      );
    } finally {
      setSubmittingBankTransfer(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm font-black text-slate-500">
            {isBagMode ? "جارٍ تحميل الحقائب..." : "جارٍ تحميل الباقات..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6" dir="rtl">
      {entryNotice && !isBagMode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <section
            className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-emerald-700">
                  تنبيه الاشتراك
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {entryNotice.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEntryNotice(null)}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-500"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
              {entryNotice.message}
            </p>
            <button
              type="button"
              onClick={() => {
                setEntryNotice(null);
                document
                  .getElementById("plans-list")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              {entryNotice.actionLabel || "عرض الباقات"}
            </button>
          </section>
        </div>
      ) : null}

      {message && !isBagMode ? (
        <div
          className={[
            "rounded-2xl border px-4 py-3 text-sm font-bold",
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}

      <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">
            {isBagMode ? "الحقيبة الشاملة" : "اختر الباقة المناسبة"}
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            {isBagMode ? "منتج تعليمي مادي مستقل، ويتم الشحن والتسليم خارج المنصة. شراء الحقيبة لا يفتح أي خدمة أو ميزة داخل Teachix." : "اختر خطتك ثم راجع السعر وانتقل مباشرة إلى الدفع الآمن."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isBagMode && data?.subscription?.usable ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2">
              <p className="text-xs font-black text-emerald-700">
                الباقة المفعلة · {data.subscription.planName}
              </p>
              <p className="mt-0.5 text-xs font-bold text-emerald-600">
                {formatSubscriptionPeriod(data.subscription)}
              </p>
            </div>
          ) : null}

          {!isBagMode ? <div
            className="flex w-fit rounded-2xl border border-slate-200 bg-slate-50 p-1"
            aria-label="دورة الفوترة"
          >
            {(["monthly", "yearly"] as const)
              .filter(
                (cycle) =>
                  !selectedPlan?.commercialType ||
                  cycle === selectedPlan.billingCycle,
              )
              .map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => changeBillingCycle(cycle)}
                  className={[
                    "rounded-xl px-5 py-2 text-sm font-black transition",
                    billingCycle === cycle
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                >
                  {getBillingLabel(cycle)}
                </button>
              ))}
          </div> : null}
        </div>
      </header>

      <section
        id="plans-list"
        className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {isBagMode ? (
          bagPlan ? (
            <BagProductCard
              key="comprehensive-teacher-bag"
              plan={bagPlan}
              billingCycle={getPlanDisplayBillingCycle(bagPlan, billingCycle)}
              onPurchase={() => selectPlan(bagPlan)}
            />
          ) : null
        ) : visiblePlans.map((plan) => {
          const selected = selectedPlan?.id === plan.id;
          const active = Boolean(
            data?.subscription?.usable && data.subscription.planId === plan.id,
          );
          const planDisplayBillingCycle = getPlanDisplayBillingCycle(
            plan,
            billingCycle,
          );
          const price = getPlanPrice(plan, planDisplayBillingCycle);
          const automaticPricing =
            plan.pricing &&
            (plan.pricing.pricingReason === "AUTOMATIC_PROMOTION" ||
              plan.pricing.pricingReason === "MANUAL_OFFER")
              ? plan.pricing
              : null;

          return (
            <article
              key={plan.id}
              className={[
                "flex min-h-[350px] flex-col rounded-[1.75rem] border bg-white p-5 transition",
                active
                  ? "border-emerald-400 bg-emerald-50/30 shadow-sm"
                  : selected
                    ? "border-sky-300 bg-sky-50/30 shadow-sm"
                    : "border-slate-200 hover:border-slate-300",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">
                {isBagMode ? "الحقيبة الشاملة" : plan.name}
                </h2>
                {active ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                    {isBagMode ? "المنتج المختار" : "الباقة المفعلة"}
                  </span>
                ) : selected ? (
                  <CheckCircle2 className="h-5 w-5 text-sky-600" />
                ) : null}
              </div>

              <div className="mt-5 flex items-end gap-2">
                {automaticPricing ? (
                  <span className="relative text-lg font-black text-slate-400">
                    {formatPrice(automaticPricing.originalAmount)} ريال
                    <span className="absolute inset-x-0 top-1/2 h-px bg-rose-400" />
                  </span>
                ) : null}
                <strong className="text-4xl font-black text-slate-950">
                  {formatPrice(automaticPricing?.finalAmount ?? price)}
                </strong>
                <span className="pb-1 text-sm font-bold text-slate-500">
                  ريال / {getBillingLabel(planDisplayBillingCycle)}
                </span>
              </div>
              {automaticPricing?.promotionName ? (
                <span className="mt-2 inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {automaticPricing.promotionName}
                </span>
              ) : null}

              <div className="mt-6 flex flex-1 flex-col gap-2 text-sm font-bold text-slate-600">
                {plan.serviceAccessMode === "ALL_SERVICES" ? (
                  <p className="font-black text-sky-700">شامل جميع الخدمات</p>
                ) : null}
                {plan.serviceAccessMode !== "ALL_SERVICES" &&
                plan.services.length > 0 ? (
                  <>
                    {plan.services.slice(0, 4).map((service) => (
                      <div key={service.id} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                        <span>{service.name}</span>
                      </div>
                    ))}
                    {plan.services.length > 4 ? (
                      <p className="pr-6 text-xs font-black text-sky-700">
                        و{plan.services.length - 4} خدمات أخرى
                      </p>
                    ) : null}
                  </>
                ) : plan.serviceAccessMode === "ALL_SERVICES" ? null : (
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                    <span>مزايا الباقة حسب إعداد الاشتراك</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (active && data?.subscription?.invoiceTransactionId) {
                    void openInvoicePreview(
                      data.subscription.invoiceTransactionId,
                    );
                    return;
                  }

                  if (!active) {
                    selectPlan(plan);
                  }
                }}
                disabled={active && !data?.subscription?.invoiceTransactionId}
                className={[
                  "mt-4 h-11 rounded-2xl text-sm font-black transition",
                  active
                    ? data?.subscription?.invoiceTransactionId
                      ? "bg-emerald-700 text-white hover:bg-emerald-800"
                      : "cursor-default bg-emerald-100 text-emerald-700"
                    : selected
                      ? "bg-sky-700 text-white"
                      : "bg-slate-950 text-white hover:bg-slate-800",
                ].join(" ")}
              >
                {active ? (
                  data?.subscription?.invoiceTransactionId ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4" />
                      الفاتورة
                    </span>
                  ) : (
                    "الباقة الحالية"
                  )
                ) : (
                  isBagMode ? "شراء الحقيبة" : "اختيار الباقة"
                )}
              </button>
            </article>
          );
        })}

        {visiblePlans.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 md:col-span-2 xl:col-span-3">
            {isBagMode ? "لا تتوفر الحقيبة حاليًا." : "لا توجد باقات متاحة حاليًا."}
          </div>
        ) : null}
      </section>

      {selectedPlan ? (
        <section
          id="selected-plan-summary"
          className="flex flex-col gap-4 rounded-[1.75rem] border border-emerald-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-700">
                {isBagMode ? "الحقيبة المختارة" : "الباقة المختارة"}
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-950">
                {isBagMode ? "الحقيبة الشاملة" : selectedPlan.name}
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
            {isBagMode ? `${formatPrice(selectedPrice)} ريال` : `${getBillingLabel(billingCycle)} · ${formatPrice(selectedPrice)} ريال`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={
                selectedPlanIsFree
                  ? () => void activateFreePlan()
                  : () => void openOnlineCheckout()
              }
              disabled={activatingFreePlan || checkoutLoading || couponLoading}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {activatingFreePlan || checkoutLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {selectedPlanIsFree ? (isBagMode ? "شراء الحقيبة" : "تفعيل الباقة الآن") : (isBagMode ? "شراء الحقيبة" : "المتابعة للدفع")}
            </button>
            {!isBagMode ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan(null);
                  setCheckoutTransaction(null);
                }}
                className="px-3 py-2 text-sm font-black text-slate-500 transition hover:text-slate-900"
              >
                تغيير الباقة
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {paymentModalOpen && selectedPlan ? (
        <PlanPaymentModal
          planName={isBagMode ? "الحقيبة الشاملة" : selectedPlan.name}
          billingLabel={getBillingLabel(billingCycle)}
          total={selectedFinalPrice}
          couponCode={couponCode}
          coupon={couponQuote}
          couponLoading={couponLoading}
          couponError={couponError}
          transaction={checkoutTransaction}
          mode={paymentMode}
          isCreatingTransaction={checkoutLoading}
          isSubmittingBankTransfer={submittingBankTransfer}
          errorMessage={checkoutError}
          bankTransfer={bankTransfer}
          onBankTransferChange={(patch) =>
            setBankTransfer((current) => ({ ...current, ...patch }))
          }
          onSwitchMode={(mode) => {
            setPaymentMode(mode);
            setCheckoutError("");
            if (mode === "online" && !checkoutTransaction) {
              void openOnlineCheckout();
            }
          }}
          onSubmitBankTransfer={() => void submitBankTransfer()}
          onCouponCodeChange={(value) => {
            setCouponCode(value);
            setCouponError("");
          }}
          onApplyCoupon={() => void applyCoupon()}
          onRemoveCoupon={() => {
            setCouponQuote(null);
            setCouponCode("");
            setCouponError("");
            setCheckoutTransaction(null);
            if (paymentMode === "online") void openOnlineCheckout("");
          }}
          isFreeActivation={selectedPlanIsFree}
          isActivatingFreePlan={activatingFreePlan}
          isBagMode={isBagMode}
          onActivateFreePlan={() => void activateFreePlan()}
          onClose={() => setPaymentModalOpen(false)}
        />
      ) : null}

      {invoicePreviewOpen ? (
        <div
          className="fixed inset-0 z-[998] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="معاينة الفاتورة"
          dir="rtl"
        >
          <section className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
              <div>
                <h2 className="text-xl font-black text-slate-950">معاينة الفاتورة</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {isBagMode ? "فاتورة Teachix الخاصة بالحقيبة" : "فاتورة Teachix الخاصة بالاشتراك الحالي"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInvoicePreviewOpen(false);
                  setInvoicePreviewData(null);
                  setInvoicePreviewError("");
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                إغلاق
              </button>
            </header>

            <div className="min-h-0 overflow-auto p-3 sm:p-6">
              {invoicePreviewData ? (
                <TeachixInvoiceDocument data={invoicePreviewData} />
              ) : invoicePreviewLoading ? (
                <div className="grid min-h-80 place-items-center rounded-3xl bg-white">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-700" />
                </div>
              ) : (
                <div className="grid min-h-80 place-items-center rounded-3xl bg-white p-8 text-center">
                  <p className="font-black text-rose-700">
                    {invoicePreviewError || "تعذر تحميل الفاتورة."}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <SmartFeedbackModal
        open={Boolean(paymentReturnFeedback)}
        type={paymentReturnFeedback?.type || "info"}
        title={paymentReturnFeedback?.title || "حالة الدفع"}
        description={paymentReturnFeedback?.description || ""}
        primaryActionLabel={
          paymentReturnFeedback?.isBagMode
            ? "استكمال الشحن عبر واتساب"
            : paymentReturnFeedback?.transactionId
              ? "معاينة الفاتورة"
              : "حسنًا"
        }
        secondaryActionLabel={paymentReturnFeedback?.isBagMode || paymentReturnFeedback?.transactionId ? "العودة إلى Teachix" : undefined}
        onPrimaryAction={() => {
          if (paymentReturnFeedback?.isBagMode) {
            const link = buildWhatsAppLink(
              TEACHIX_WHATSAPP_INTERNATIONAL_NUMBER,
              `السلام عليكم،\nتم شراء الحقيبة الشاملة من Teachix وأرغب في استكمال بيانات الشحن والتسليم.\nرقم العملية: ${paymentReturnFeedback.transactionId || ""}`,
            );
            if (link) void openExternalUrl(link);
            setPaymentReturnFeedback(null);
            return;
          }
          const transactionId = paymentReturnFeedback?.transactionId;
          setPaymentReturnFeedback(null);
          if (transactionId) {
            router.push(
              `/dashboard/payments/invoices/${encodeURIComponent(transactionId)}`,
            );
          }
        }}
        onSecondaryAction={() => setPaymentReturnFeedback(null)}
        onClose={() => setPaymentReturnFeedback(null)}
      />
    </main>
  );
}
