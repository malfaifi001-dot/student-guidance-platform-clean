"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

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
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
        Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ø¢Ù…Ù†Ø©
      </p>

      <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-white">
        Ø§Ù„Ø¯ÙØ¹ Ø¨Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©
      </h2>

      <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
        Ø£ÙƒÙ…Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© Ø¹Ø¨Ø± Ø¨ÙˆØ§Ø¨Ø© Moyasar Ø§Ù„Ø¢Ù…Ù†Ø©.
      </p>

      <div className="mysr-form mt-5" dir="rtl" />
    </section>
  );
}
