// components/Dashboard.tsx
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { Transaction, Expense } from "@/lib/types";
import { fmt2, group, naira, kg, trunc2 } from "@/lib/precision";
import { BarChart, TrendingUp, TrendingDown, DollarSign, X, Calendar } from "lucide-react";

interface Props {
  transactions: Transaction[];
  expenses: Expense[];
  costPricePerKg: number;
  onClose: () => void;
}

type Period = "7d" | "30d" | "90d" | "all";

function formatDateFull(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "2-digit", year: "numeric",
  });
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function weekKey(ts: number): string {
  const d = new Date(ts);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

function revenueOf(t: Transaction): number {
  return t.mode === "A" ? t.input : (t.cost ?? t.input * t.gsp);
}

export default function Dashboard({ transactions, expenses, costPricePerKg, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [period, setPeriod] = useState<Period>("7d");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const now = Date.now();
  const periodCutoff = useMemo(() => {
    if (period === "all") return 0;
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    return now - days * 86400000;
  }, [period, now]);

  const filteredTxs = useMemo(
    () => transactions.filter((t) => t.ts >= periodCutoff),
    [transactions, periodCutoff]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.date >= periodCutoff),
    [expenses, periodCutoff]
  );

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

  /* Daily trend data for bar chart */
  const dailyData = useMemo(() => {
    const byDay: Record<string, { kg: number; rev: number; count: number }> = {};
    filteredTxs.forEach((t) => {
      const k = dayKey(t.ts);
      if (!byDay[k]) byDay[k] = { kg: 0, rev: 0, count: 0 };
      byDay[k].kg += t.filledKg;
      byDay[k].rev += revenueOf(t);
      byDay[k].count++;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14); // last 14 days
  }, [filteredTxs]);

  /* Weekly data */
  const weeklyData = useMemo(() => {
    const byWeek: Record<string, { kg: number; rev: number }> = {};
    filteredTxs.forEach((t) => {
      const k = weekKey(t.ts);
      if (!byWeek[k]) byWeek[k] = { kg: 0, rev: 0 };
      byWeek[k].kg += t.filledKg;
      byWeek[k].rev += revenueOf(t);
    });
    return Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTxs]);

  const maxDailyKg = Math.max(...dailyData.map(([, d]) => d.kg), 1);

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

        {/* Daily Bar Chart */}
        {dailyData.length > 0 && (
          <div className="dash-chart">
            <div className="dash-chart-title">Daily Sales (kg)</div>
            <div className="dash-bars">
              {dailyData.map(([day, data]) => {
                const pct = (data.kg / maxDailyKg) * 100;
                return (
                  <div className="dash-bar-col" key={day} title={`${day}: ${kg(data.kg)} kg, ${naira(data.rev)}`}>
                    <div className="dash-bar" style={{ height: `${Math.max(pct, 4)}%` }} />
                    <span className="dash-bar-label">
                      {new Date(day + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
