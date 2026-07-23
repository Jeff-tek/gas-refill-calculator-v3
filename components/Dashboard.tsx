// components/Dashboard.tsx
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { Transaction, Expense, Bottle } from "@/lib/types";
import { naira, kg } from "@/lib/precision";
import { BarChart, X } from "lucide-react";

interface Props {
  transactions: Transaction[];
  expenses: Expense[];
  costPricePerKg: number;
  bottles: Bottle[];
  activeBottleId: string | null;
  onClose: () => void;
}

type Period = "7d" | "30d" | "90d" | "all";
type BottleFilter = "all" | "active" | string; // "all", "active", or specific bottleId

function revenueOf(t: Transaction): number {
  return t.mode === "A" ? t.input : (t.cost ?? t.input * t.gsp);
}

function GasCylinder({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <rect x="10" y="1" width="4" height="3" rx="1" />
      <rect x="9" y="3" width="6" height="2" rx="1" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

export default function Dashboard({ transactions, expenses, costPricePerKg, bottles, activeBottleId, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [period, setPeriod] = useState<Period>("7d");
  const [bottleFilter, setBottleFilter] = useState<BottleFilter>("active");

  /** Stable midnight-aligned reference for period filtering.
   *  Initialized once on mount so period boundaries are clean
   *  day-level cutoffs that don't drift on re-render. */
  const [now] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const periodCutoff = useMemo(() => {
    if (period === "all") return 0;
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    return now - days * 86400000;
  }, [period, now]);

  const filteredTxs = useMemo(() => {
    let txns = transactions.filter((t) => t.ts >= periodCutoff);
    if (bottleFilter !== "all") {
      const targetId = bottleFilter === "active" ? activeBottleId : bottleFilter;
      if (targetId) {
        txns = txns.filter((t) => t.bottleId === targetId);
      }
    }
    return txns;
  }, [transactions, periodCutoff, bottleFilter, activeBottleId]);

  const filteredExpenses = useMemo(() => {
    let exps = expenses.filter((e) => e.date >= periodCutoff);
    // For bottle-specific view, filter expenses to the bottle's lifespan
    if (bottleFilter !== "all") {
      const targetId = bottleFilter === "active" ? activeBottleId : bottleFilter;
      if (targetId) {
        const bottle = bottles.find((b) => b.id === targetId);
        if (bottle) {
          const start = bottle.createdAt;
          const end = bottle.closedAt ?? Date.now();
          exps = exps.filter((e) => e.date >= start && e.date <= end);
        }
      }
    }
    return exps;
  }, [expenses, periodCutoff, bottleFilter, activeBottleId, bottles]);

  const stats = useMemo(() => {
    let totalKg = 0;
    let totalRev = 0;
    let totalCost = 0;
    let cashRev = 0;
    let transferRev = 0;
    let fillCount = 0;

    filteredTxs.forEach((t) => {
      totalKg += t.filledKg;
      const rev = revenueOf(t);
      totalRev += rev;
      const costPrice = t.costPricePerKg ?? costPricePerKg;
      totalCost += costPrice > 0 ? t.filledKg * costPrice : 0;
      if (t.paymentMethod === "transfer") transferRev += rev;
      else cashRev += rev;
      fillCount++;
    });

    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const grossProfit = totalRev - totalCost;
    const netProfit = grossProfit - totalExpenses;

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
      avgPerFill: fillCount > 0 ? totalKg / fillCount : 0,
      avgRevenuePerFill: fillCount > 0 ? totalRev / fillCount : 0,
    };
  }, [filteredTxs, filteredExpenses, costPricePerKg]);

  function handleClose() {
    ref.current?.close();
    onClose();
  }

  return (
    <dialog ref={ref} className="dashboard-dialog" onClose={handleClose}>
      <div className="dash-body">
        <div className="dash-header">
          <BarChart size={16} />
          <h2>Dashboard</h2>
          <div className="dash-period">
            {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
              <button
                key={p}
                className={period === p ? "active" : ""}
                onClick={() => setPeriod(p)}
              >
                {p === "all" ? "All" : p}
              </button>
            ))}
          </div>
          <button className="dash-close" onClick={handleClose}>
            <X size={14} />
          </button>
        </div>

        {/* Bottle Filter */}
        {bottles.length > 0 && (
          <div className="dash-bottle-filter">
            <GasCylinder size={14} />
            <select
              value={bottleFilter}
              onChange={(e) => setBottleFilter(e.target.value as BottleFilter)}
              className="dash-bottle-select"
            >
              <option value="active">Active Bottle</option>
              {bottles.filter(b => b.closedAt).map((b) => (
                <option key={b.id} value={b.id}>{b.name} (closed)</option>
              ))}
              <option value="all">All Bottles</option>
            </select>
          </div>
        )}

        {/* Bottle Info when filtered */}
        {bottleFilter !== "all" && (() => {
          const targetId = bottleFilter === "active" ? activeBottleId : bottleFilter;
          const bottle = targetId ? bottles.find((b) => b.id === targetId) : null;
          if (!bottle) return null;
          const used = bottle.capacity - bottle.remaining;
          const pct = bottle.capacity > 0 ? (bottle.remaining / bottle.capacity) * 100 : 0;
          return (
            <div className="dash-bottle-info">
              <div className="dash-bi-head">
                <GasCylinder size={16} />
                <span>{bottle.name}</span>
                <span className="dash-bi-status">{bottle.closedAt ? "Closed" : "Active"}</span>
              </div>
              <div className="dash-bi-track">
                <div className="dash-bi-fill" style={{width: pct + "%"}} />
              </div>
              <div className="dash-bi-stats">
                <span>Used <strong>{kg(used)}</strong> kg</span>
                <span>Left <strong>{kg(bottle.remaining)}</strong> kg</span>
                <span>Capacity <strong>{kg(bottle.capacity)}</strong> kg</span>
              </div>
            </div>
          );
        })()}

        {/* KPI Cards */}
        <div className="dash-kpis">
          <div className="kpi-card">
            <span className="kpi-label">Revenue</span>
            <span className="kpi-value">{naira(stats.totalRev)}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Kg Sold</span>
            <span className="kpi-value">{kg(stats.totalKg)}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Fills</span>
            <span className="kpi-value">{stats.fillCount}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Avg/Fill</span>
            <span className="kpi-value">{kg(stats.avgPerFill)}</span>
          </div>
        </div>

        {/* Profit Summary */}
        {costPricePerKg > 0 && (
          <div className="dash-profit">
            <div className="profit-row">
              <span>Revenue</span>
              <span>{naira(stats.totalRev)}</span>
            </div>
            <div className="profit-row">
              <span>Gas Cost ({naira(costPricePerKg)}/kg)</span>
              <span className="neg">-{naira(stats.totalCost)}</span>
            </div>
            {stats.totalExpenses > 0 && (
              <div className="profit-row">
                <span>Other Expenses</span>
                <span className="neg">-{naira(stats.totalExpenses)}</span>
              </div>
            )}
            <div className="profit-row total">
              <span>Net Profit</span>
              <span className={stats.netProfit >= 0 ? "pos" : "neg"}>
                {stats.netProfit >= 0 ? "" : "-"}{naira(Math.abs(stats.netProfit))}
              </span>
            </div>
          </div>
        )}

        {/* Payment Breakdown */}
        <div className="dash-payment-breakdown">
          <div className="pb-row">
            <span className="pb-dot cash" /> Cash
            <span>{naira(stats.cashRev)}</span>
          </div>
          <div className="pb-row">
            <span className="pb-dot transfer" /> Transfer
            <span>{naira(stats.transferRev)}</span>
          </div>
        </div>

        {/* Expenses Summary */}
        {filteredExpenses.length > 0 && (
          <div className="dash-expenses">
            <div className="dash-section-title">Expenses ({filteredExpenses.length})</div>
            <div className="dash-expense-list">
              {filteredExpenses.map((e) => (
                <div className="dash-expense-item" key={e.id}>
                  <span className="de-cat">{e.category}</span>
                  <span className="de-desc">{e.description}</span>
                  <span className="de-amt">{naira(e.amount)}</span>
                </div>
              ))}
            </div>
            <div className="dash-expense-total">
              Total: {naira(stats.totalExpenses)}
            </div>
          </div>
        )}

        {filteredTxs.length === 0 && (
          <div className="dash-empty">
            <BarChart size={24} />
            <p>No data for the selected period</p>
          </div>
        )}
      </div>
    </dialog>
  );
}
