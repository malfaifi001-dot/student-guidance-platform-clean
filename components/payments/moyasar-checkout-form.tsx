"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Moyasar?: {
      init: (config: MoyasarFormConfig) => void;
    };
    ApplePaySession?: {
      canMakePayments?: () => boolean;
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

    const sanitizeDiagnosticMessage = (value: string) =>
      value
        .slice(0, 300)
        .replace(/https?:\/\/\S+/gi, "[URL_REDACTED]")
        .replace(/(?:pk|sk)_(?:live|test)_[A-Za-z0-9_-]+/g, "[KEY_REDACTED]")
        .replace(
          /(paymentData|encryptedData|ephemeralPublicKey|transactionId)\s*[:=]\s*["']?[^,\s}"']+/gi,
          "$1=[REDACTED]",
        );

    const isApplePayRelated = (message: string) =>
      /(moyasar|apple\s?pay|applepaysession|payment|merchant\s?session)/i.test(message);

    const handleWindowError = (event: ErrorEvent) => {
      const message = String(event.message || event.error?.message || "");
      if (!isApplePayRelated(message)) return;
      console.error("TEACHIX_APPLE_PAY_CLIENT_ERROR", {
        message: sanitizeDiagnosticMessage(message),
        errorName: String(event.error?.name || "Error").slice(0, 80),
        sourceFilename: event.filename ? event.filename.split("?")[0] : undefined,
        line: event.lineno || undefined,
        column: event.colno || undefined,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";
      if (!isApplePayRelated(message)) return;
      console.error("TEACHIX_APPLE_PAY_CLIENT_ERROR", {
        errorName: reason instanceof Error ? reason.name.slice(0, 80) : "UnhandledRejection",
        message: sanitizeDiagnosticMessage(message),
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    const cleanupDiagnostics = () => {
      cancelled = true;
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };

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

      const validateMerchantUrl =
        "https://api.moyasar.com/v1/applepay/initiate";
      const methods = ["creditcard", "applepay"];
      const applePaySession = window.ApplePaySession;
      let canMakePayments: boolean | null = null;
      let capabilityErrorMessage: string | undefined;

      try {
        canMakePayments = applePaySession?.canMakePayments?.() ?? null;
      } catch (error) {
        capabilityErrorMessage =
          error instanceof Error
            ? sanitizeDiagnosticMessage(error.message).slice(0, 200)
            : "UNKNOWN_ERROR";
      }

      console.info("TEACHIX_APPLE_PAY_CAPABILITY", {
        applePaySessionType: typeof applePaySession,
        canMakePayments,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        ...(capabilityErrorMessage ? { errorMessage: capabilityErrorMessage } : {}),
      });

      console.info("TEACHIX_APPLE_PAY_INIT", {
        methods,
        hasApplePayConfig: true,
        applePayCountry: "SA",
        applePayLabel: "Teachix",
        validateMerchantPath: "/api/payments/moyasar/apple-pay/session",
        currentHostname: window.location.hostname,
        protocol: window.location.protocol,
        isSecureContext: window.isSecureContext,
        userAgentSummary: navigator.userAgent.slice(0, 160),
        hasApplePaySessionGlobal: typeof applePaySession !== "undefined",
      });

      try {
        window.Moyasar.init({
          element: ".mysr-form",
          amount: Math.round(amount * 100),
          currency,
          description,
          publishable_api_key: publicKey,
          callback_url: callbackUrl,
          supported_networks: ["mada", "visa", "mastercard"],
          methods,
          apple_pay: {
            country: "SA",
            label: "Teachix",
            validate_merchant_url: validateMerchantUrl,
          },
          metadata: { transactionId },
        });
      } catch (error) {
        console.error("TEACHIX_APPLE_PAY_CLIENT_ERROR", {
          errorName: error instanceof Error ? error.name.slice(0, 80) : "Error",
          message:
            error instanceof Error
              ? sanitizeDiagnosticMessage(error.message)
              : "Moyasar initialization failed",
        });
        throw error;
      }
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
        cleanupDiagnostics();
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
    script.addEventListener(
      "error",
      () => {
        console.error("TEACHIX_APPLE_PAY_CLIENT_ERROR", {
          errorName: "ScriptLoadError",
          message: "Moyasar payment form script failed to load",
        });
      },
      { once: true },
    );

    document.body.appendChild(script);

    return () => {
      cleanupDiagnostics();
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
