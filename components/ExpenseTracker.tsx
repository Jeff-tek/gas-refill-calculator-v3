// components/ExpenseTracker.tsx
"use client";

import { useState, useRef } from "react";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { loadExpenses, saveExpenses } from "@/lib/storage";
import { fmt2, group, naira } from "@/lib/precision";
import { Receipt, X, Trash2 } from "lucide-react";

interface Props {
  onClose: () => void;
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "gas-purchase", label: "Gas Purchase" },
  { value: "transport", label: "Transport" },
  { value: "maintenance", label: "Maintenance" },
  { value: "utility", label: "Utility" },
  { value: "salary", label: "Salary" },
  { value: "other", label: "Other" },
];

export default function ExpenseTracker({ onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [category, setCategory] = useState<ExpenseCategory>("gas-purchase");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useState(() => {
    ref.current?.showModal();
  });

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  function addExpense() {
    const amt = parseFloat(amount.replace(/,/g, ""));
    if (!description.trim() || isNaN(amt) || amt <= 0) {
      flash("Enter a valid description and amount");
      return;
    }
    const e: Expense = {
      id: crypto.randomUUID(),
      date: Date.now(),
      category,
      description: description.trim(),
      amount: amt,
    };
    const next = [e, ...expenses];
    setExpenses(next);
    saveExpenses(next);
    setDescription("");
    setAmount("");
    flash("Expense recorded");
  }

  function deleteExpense(id: string) {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    saveExpenses(next);
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  }

  function handleClose() {
    ref.current?.close();
    onClose();
  }

  return (
    <dialog ref={ref} className="expense-dialog" onClose={handleClose}>
      <div className="expense-body">
        <div className="expense-header">
          <Receipt size={16} />
          <h2>Expenses</h2>
          <button className="expense-close" onClick={handleClose}>
            <X size={14} />
          </button>
        </div>

        {/* Add form */}
        <div className="expense-form">
          <div className="ef-row">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="ef-row">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="ef-amount"
            />
            <button className="ef-add" onClick={addExpense}>Add</button>
          </div>
        </div>

        {/* Expense list */}
        <div className="expense-list">
          {expenses.length === 0 ? (
            <div className="expense-empty">No expenses recorded yet</div>
          ) : (
            expenses.map((e) => (
              <div className="expense-item" key={e.id}>
                <div className="ei-info">
                  <span className="ei-cat">{e.category.replace("-", " ")}</span>
                  <span className="ei-desc">{e.description}</span>
                  <span className="ei-date">{formatDate(e.date)}</span>
                </div>
                <div className="ei-right">
                  <span className="ei-amt">{naira(e.amount)}</span>
                  <button className="ei-del" onClick={() => deleteExpense(e.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {expenses.length > 0 && (
          <div className="expense-total">
            Total: {naira(expenses.reduce((s, e) => s + e.amount, 0))}
          </div>
        )}

        {toast && <div className="expense-toast">{toast}</div>}
      </div>
    </dialog>
  );
}
