"use client";

import { useState, useTransition } from "react";
import { markFinalPaymentPaid } from "./actions";
import {
  derivePaymentState,
  fmtEur,
  type PaymentState,
} from "@/lib/payment-utils";

export type { PaymentState };
export { derivePaymentState };

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ─── Revenue card ───────────────────────────────────────────────────────── */

export function RevenueCard({
  leadId,
  proposalPrice,
  proposalDeposit,
  depositAmount,
  depositPaidAt,
  initialFinalPaymentPaidAt,
}: {
  leadId: string;
  proposalPrice: number | null;
  proposalDeposit: number | null;
  depositAmount: number | null;
  depositPaidAt: string | null;
  initialFinalPaymentPaidAt: string | null;
}) {
  const [finalPaidAt, setFinalPaidAt] = useState<string | null>(
    initialFinalPaymentPaidAt
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const state = derivePaymentState({
    proposal_price: proposalPrice,
    proposal_deposit: proposalDeposit,
    deposit_amount: depositAmount,
    deposit_paid_at: depositPaidAt,
    final_payment_paid_at: finalPaidAt,
  });

  function handleMarkFinal() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setError(null);
    setConfirm(false);
    startTransition(async () => {
      const result = await markFinalPaymentPaid(leadId);
      if (result.success) {
        setFinalPaidAt(new Date().toISOString());
      } else {
        setError(result.error ?? "Failed.");
      }
    });
  }

  if (state.kind === "no_price") {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30">
        <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-3">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
            Revenue
          </h2>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] text-zinc-700">
            No proposal price set. Add it in the Proposal section below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
      {/* Header + state badge */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
          Revenue
        </h2>
        {state.kind === "fully_paid" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
            Fully paid
          </span>
        )}
        {state.kind === "deposit_paid" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand/70" />
            Deposit paid
          </span>
        )}
        {state.kind === "unpaid" && (
          <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
            Unpaid
          </span>
        )}
      </div>

      <div className="space-y-3 px-4 py-3">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-x-3">
          {/* Total — always shown */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
              Total
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-200">
              {fmtEur(state.total)}
            </p>
          </div>

          {state.kind === "deposit_paid" && (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                  Paid
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-brand">
                  {fmtEur(state.paid)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                  Remaining
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-400">
                  {fmtEur(state.remaining)}
                </p>
              </div>
            </>
          )}

          {state.kind === "fully_paid" && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                Received
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-400">
                {fmtEur(state.total)}
              </p>
            </div>
          )}

          {state.kind === "unpaid" && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                Outstanding
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-500">
                {fmtEur(state.total)}
              </p>
            </div>
          )}
        </div>

        {/* Date line */}
        {(state.kind === "deposit_paid" || state.kind === "fully_paid") && (
          <p className="text-[11px] tabular-nums text-zinc-700">
            {state.kind === "deposit_paid"
              ? `Deposit received ${fmtDate(state.paidAt)}`
              : `Paid in full ${fmtDate(state.paidAt)}`}
          </p>
        )}

        {/* Final payment action — only when deposit paid but not fully paid */}
        {state.kind === "deposit_paid" && (
          <div className="border-t border-zinc-800/50 pt-3">
            {confirm ? (
              <div className="space-y-2">
                <p className="text-[11px] text-amber-500/80">
                  Mark {fmtEur(state.remaining)} as received? Cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkFinal}
                    disabled={isPending}
                    className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-[11px] font-medium text-brand transition-colors hover:bg-brand/15 disabled:cursor-wait disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirm(false)}
                    className="rounded-lg border border-zinc-700/60 px-3 py-1.5 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleMarkFinal}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-4 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-700/40 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-50"
              >
                Mark final payment received
              </button>
            )}
            {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
