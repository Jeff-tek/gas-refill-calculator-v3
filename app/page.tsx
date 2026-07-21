// app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  AlertTriangle,
  ReceiptText,
  CalendarClock,
  Share2,
  Trash2,
  Copy,
  Printer,
  Check,
  CheckCircle,
} from "lucide-react";
import { fmt2, group, naira, kg, parseField } from "@/lib/precision";
import {
  loadHistory,
  saveHistory,
  loadGsp,
  saveGsp,
  loadBottles,
  saveBottles,
} from "@/lib/storage";
import type { Bottle, FillMode, PaymentMethod, Transaction } from "@/lib/types";

const GSP_DEFAULT = "1700";

/* ---- date helpers ---- */
function revenueOf(t: Transaction): number {
  return t.mode === "A" ? t.input : t.cost ?? t.input * t.gsp;
}
function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
  });
}
function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function txnText(t: Transaction): string {
  return (
    "GAS REFILL RECEIPT\n" +
    "------------------------------\n" +
    new Date(t.ts).toLocaleString() +
    "\n" +
    "Mode          : " +
    (t.mode === "A" ? "Price paid" : "Kg wanted") +
    "\n" +
    "GSP           : " +
    naira(t.gsp) +
    "/kg\n" +
    "Payment       : " +
    (t.paymentMethod === "transfer" ? "Transfer" : "Cash") +
    "\n" +
    "Start (CSR)   : " +
    kg(t.csr) +
    " kg\n" +
    (t.mode === "A"
      ? "Amount paid   : " + naira(t.input)
      : "Kg requested  : " + kg(t.input) + " kg") +
    "\n" +
    (t.mode === "A"
      ? "Kg filled     : " + kg(t.filledKg) + " kg"
      : "Cost          : " + naira(t.cost ?? 0)) +
    "\n" +
    "------------------------------\n" +
    "FINAL READING : " +
    kg(t.finalKg) +
    " kg"
  );
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

export default function Home() {
  const [gsp, setGsp] = useState(GSP_DEFAULT);
  const [csr, setCsr] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<FillMode>("A");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [pendingPay, setPendingPay] = useState<PaymentMethod>("cash");
  const [history, setHistory] = useState<Transaction[]>([]);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [newBottleName, setNewBottleName] = useState("");
  const [bottleCapacity, setBottleCapacity] = useState("55");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const payDialogRef = useRef<HTMLDialogElement>(null);
  const bottleDialogRef = useRef<HTMLDialogElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeBottle = bottles.find((b) => b.closedAt === undefined) ?? null;

  /* hydrate from storage (client only) */
  useEffect(() => {
    setGsp(loadGsp(GSP_DEFAULT));
    setHistory(loadHistory());
    const saved = loadBottles();
    if (saved.length === 0) {
      const def: Bottle = {
        id: crypto.randomUUID(),
        name: "Bottle #1",
        capacity: 55,
        remaining: 55,
        createdAt: Date.now(),
      };
      setBottles([def]);
      saveBottles([def]);
    } else {
      setBottles(saved);
    }
  }, []);

  /* persist GSP whenever it is a valid positive number */
  useEffect(() => {
    const g = parseField(gsp);
    if (!g.empty && !g.nan && g.value > 0) saveGsp(String(g.value));
  }, [gsp]);

  function flashToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  /* ---- compute derived state + validation ---- */
  const calc = useMemo(() => {
    const g = parseField(gsp);
    const c = parseField(csr);
    const a = parseField(amount);
    const errs: string[] = [];
    let gspInvalid = false;
    let csrInvalid = false;
    let amountInvalid = false;
    let csrMsg = "";
    let amountMsg = "";

    if (g.empty) {
      gspInvalid = true;
      errs.push("GSP is required");
    } else if (g.nan) {
      gspInvalid = true;
      errs.push("GSP must be a number");
    } else if (g.value < 0) {
      gspInvalid = true;
      errs.push("GSP cannot be negative");
    } else if (g.value === 0) {
      gspInvalid = true;
      errs.push("GSP cannot be 0 (division by zero)");
    }

    let csrVal = 0;
    if (!c.empty) {
      if (c.nan || c.value < 0) {
        csrInvalid = true;
        csrMsg = c.nan ? "Not a valid number" : "CSR cannot be negative";
        errs.push("CSR is invalid");
      } else {
        csrVal = c.value;
      }
    }

    const amtName = mode === "A" ? "Price" : "Kg";
    if (a.empty) {
      amountMsg = mode === "A" ? "Enter the price paid" : "Enter kg wanted";
      errs.push(amtName + " is required");
    } else if (a.nan || a.value < 0) {
      amountInvalid = true;
      amountMsg = a.nan ? "Not a valid number" : amtName + " cannot be negative";
      errs.push(amtName + " is invalid");
    }

    if (errs.length) {
      return {
        ok: false as const,
        errs,
        gspInvalid,
        csrInvalid,
        amountInvalid,
        csrMsg,
        amountMsg,
      };
    }

    let finalKg: number;
    let filledKg: number;
    let cost: number | undefined;
    if (mode === "A") {
      filledKg = a.value / g.value; // full precision
      finalKg = csrVal + filledKg; // full precision
    } else {
      filledKg = a.value;
      finalKg = csrVal + a.value;
      cost = a.value * g.value; // full precision
    }

    return {
      ok: true as const,
      gsp: g.value,
      csr: csrVal,
      input: a.value,
      finalKg,
      filledKg,
      cost,
    };
  }, [gsp, csr, amount, mode]);

  /* ---- record ---- */
  function record() {
    if (!calc.ok || !activeBottle) return;
    setPendingPay("cash");
    requestAnimationFrame(() => payDialogRef.current?.showModal());
  }

  function confirmRecord(method: PaymentMethod) {
    if (!calc.ok || !activeBottle) return;
    const t: Transaction = {
      ts: Date.now(),
      gsp: calc.gsp,
      csr: calc.csr,
      mode,
      input: calc.input,
      finalKg: calc.finalKg,
      filledKg: calc.filledKg,
      cost: mode === "B" ? calc.cost : undefined,
      paymentMethod: method,
      bottleId: activeBottle.id,
    };
    const next = [t, ...history];
    setHistory(next);
    saveHistory(next);

    const updatedBottles = bottles.map((b) =>
      b.id === activeBottle.id
        ? { ...b, remaining: Math.max(0, b.remaining - calc.filledKg) }
        : b
    );
    setBottles(updatedBottles);
    saveBottles(updatedBottles);

    setRecorded(true);
    flashToast("Fill recorded");
    setTimeout(() => setRecorded(false), 1100);
    payDialogRef.current?.close();
  }

  function deleteTxn(id: number) {
    const t = history.find((x) => x.ts === id);
    const label = t ? `${kg(t.finalKg)} kg fill` : "this entry";
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    const next = history.filter((x) => x.ts !== id);
    setHistory(next);
    saveHistory(next);
    if (t) {
      const updated = bottles.map((b) =>
        b.id === t.bottleId ? { ...b, remaining: Math.min(b.capacity, b.remaining + t.filledKg) } : b
      );
      setBottles(updated);
      saveBottles(updated);
    }
    flashToast("Entry deleted");
  }

  function clearAll() {
    if (!confirm("Clear ALL recorded transactions? This cannot be undone."))
      return;
    setHistory([]);
    saveHistory([]);
    flashToast("Log cleared");
  }

  /* ---- bottle management ---- */
  function openNewBottle() {
    setNewBottleName("");
    setBottleCapacity("55");
    requestAnimationFrame(() => bottleDialogRef.current?.showModal());
  }

  function createBottle() {
    const name = newBottleName.trim() || `Bottle #${bottles.length + 1}`;
    const cap = parseField(bottleCapacity);
    const capacity = cap.empty || cap.nan || cap.value <= 0 ? 55 : cap.value;
    const now = Date.now();
    const updated = bottles.map((b) =>
      b.closedAt === undefined ? { ...b, closedAt: now } : b
    );
    const newB: Bottle = {
      id: crypto.randomUUID(),
      name,
      capacity,
      remaining: capacity,
      createdAt: now,
    };
    const next = [...updated, newB];
    setBottles(next);
    saveBottles(next);
    bottleDialogRef.current?.close();
    flashToast(`Started "${name}"`);
  }

  /* ---- share (real Web Share API, clipboard fallback) ---- */
  async function doShare(title: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch {
        /* user cancelled */
      }
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        flashToast("Copied to clipboard");
      } catch {
        flashToast("Sharing not supported here");
      }
      return;
    }
    flashToast("Sharing not supported here");
  }

  function shareDay(k: string) {
    const items = history
      .filter((t) => dayKey(t.ts) === k)
      .sort((a, b) => a.ts - b.ts);
    if (!items.length) return;
    let kgSum = 0;
    let revSum = 0;
    items.forEach((t) => {
      kgSum += t.filledKg;
      revSum += revenueOf(t);
    });
    const lines = items
      .map((t, i) => {
        const v = t.mode === "A" ? "paid " + naira(t.input) : kg(t.input) + " kg";
        return `${i + 1}) ${clockTime(t.ts)}  ${v}  \u2192  ${kg(
          t.filledKg
        )} kg (final ${kg(t.finalKg)})`;
      })
      .join("\n");
    const text =
      "GAS REFILL \u2014 DAILY SUMMARY\n" +
      dayLabel(items[0].ts) +
      "\n" +
      "------------------------------\n" +
      "Fills         : " +
      items.length +
      "\n" +
      "Kg dispensed  : " +
      kg(kgSum) +
      " kg\n" +
      "Revenue       : " +
      naira(revSum) +
      "\n" +
      "------------------------------\n" +
      lines;
    doShare("Gas Refill \u2014 Daily Summary", text);
  }

  /* ---- receipt modal ---- */
  function openReceipt(t: Transaction) {
    setReceipt(t);
    setCopied(false);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }
  function closeReceipt() {
    dialogRef.current?.close();
    setReceipt(null);
  }
  async function copyReceipt() {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(txnText(receipt));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  /* ---- derived: today's summary + grouped log ---- */
  const todayK = dayKey(Date.now());
  const todayStats = useMemo(() => {
    let kgSum = 0;
    let revSum = 0;
    let count = 0;
    let cashRev = 0;
    let transferRev = 0;
    history.forEach((t) => {
      if (dayKey(t.ts) === todayK) {
        kgSum += t.filledKg;
        revSum += revenueOf(t);
        count++;
        if (t.paymentMethod === "transfer") transferRev += revenueOf(t);
        else cashRev += revenueOf(t);
      }
    });
    return { kgSum, revSum, count, cashRev, transferRev };
  }, [history, todayK]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const byDay: Record<string, Transaction[]> = {};
    history.forEach((t) => {
      const k = dayKey(t.ts);
      if (!byDay[k]) {
        byDay[k] = [];
        order.push(k);
      }
      byDay[k].push(t);
    });
    return order.map((k) => {
      const items = byDay[k];
      let kgSum = 0;
      let revSum = 0;
      items.forEach((t) => {
        kgSum += t.filledKg;
        revSum += revenueOf(t);
      });
      return { key: k, items, kgSum, revSum };
    });
  }, [history]);

  const secondary = calc.ok
    ? mode === "A"
      ? { label: "Kg filled", value: kg(calc.filledKg) + " kg", isKg: true }
      : { label: "Cost", value: naira(calc.cost ?? 0), isKg: false }
    : { label: mode === "A" ? "Kg filled" : "Cost", value: "\u2014", isKg: mode === "A" };

  return (
    <div className="app">
      <header className="mast">
        <div className="brand">
          <div className="glyph">
            <Flame size={20} />
          </div>
          <div>
            <h1>Gas Refill</h1>
            <span>Scale &middot; Terminal</span>
          </div>
        </div>
        <div className={"gsp-chip" + (calc.ok ? "" : calc.gspInvalid ? " invalid" : "")}>
          <span className="k">GSP</span>
          <span className="field">
            <span className="nara">&#8358;</span>
            <input
              type="text"
              inputMode="decimal"
              value={gsp}
              onChange={(e) => setGsp(e.target.value)}
              aria-label="General selling price per kg"
            />
          </span>
          <span className="u">/kg</span>
        </div>
        {activeBottle && (
          <div className="bottle-chip" onClick={openNewBottle} title="Start new bottle">
            <GasCylinder size={16} />
            <div className="bc-info">
              <span className="bc-name">{activeBottle.name}</span>
              <span className="bc-pct"><span>{kg(activeBottle.remaining)}</span> / {kg(activeBottle.capacity)} kg</span>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="console" aria-live="polite">
          <div className="readout-label">
            <span className={"dot" + (calc.ok ? "" : " err")} /> Expected Final Scale Reading
          </div>
          <div className="readout">
            <span className={"num" + (calc.ok ? "" : " blocked")}>
              {calc.ok ? kg(calc.finalKg) : "0.00"}
            </span>
            <span className="unit">kg</span>
          </div>

          <div className="secondary">
            <span className="lab">{secondary.label}</span>
            <span className={"val" + (secondary.isKg ? " kg" : "")}>{secondary.value}</span>
          </div>

          {!calc.ok && (
            <div className="console-err">
              <AlertTriangle size={15} />
              <ul>
                {calc.errs.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="controls">
            <div className={"toggle" + (mode === "B" ? " mode-b" : "")} role="tablist" aria-label="Fill mode">
              <div className="slider" />
              <button
                className={mode === "A" ? "active" : ""}
                role="tab"
                aria-selected={mode === "A"}
                onClick={() => setMode("A")}
              >
                Price &#8358;
              </button>
              <button
                className={mode === "B" ? "active" : ""}
                role="tab"
                aria-selected={mode === "B"}
                onClick={() => setMode("B")}
              >
                Kg wanted
              </button>
            </div>

            <div className="field-row">
              <div className="field-grp">
                <label className="lbl" htmlFor="csr">
                  Current Scale Reading <span className="hint">defaults 0</span>
                </label>
                <div className={"inp" + (!calc.ok && calc.csrInvalid ? " invalid" : "")}>
                  <input
                    id="csr"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={csr}
                    onChange={(e) => setCsr(e.target.value)}
                  />
                  <span className="suf">kg</span>
                </div>
                {!calc.ok && calc.csrMsg && <p className="err-msg">{calc.csrMsg}</p>}
              </div>

              <div className="field-grp">
                <label className="lbl" htmlFor="amount">
                  <span>{mode === "A" ? "Price customer pays" : "Kg customer wants"}</span>
                </label>
                <div className={"inp" + (!calc.ok && calc.amountInvalid ? " invalid" : "")}>
                  {mode === "A" && <span className="pre">&#8358;</span>}
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {mode === "B" && <span className="suf">kg</span>}
                </div>
                {!calc.ok && calc.amountMsg && <p className="err-msg">{calc.amountMsg}</p>}
              </div>
            </div>

            <button className="record" disabled={!calc.ok} onClick={record}>
              <span>{recorded ? "Recorded \u2713" : "Record fill"}</span>
            </button>
          </div>
        </section>
      </main>

      <aside className="ledger">
        <div className="ledger-head">
          <h2>Sales Log</h2>
          {history.length > 0 && (
            <button className="clr" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>

        {activeBottle && (() => {
          const pct = activeBottle.capacity > 0 ? (activeBottle.remaining / activeBottle.capacity) * 100 : 0;
          const used = activeBottle.capacity - activeBottle.remaining;
          return (
            <div className="bottle-card">
              <div className="bc-head">
                <div className="bcl">
                  <GasCylinder size={18} />
                  <div>
                    <div className="bcn">{activeBottle.name}</div>
                    <div className="bcs">Started {new Date(activeBottle.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
              <div className="bottle-track">
                <div className={"bt-fill" + (pct < 20 ? " low" : "")} style={{width: pct + "%"}} />
                <div className="bt-label">{Math.round(pct)}% remaining</div>
              </div>
              <div className="bottle-stats">
                <span>Used <strong className="used">{kg(used)}</strong> kg</span>
                <span>Left <strong>{kg(activeBottle.remaining)}</strong> kg</span>
                <span>Capacity <strong>{kg(activeBottle.capacity)}</strong> kg</span>
              </div>
              <button className="bottle-new-btn" onClick={openNewBottle}>
                + New Bottle
              </button>
            </div>
          );
        })()}

        <div className="today">
          <div className="today-head">
            <span className="lbl">
              <CalendarClock size={13} /> Today
            </span>
            <span className="date">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "2-digit",
              })}
            </span>
          </div>
          <div className="stats">
            <div className="stat">
              <span className="n">{kg(todayStats.kgSum)}</span>
              <span className="l">kg sold</span>
            </div>
            <div className="stat">
              <span className="n rev">{naira(todayStats.revSum)}</span>
              <span className="l">revenue</span>
            </div>
            <div className="stat">
              <span className="n">{todayStats.count}</span>
              <span className="l">fills</span>
            </div>
          </div>
          <div className="pay-breakdown">
            <span className="pb-item"><span className="pb-dot cash" /> Cash {naira(todayStats.cashRev)}</span>
            <span className="pb-item"><span className="pb-dot transfer" /> Transfer {naira(todayStats.transferRev)}</span>
          </div>
          <button className="today-share" onClick={() => shareDay(todayK)}>
            <Share2 size={12} /> Share today&apos;s summary
          </button>
        </div>

        {history.length === 0 ? (
          <div className="empty">
            <ReceiptText size={30} />
            <p>
              No fills recorded yet.
              <br />
              Recorded transactions appear here.
            </p>
          </div>
        ) : (
          <div className="day-groups">
            {groups.map((grp) => (
              <div className="day-group" key={grp.key}>
                <div className="day-head">
                  <span className="dd">{dayLabel(grp.items[0].ts)}</span>
                  <span className="sub">
                    {grp.items.length} fills &middot; {kg(grp.kgSum)} kg &middot; {naira(grp.revSum)}
                  </span>
                  <button className="ds" title="Share day" onClick={() => shareDay(grp.key)}>
                    <Share2 size={13} />
                  </button>
                </div>
                <ul className="txn-list">
                  {grp.items.map((t) => {
                    const desc =
                      t.mode === "A"
                        ? `Paid ${naira(t.input)} @ ${naira(t.gsp)}/kg`
                        : `${kg(t.input)} kg @ ${naira(t.gsp)}/kg`;
                    const payIcon = t.paymentMethod === "transfer" ? "\u2192" : "\u25CF";
                    return (
                      <li className="txn" key={t.ts}>
                        <button className="txn-main" onClick={() => openReceipt(t)}>
                          <span className={"tag " + (t.mode === "A" ? "a" : "b")}>
                            {t.mode === "A" ? "\u20A6" : "KG"}
                          </span>
                          <span className="mid">
                            <span className="t pay-indicator">{payIcon} {clockTime(t.ts)}</span>
                            <span className="d">{desc}</span>
                          </span>
                          <span className="fin">
                            <span className="n">{kg(t.finalKg)}</span>
                            <span className="u">KG FINAL</span>
                          </span>
                        </button>
                        <button className="txn-del" title="Delete" onClick={() => deleteTxn(t.ts)}>
                          <Trash2 size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </aside>

      <dialog ref={dialogRef} onClose={() => setReceipt(null)}>
        {receipt && (
          <div className="receipt">
            <div className="rc-top">
              <div className="k">Final Scale Reading</div>
              <div className="big">
                {kg(receipt.finalKg)} <small>kg</small>
              </div>
            </div>
            <div className="rc-body">
              <div className="rc-row">
                <span className="k">Timestamp</span>
                <span className="v">
                  {new Date(receipt.ts).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="rc-row">
                <span className="k">Mode</span>
                <span className="v">{receipt.mode === "A" ? "Price paid" : "Kg wanted"}</span>
              </div>
              <div className="rc-row">
                <span className="k">Payment</span>
                <span className="v" style={{textTransform:"capitalize"}}>{receipt.paymentMethod ?? "Cash"}</span>
              </div>
              <div className="rc-row">
                <span className="k">GSP</span>
                <span className="v">{naira(receipt.gsp)}/kg</span>
              </div>
              <div className="rc-row">
                <span className="k">Start reading (CSR)</span>
                <span className="v">{kg(receipt.csr)} kg</span>
              </div>
              <div className="rc-row">
                <span className="k">{receipt.mode === "A" ? "Amount paid" : "Kg requested"}</span>
                <span className="v">
                  {receipt.mode === "A" ? naira(receipt.input) : kg(receipt.input) + " kg"}
                </span>
              </div>
              <div className="rc-row">
                <span className="k">{receipt.mode === "A" ? "Kg filled" : "Cost"}</span>
                <span className="v">
                  {receipt.mode === "A"
                    ? kg(receipt.filledKg) + " kg"
                    : naira(receipt.cost ?? 0)}
                </span>
              </div>
              <div className="rc-row">
                <span className="k">Final reading</span>
                <span className="v">{kg(receipt.finalKg)} kg</span>
              </div>
            </div>
            <div className="rc-actions">
              <button onClick={copyReceipt}>
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={() => doShare("Gas Refill Receipt", txnText(receipt))}>
                <Share2 size={13} /> Share
              </button>
              <button onClick={() => window.print()}>
                <Printer size={13} /> Print
              </button>
              <button className="close" onClick={closeReceipt}>
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={payDialogRef} className="bottle-dialog">
        {calc.ok && (
          <div className="receipt">
            <div className="pay-confirm">
              <h2>Confirm Fill &amp; Payment</h2>
              <div className="pc-summary">
                <div className="pc-row">
                  <span className="k">Final reading</span>
                  <span className="v pay-highlight">{kg(calc.finalKg)} kg</span>
                </div>
                <div className="pc-row">
                  <span className="k">{mode === "A" ? "Kg filled" : "Cost"}</span>
                  <span className="v">{mode === "A" ? kg(calc.filledKg) + " kg" : naira(calc.cost ?? 0)}</span>
                </div>
                <div className="pc-row">
                  <span className="k">Bottle</span>
                  <span className="v">{activeBottle?.name ?? "\u2014"}</span>
                </div>
              </div>
              <div className="pc-choices">
                <button
                  className={"pc-choice" + (pendingPay === "cash" ? " active" : "")}
                  onClick={() => setPendingPay("cash")}
                >
                  <div className="pc-icon">&#x1F4B5;</div>
                  <div className="pc-label">Cash</div>
                </button>
                <button
                  className={"pc-choice" + (pendingPay === "transfer" ? " active" : "")}
                  onClick={() => setPendingPay("transfer")}
                >
                  <div className="pc-icon">&#x1F4B1;</div>
                  <div className="pc-label">Transfer</div>
                </button>
              </div>
              <div className="pc-actions">
                <button className="pc-cancel" onClick={() => payDialogRef.current?.close()}>Cancel</button>
                <button className="pc-confirm" onClick={() => confirmRecord(pendingPay)}>Confirm &amp; Record</button>
              </div>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={bottleDialogRef} className="bottle-dialog">
        <div className="receipt">
          <div className="bd-body">
            <h2>Start New Bottle</h2>
            <div className="bd-field">
              <label htmlFor="bottle-name">Bottle Name</label>
              <input
                id="bottle-name"
                type="text"
                placeholder={`Bottle #${bottles.length + 1}`}
                value={newBottleName}
                onChange={(e) => setNewBottleName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="bd-field">
              <label htmlFor="bottle-cap">Capacity (kg)</label>
              <input
                id="bottle-cap"
                type="text"
                inputMode="decimal"
                placeholder="55"
                value={bottleCapacity}
                onChange={(e) => setBottleCapacity(e.target.value)}
              />
            </div>
          </div>
          <div className="bd-actions">
            <button className="bd-cancel" onClick={() => bottleDialogRef.current?.close()}>Cancel</button>
            <button className="bd-confirm" onClick={createBottle}>Start Bottle</button>
          </div>
        </div>
      </dialog>

      <div className={"toast" + (toast ? " show" : "")}>
        <CheckCircle size={15} />
        <span>{toast}</span>
      </div>
    </div>
  );
}
