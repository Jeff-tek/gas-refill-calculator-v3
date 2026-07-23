// components/BottleSummary.tsx
"use client";

import { useMemo, useRef, useEffect } from "react";
import type { Bottle, Transaction, Expense } from "@/lib/types";
import { naira, kg } from "@/lib/precision";
import { X, Share2, Printer } from "lucide-react";

interface Props {
  bottle: Bottle;
  transactions: Transaction[];
  expenses: Expense[];
  costPricePerKg: number;
  onClose: () => void;
}

function revenueOf(t: Transaction): number {
  return t.mode === "A" ? t.input : (t.cost ?? t.input * t.gsp);
}

export default function BottleSummary({ bottle, transactions, expenses, costPricePerKg, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const stats = useMemo(() => {
    const bottleTxns = transactions.filter((t) => t.bottleId === bottle.id);
    const bottleStart = bottle.createdAt;
    const bottleEnd = bottle.closedAt ?? Date.now();
    const bottleExpenses = expenses.filter(
      (e) => e.date >= bottleStart && e.date <= bottleEnd
    );

    let totalKg = 0;
    let totalRev = 0;
    let totalCost = 0;
    let fillCount = 0;
    let cashRev = 0;
    let transferRev = 0;

    bottleTxns.forEach((t) => {
      totalKg += t.filledKg;
      const rev = revenueOf(t);
      totalRev += rev;
      const cp = t.costPricePerKg ?? costPricePerKg;
      totalCost += cp > 0 ? t.filledKg * cp : 0;
      if (t.paymentMethod === "transfer") transferRev += rev;
      else cashRev += rev;
      fillCount++;
    });

    const totalExpenses = bottleExpenses.reduce((s, e) => s + e.amount, 0);
    const grossProfit = totalRev - totalCost;
    const netProfit = grossProfit - totalExpenses;
    const usedKg = bottle.capacity - bottle.remaining;

    return {
      totalKg,
      totalRev,
      totalCost,
      cashRev,
      transferRev,
      fillCount,
      totalExpenses,
      grossProfit,
      netProfit,
      usedKg,
      daysActive: Math.max(1, Math.round((bottleEnd - bottleStart) / 86400000)),
      bottleTxns,
    };
  }, [bottle, transactions, expenses, costPricePerKg]);

  function handleClose() {
    ref.current?.close();
    onClose();
  }

  async function doShare(title: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch { /* user cancelled */ }
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
      } catch { /* ignore */ }
    }
  }

  function shareSummary() {
    const text =
      `BOTTLE SUMMARY — ${bottle.name}\n` +
      `==============================\n` +
      `Period      : ${new Date(bottle.createdAt).toLocaleDateString()} – ${bottle.closedAt ? new Date(bottle.closedAt).toLocaleDateString() : "Now"}\n` +
      `Days Active : ${stats.daysActive}\n` +
      `Fills       : ${stats.fillCount}\n` +
      `Kg Dispensed: ${kg(stats.usedKg)} kg\n` +
      `Revenue     : ${naira(stats.totalRev)}\n` +
      `Cash        : ${naira(stats.cashRev)}\n` +
      `Transfer    : ${naira(stats.transferRev)}\n` +
      `Gas Cost    : -${naira(stats.totalCost)}\n` +
      (stats.totalExpenses > 0 ? `Expenses    : -${naira(stats.totalExpenses)}\n` : "") +
      `------------------------------\n` +
      `Net Profit  : ${stats.netProfit >= 0 ? "" : "-"}${naira(Math.abs(stats.netProfit))}`;
    doShare(`Bottle Summary — ${bottle.name}`, text);
  }

  return (
    <dialog ref={ref} className="bottle-summary-dialog" onClose={handleClose}>
      <div className="bs-body">
        <div className="bs-header">
          <div className="bs-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="3" width="10" height="18" rx="5" />
              <rect x="10" y="1" width="4" height="3" rx="1" />
            </svg>
          </div>
          <div>
            <h2>{bottle.name}</h2>
            <span className="bs-period">
              {new Date(bottle.createdAt).toLocaleDateString()} – {bottle.closedAt ? new Date(bottle.closedAt).toLocaleDateString() : "Present"}
            </span>
          </div>
          <button className="bs-close" onClick={handleClose}>
            <X size={14} />
          </button>
        </div>

        <div className="bs-kpis">
          <div className="bs-kpi">
            <span className="bs-kpi-label">Fills</span>
            <span className="bs-kpi-value">{stats.fillCount}</span>
          </div>
          <div className="bs-kpi">
            <span className="bs-kpi-label">Kg Dispensed</span>
            <span className="bs-kpi-value">{kg(stats.usedKg)}</span>
          </div>
          <div className="bs-kpi">
            <span className="bs-kpi-label">Days</span>
            <span className="bs-kpi-value">{stats.daysActive}</span>
          </div>
          <div className="bs-kpi">
            <span className="bs-kpi-label">Revenue</span>
            <span className="bs-kpi-value rev">{naira(stats.totalRev)}</span>
          </div>
        </div>

        <div className="bs-profit">
          <div className="bs-profit-row">
            <span>Revenue</span>
            <span>{naira(stats.totalRev)}</span>
          </div>
          <div className="bs-profit-row">
            <span>Gas Cost ({naira(costPricePerKg)}/kg)</span>
            <span className="neg">-{naira(stats.totalCost)}</span>
          </div>
          <div className="bs-profit-row">
            <span>Gross Profit</span>
            <span className={stats.grossProfit >= 0 ? "pos" : "neg"}>
              {stats.grossProfit >= 0 ? "" : "-"}{naira(Math.abs(stats.grossProfit))}
            </span>
          </div>
          {stats.totalExpenses > 0 && (
            <div className="bs-profit-row">
              <span>Other Expenses</span>
              <span className="neg">-{naira(stats.totalExpenses)}</span>
            </div>
          )}
          <div className="bs-profit-row total">
            <span>Net Profit</span>
            <span className={stats.netProfit >= 0 ? "pos" : "neg"}>
              {stats.netProfit >= 0 ? "" : "-"}{naira(Math.abs(stats.netProfit))}
            </span>
          </div>
        </div>

        <div className="bs-payment-breakdown">
          <div className="bs-pb-row">
            <span className="bs-pb-dot cash" /> Cash
            <span>{naira(stats.cashRev)}</span>
          </div>
          <div className="bs-pb-row">
            <span className="bs-pb-dot transfer" /> Transfer
            <span>{naira(stats.transferRev)}</span>
          </div>
        </div>

        <div className="bs-actions">
          <button className="bs-action" onClick={shareSummary}>
            <Share2 size={13} /> Share Summary
          </button>
          <button className="bs-action" onClick={() => window.print()}>
            <Printer size={13} /> Print
          </button>
        </div>
      </div>
    </dialog>
  );
}
