"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Moyasar?: {
      init: (config: MoyasarFormConfig) => void;
    };
  }
}

type MoyasarFormConfig = {
  element: string;
  amount: number;
  currency: string;
  description: string;
  publishable_api_key: string;
  callback_url: string;
  supported_networks: string[];
  methods: string[];
  apple_pay?: {
    country: string;
    label: string;
    validate_merchant_url: string;
  };
  metadata: {
    transactionId: string;
  };
};

type Props = {
  amount: number;
  currency: string;
  publicKey: string;
  transactionId: string;
  description: string;
};

export function MoyasarCheckoutForm({
  amount,
  currency,
  publicKey,
  transactionId,
  description,
}: Props) {
  useEffect(() => {
    let cancelled = false;

    const stylesheetId = "moyasar-payment-form-css";
    const scriptId = "moyasar-payment-form-js";

    if (!document.getElementById(stylesheetId)) {
      const stylesheet = document.createElement("link");
      stylesheet.id = stylesheetId;
      stylesheet.rel = "stylesheet";
      stylesheet.href =
        "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.css";

      document.head.appendChild(stylesheet);
    }

    function initializeMoyasar() {
      if (cancelled || !window.Moyasar) {
        return;
      }

      const element = document.querySelector(".mysr-form");

      if (!element) {
        console.error("MOYASAR_FORM_ELEMENT_NOT_FOUND");
        return;
      }

      element.innerHTML = "";

      const callbackUrl =
        `${window.location.origin}` +
        `/api/payments/moyasar/callback?transactionId=${encodeURIComponent(
          transactionId
        )}`;

      window.Moyasar.init({
        element: ".mysr-form",
        amount: Math.round(amount * 100),
        currency,
        description,
        publishable_api_key: publicKey,
        callback_url: callbackUrl,
        supported_networks: [
          "mada",
          "visa",
          "mastercard",
        ],
        methods: ["creditcard", "applepay"],
        apple_pay: {
          country: "SA",
          label: "Teachix",
          validate_merchant_url:
            `${window.location.origin}/api/payments/moyasar/apple-pay/session`,
        },
        metadata: {
          transactionId,
        },
      });
    }

    const existingScript = document.getElementById(
      scriptId
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.Moyasar) {
        setTimeout(initializeMoyasar, 0);
      } else {
        existingScript.addEventListener(
          "load",
          initializeMoyasar,
          { once: true }
        );
      }

      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");

    script.id = scriptId;
    script.src =
      "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.10/dist/moyasar.umd.min.js";
    script.async = true;

    script.addEventListener(
      "load",
      initializeMoyasar,
      { once: true }
    );

    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [
    amount,
    currency,
    description,
    publicKey,
    transactionId,
  ]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
      <div className="mysr-form w-full py-1" dir="rtl" />
      <p className="mt-3 border-t border-slate-200 pt-3 text-center text-xs font-bold text-slate-500">
        تتم معالجة بيانات الدفع بأمان عبر Moyasar.
      </p>
    </section>
  );
}
