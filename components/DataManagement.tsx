// components/DataManagement.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { exportBackupData, importBackupData, clearAllData } from "@/lib/storage";
import { Database, Download, Upload, Trash2, Check, AlertTriangle, X } from "lucide-react";

interface Props {
  onClose: () => void;
  onDataChanged: () => void;
}

export default function DataManagement({ onClose, onDataChanged }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function flash(msg: string) {
    setStatus(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setStatus(null), 3000);
  }

  /* ── Export JSON Backup ── */
  function handleExport() {
    try {
      const data = exportBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `gasrefill-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash("Backup downloaded");
    } catch (err) {
      flash("Export failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  /* ── Import JSON Backup ── */
  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const result = importBackupData(data);
        flash(`Imported: ${result.transactions} txns, ${result.bottles} bottles, ${result.expenses} expenses`);
        onDataChanged();
      } catch (err) {
        flash("Import failed: " + (err instanceof Error ? err.message : "Invalid file"));
      }
    };
    reader.readAsText(file);
    // Reset file input so re-selecting the same file triggers change
    e.target.value = "";
  }

  /* ── Export CSV ── */
  function handleExportCSV() {
    try {
      const data = exportBackupData();
      if (!data.transactions.length) {
        flash("No transactions to export");
        return;
      }
      const headers = [
        "Date", "Time", "Mode", "GSP", "CSR",
        "Input", "FilledKg", "FinalKg", "Cost",
        "Payment", "BottleId",
      ].join(",");
      const rows = data.transactions.map((t) =>
        [
          new Date(t.ts).toISOString().split("T")[0],
          new Date(t.ts).toTimeString().split(" ")[0],
          t.mode === "A" ? "Price" : "Kg",
          t.gsp.toString(),
          t.csr.toString(),
          t.input.toString(),
          t.filledKg.toString(),
          t.finalKg.toString(),
          (t.cost ?? 0).toString(),
          t.paymentMethod,
          t.bottleId,
        ].join(",")
      );
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `gasrefill-transactions-${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      flash("CSV exported");
    } catch (err) {
      flash("CSV export failed");
    }
  }

  /* ── Clear All Data ── */
  function handleClearAll() {
    if (!showConfirmClear) {
      setShowConfirmClear(true);
      return;
    }
    clearAllData();
    setShowConfirmClear(false);
    flash("All data cleared");
    onDataChanged();
    setTimeout(() => {
      ref.current?.close();
      onClose();
    }, 500);
  }

  function handleClose() {
    ref.current?.close();
    onClose();
  }

  return (
    <dialog ref={ref} className="data-dialog" onClose={handleClose}>
      <div className="data-body">
        <div className="data-header">
          <Database size={16} />
          <h2>Data Management</h2>
          <button className="data-close" onClick={handleClose}>
            <X size={14} />
          </button>
        </div>

        <div className="data-actions">
          <button className="data-btn" onClick={handleExport}>
            <Download size={15} /> Export Backup (JSON)
          </button>

          <button className="data-btn" onClick={handleImportClick}>
            <Upload size={15} /> Import Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />

          <button className="data-btn" onClick={handleExportCSV}>
            <Download size={15} /> Export CSV
          </button>

          <div className="data-divider" />

          {!showConfirmClear ? (
            <button className="data-btn data-btn-danger" onClick={handleClearAll}>
              <Trash2 size={15} /> Clear All Data
            </button>
          ) : (
            <div className="data-confirm-clear">
              <AlertTriangle size={16} />
              <span>This will erase ALL data. Are you sure?</span>
              <button className="data-btn data-btn-danger" onClick={handleClearAll}>
                Yes, Clear Everything
              </button>
              <button className="data-btn" onClick={() => setShowConfirmClear(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {status && (
          <div className="data-toast">
            <Check size={14} /> {status}
          </div>
        )}
      </div>
    </dialog>
  );
}
