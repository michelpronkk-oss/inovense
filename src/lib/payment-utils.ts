/**
 * Shared payment state logic - safe to import in both Server and Client components.
 * No React, no "use client" directive.
 */
import {
  convertLocalToUsd,
  formatUsdAmount,
  normalizeCurrencyCode,
} from "@/lib/currency";

export type PaymentState =
  | { kind: "no_price" }
  | { kind: "unpaid"; total: number }
  | {
      kind: "deposit_paid";
      total: number;
      paid: number;
      remaining: number;
      paidAt: string;
    }
  | { kind: "fully_paid"; total: number; paidAt: string };

export function derivePaymentState(lead: {
  proposal_price: number | null;
  proposal_deposit: number | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  final_payment_paid_at: string | null;
}): PaymentState {
  const totalRaw =
    lead.proposal_price != null ? Number(lead.proposal_price) : null;
  if (totalRaw == null || !Number.isFinite(totalRaw) || totalRaw <= 0) {
    return { kind: "no_price" };
  }
  const total = totalRaw;
  if (!lead.deposit_paid_at) return { kind: "unpaid", total };

  const effectivePaidRaw = lead.deposit_amount ?? lead.proposal_deposit;
  const effectivePaidUnclamped =
    effectivePaidRaw != null && Number.isFinite(Number(effectivePaidRaw))
      ? Number(effectivePaidRaw)
      : 0;
  const effectivePaid = Math.min(total, Math.max(0, effectivePaidUnclamped));
  const isFull = lead.final_payment_paid_at != null || effectivePaid >= total;

  if (isFull) {
    return {
      kind: "fully_paid",
      total,
      paidAt: lead.final_payment_paid_at ?? lead.deposit_paid_at,
    };
  }

  return {
    kind: "deposit_paid",
    total,
    paid: effectivePaid,
    remaining: Math.max(0, total - effectivePaid),
    paidAt: lead.deposit_paid_at,
  };
}

export function fmtUsd(value: number): string {
  return formatUsdAmount(value, "en-US");
}

export function convertLeadLocalAmountToUsd(
  lead: {
    local_currency_code: string | null | undefined;
    usd_fx_rate_locked: number | null | undefined;
  },
  amountLocal: number | null | undefined
): number | null {
  return convertLocalToUsd(
    amountLocal,
    normalizeCurrencyCode(lead.local_currency_code),
    lead.usd_fx_rate_locked
  );
}
