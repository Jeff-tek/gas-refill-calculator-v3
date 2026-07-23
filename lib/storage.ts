// lib/storage.ts
//
// Safe localStorage wrapper. Guards against SSR (no window) and
// sandboxed/blocked storage (access throws). Falls back to an
// in-memory map so the app never crashes. On a normal browser
// session everything persists across reloads and tab closes.

import type {
  Bottle,
  Transaction,
  Expense,
  BusinessSettings,
  DEFAULT_BUSINESS_SETTINGS,
  BackupData,
} from "./types";

const mem: Record<string, string> = {};

function canUseLS(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function getItem(key: string): string | null {
  try {
    if (canUseLS()) return window.localStorage.getItem(key);
  } catch {
    /* fall through */
  }
  return key in mem ? mem[key] : null;
}

export function setItem(key: string, value: string): void {
  try {
    if (canUseLS()) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    /* fall through */
  }
  mem[key] = value;
}

export function removeItem(key: string): void {
  try {
    if (canUseLS()) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch {
    /* fall through */
  }
  delete mem[key];
}

/* ── GSP ── */
export const LS_GSP = "gasrefill_gsp_v1";

export function loadGsp(fallback: string): string {
  const v = getItem(LS_GSP);
  return v !== null && v !== "" ? v : fallback;
}

export function saveGsp(v: string): void {
  setItem(LS_GSP, v);
}

/* ── History ── */
export const LS_HIST = "gasrefill_history_v1";

export function loadHistory(): Transaction[] {
  try {
    const raw = getItem(LS_HIST);
    const parsed = raw ? (JSON.parse(raw) as Transaction[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(h: Transaction[]): void {
  setItem(LS_HIST, JSON.stringify(h));
}

/* ── Bottles ── */
export const LS_BOTTLES = "gasrefill_bottles_v1";

export function loadBottles(): Bottle[] {
  try {
    const raw = getItem(LS_BOTTLES);
    const parsed = raw ? (JSON.parse(raw) as Bottle[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBottles(b: Bottle[]): void {
  setItem(LS_BOTTLES, JSON.stringify(b));
}

/* ── Expenses ── */
export const LS_EXPENSES = "gasrefill_expenses_v1";

export function loadExpenses(): Expense[] {
  try {
    const raw = getItem(LS_EXPENSES);
    const parsed = raw ? (JSON.parse(raw) as Expense[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExpenses(e: Expense[]): void {
  setItem(LS_EXPENSES, JSON.stringify(e));
}

/* ── Business Settings ── */
export const LS_SETTINGS = "gasrefill_settings_v1";

export function loadSettings(): BusinessSettings | null {
  try {
    const raw = getItem(LS_SETTINGS);
    return raw ? (JSON.parse(raw) as BusinessSettings) : null;
  } catch {
    return null;
  }
}

export function saveSettings(s: BusinessSettings): void {
  setItem(LS_SETTINGS, JSON.stringify(s));
}

/* ── Cost Price ── */
export const LS_COST_PRICE = "gasrefill_cost_price_v1";

export function loadCostPrice(fallback: string): string {
  const v = getItem(LS_COST_PRICE);
  return v !== null && v !== "" ? v : fallback;
}

export function saveCostPrice(v: string): void {
  setItem(LS_COST_PRICE, v);
}

/* ── Backup & Restore ── */
export function exportBackupData(): BackupData {
  return {
    version: 1,
    exportedAt: Date.now(),
    businessName: "",
    transactions: loadHistory(),
    bottles: loadBottles(),
    expenses: loadExpenses(),
    settings: loadSettings() ?? {
      businessName: "Gas Refill Terminal",
      receiptFooter: "Thank you for your patronage!",
      currencySymbol: "\u20A6",
      currencyCode: "NGN",
    },
  };
}

export function importBackupData(data: BackupData): {
  transactions: number;
  bottles: number;
  expenses: number;
} {
  if (!data || data.version !== 1) {
    throw new Error("Invalid backup file format");
  }
  if (Array.isArray(data.transactions)) saveHistory(data.transactions);
  if (Array.isArray(data.bottles)) saveBottles(data.bottles);
  if (Array.isArray(data.expenses)) saveExpenses(data.expenses);
  if (data.settings) saveSettings(data.settings);

  return {
    transactions: data.transactions?.length ?? 0,
    bottles: data.bottles?.length ?? 0,
    expenses: data.expenses?.length ?? 0,
  };
}

export function clearAllData(): void {
  removeItem(LS_GSP);
  removeItem(LS_HIST);
  removeItem(LS_BOTTLES);
  removeItem(LS_EXPENSES);
  removeItem(LS_SETTINGS);
  removeItem(LS_COST_PRICE);
}
