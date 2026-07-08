// lib/storage.ts
//
// Safe localStorage wrapper. Guards against SSR (no window) and
// sandboxed/blocked storage (access throws). Falls back to an
// in-memory map so the app never crashes. On a normal browser
// session everything persists across reloads and tab closes.

import type { Transaction } from "./types";

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

export const LS_GSP = "gasrefill_gsp_v1";
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

export function loadGsp(fallback: string): string {
  const v = getItem(LS_GSP);
  return v !== null && v !== "" ? v : fallback;
}

export function saveGsp(v: string): void {
  setItem(LS_GSP, v);
}
