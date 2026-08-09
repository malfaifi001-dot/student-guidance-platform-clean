import { NextRequest, NextResponse } from "next/server";
import {
  applyFailedElectronicPaymentTransaction,
  applyPaidElectronicPaymentTransaction,
  ElectronicPaymentError,
} from "@/lib/payments/electronic-payments";
import {
  MoyasarPaymentError,
  retrieveMoyasarPayment,
} from "@/lib/payments/moyasar";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeMoyasarStatus(value: unknown) {
  const status = String(value || "").toLowerCase();

  if (status === "paid") {
    return "PAID";
  }

  if (
    status === "failed" ||
    status === "declined"
  ) {
    return "FAILED";
  }

  return "PENDING";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const paymentId =
    url.searchParams.get("id") ||
    url.searchParams.get("payment_id") ||
    "";

  const transactionId =
    url.searchParams.get("transactionId") || "";

  if (!paymentId || !transactionId) {
    return NextResponse.redirect(
      new URL("/dashboard/plans?payment=invalid", request.url)
    );
  }

  try {
    const transaction =
      await prisma.paymentTransaction.findUnique({
        where: {
          id: transactionId,
        },
        include: {
          provider: true,
        },
      });

    if (!transaction) {
      return NextResponse.redirect(
        new URL("/dashboard/plans?payment=not-found", request.url)
      );
    }

    if (transaction.provider?.slug !== "moyasar") {
      return NextResponse.redirect(
        new URL("/dashboard/plans?payment=provider-mismatch", request.url)
      );
    }

    const payment = await retrieveMoyasarPayment(paymentId);

    const paymentStatus = normalizeMoyasarStatus(payment.status);

    const metadata = getObject(payment.metadata);

    const metadataTransactionId =
      typeof metadata.transactionId === "string"
        ? metadata.transactionId
        : "";

    if (
      metadataTransactionId &&
      metadataTransactionId !== transaction.id
    ) {
      return NextResponse.redirect(
        new URL("/dashboard/plans?payment=reference-mismatch", request.url)
      );
    }

    const moyasarAmount =
      typeof payment.amount === "number"
        ? payment.amount
        : Number(payment.amount || 0);

    const expectedAmount = transaction.amount * 100;

    if (moyasarAmount !== expectedAmount) {
      return NextResponse.redirect(
        new URL("/dashboard/plans?payment=amount-mismatch", request.url)
      );
    }

    const currency = String(payment.currency || "").toUpperCase();

    if (currency !== transaction.currency.toUpperCase()) {
      return NextResponse.redirect(
        new URL("/dashboard/plans?payment=currency-mismatch", request.url)
      );
    }

    if (paymentStatus === "PAID") {
      await prisma.paymentTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          externalRef: paymentId,
        },
      });

      await applyPaidElectronicPaymentTransaction({
        transactionId: transaction.id,
        externalRef: paymentId,
        providerSlug: "moyasar",
        payload: payment,
      });

      return NextResponse.redirect(
        new URL(
          `/dashboard/checkout/transactions/${transaction.id}?payment=success`,
          request.url
        )
      );
    }

    if (paymentStatus === "FAILED") {
      await prisma.paymentTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          externalRef: paymentId,
        },
      });

      await applyFailedElectronicPaymentTransaction({
        transactionId: transaction.id,
        externalRef: paymentId,
        providerSlug: "moyasar",
        status: "FAILED",
        payload: payment,
      });

      return NextResponse.redirect(
        new URL(
          `/dashboard/checkout/transactions/${transaction.id}?payment=failed`,
          request.url
        )
      );
    }

    return NextResponse.redirect(
      new URL(
        `/dashboard/checkout/transactions/${transaction.id}?payment=pending`,
        request.url
      )
    );
  } catch (error) {
    if (
      error instanceof MoyasarPaymentError ||
      error instanceof ElectronicPaymentError
    ) {
      console.error("MOYASAR_CALLBACK_ERROR", error.message);
    } else {
      console.error("MOYASAR_CALLBACK_UNKNOWN_ERROR", error);
    }

    return NextResponse.redirect(
      new URL("/dashboard/plans?payment=verification-error", request.url)
    );
  }
}